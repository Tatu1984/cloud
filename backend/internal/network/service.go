package network

import (
	"context"
	"database/sql"
	"log/slog"
	"net"
	"os"
	"strings"
	"time"

	"github.com/cloudplatform/backend/internal/config"
	"github.com/cloudplatform/backend/internal/database"
	"github.com/cloudplatform/backend/pkg/errors"
	"gorm.io/gorm"
)

// Service handles network operations
type Service struct {
	db       *gorm.DB
	zerotier *ZeroTierClient
	cfg      *config.ZeroTierConfig
	log      *slog.Logger
}

// NewService creates a new network service
func NewService(db *gorm.DB, cfg *config.ZeroTierConfig) *Service {
	return &Service{
		db:       db,
		zerotier: NewZeroTierClient(cfg),
		cfg:      cfg,
		log:      slog.New(slog.NewJSONHandler(os.Stdout, nil)),
	}
}

// VPCResponse represents a VPC in API responses
type VPCResponse struct {
	ID               string           `json:"id"`
	Name             string           `json:"name"`
	CIDR             string           `json:"cidr"`
	Status           string           `json:"status"`
	ProjectID        string           `json:"projectId"`
	ZeroTierNetworkID string          `json:"zerotierNetworkId,omitempty"`
	Subnets          []SubnetResponse `json:"subnets,omitempty"`
	CreatedAt        time.Time        `json:"createdAt"`
}

// SubnetResponse represents a subnet in API responses
type SubnetResponse struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	CIDR         string `json:"cidr"`
	Zone         string `json:"zone,omitempty"`
	IsPublic     bool   `json:"isPublic"`
	GatewayIP    string `json:"gatewayIp,omitempty"`
	AvailableIPs int    `json:"availableIps"`
}

// CreateVPCRequest represents a VPC creation request
type CreateVPCRequest struct {
	Name      string `json:"name" validate:"required"`
	ProjectID string `json:"projectId" validate:"required"`
	CIDR      string `json:"cidr" validate:"required"`
}

// ListVPCs returns VPCs for a project
func (s *Service) ListVPCs(ctx context.Context, projectID string) ([]VPCResponse, error) {
	var vpcs []database.VPC
	if err := s.db.WithContext(ctx).
		Preload("Subnets").
		Where("project_id = ? AND deleted_at IS NULL", projectID).
		Find(&vpcs).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	result := make([]VPCResponse, len(vpcs))
	for i, vpc := range vpcs {
		result[i] = toVPCResponse(vpc)
	}

	return result, nil
}

// GetVPC returns a specific VPC
func (s *Service) GetVPC(ctx context.Context, vpcID string) (*VPCResponse, error) {
	var vpc database.VPC
	if err := s.db.WithContext(ctx).
		Preload("Subnets").
		Where("id = ? AND deleted_at IS NULL", vpcID).
		First(&vpc).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NotFound("VPC")
		}
		return nil, errors.DatabaseError(err)
	}

	result := toVPCResponse(vpc)
	return &result, nil
}

// CreateVPC creates a new VPC with optional ZeroTier integration
func (s *Service) CreateVPC(ctx context.Context, orgID string, req CreateVPCRequest) (*VPCResponse, error) {
	// Verify project belongs to organization
	var project database.Project
	if err := s.db.WithContext(ctx).
		Where("id = ? AND organization_id = ?", req.ProjectID, orgID).
		First(&project).Error; err != nil {
		return nil, errors.NotFound("project")
	}

	// Validate CIDR
	_, ipNet, err := net.ParseCIDR(req.CIDR)
	if err != nil {
		return nil, errors.BadRequest("invalid CIDR format")
	}

	vpc := database.VPC{
		Name:      req.Name,
		ProjectID: req.ProjectID,
		CIDR:      req.CIDR,
		Status:    "creating",
	}

	if err := s.db.Create(&vpc).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	s.log.Info("VPC created in database",
		"vpc_id", vpc.ID,
		"name", vpc.Name,
		"cidr", vpc.CIDR,
	)

	// Create ZeroTier network if configured
	var ztNetworkID string
	if s.isZeroTierConfigured() {
		ztNetwork, err := s.createZeroTierNetwork(ctx, vpc.Name, req.CIDR)
		if err != nil {
			s.log.Error("failed to create ZeroTier network", "error", err)
			// Continue without ZeroTier - VPC is still usable for internal networking
		} else {
			ztNetworkID = ztNetwork.ID
			s.log.Info("ZeroTier network created", "network_id", ztNetworkID)
		}
	} else {
		s.log.Warn("ZeroTier not configured, VPC created without overlay network")
	}

	// Update VPC with ZeroTier network ID
	vpc.ZeroTierNetworkID = ztNetworkID
	vpc.Status = "active"
	s.db.Model(&vpc).Updates(map[string]interface{}{
		"zerotier_network_id": ztNetworkID,
		"status":              "active",
	})

	// Create default subnet
	gatewayIP := calculateGatewayIP(ipNet)
	availableIPs := calculateAvailableIPs(ipNet)

	defaultSubnet := database.Subnet{
		Name:         "default",
		VPCID:        vpc.ID,
		CIDR:         req.CIDR,
		IsPublic:     false,
		GatewayIP:    gatewayIP,
		AvailableIPs: availableIPs,
	}
	s.db.Create(&defaultSubnet)

	// Reload with subnets
	s.db.Preload("Subnets").First(&vpc)

	result := toVPCResponse(vpc)
	return &result, nil
}

// isZeroTierConfigured checks if ZeroTier API is configured
func (s *Service) isZeroTierConfigured() bool {
	return s.cfg.APIToken != "" && s.cfg.ControllerURL != "" && s.cfg.ControllerURL != "http://localhost:9993"
}

// createZeroTierNetwork creates a ZeroTier network for the VPC
func (s *Service) createZeroTierNetwork(ctx context.Context, name, cidr string) (*ZTNetwork, error) {
	// Parse CIDR to get IP range for auto-assign pool
	ip, ipNet, err := net.ParseCIDR(cidr)
	if err != nil {
		return nil, err
	}

	// Calculate IP pool (skip network and broadcast addresses)
	startIP := incrementIP(ip.Mask(ipNet.Mask))
	endIP := calculateBroadcast(ipNet)
	endIP = decrementIP(endIP) // Exclude broadcast

	config := ZTNetworkConfig{
		Name:    name,
		Private: true,
		Routes: []ZTRoute{
			{Target: cidr},
		},
		IPAssignmentPools: []ZTIPPool{
			{
				IPRangeStart: startIP.String(),
				IPRangeEnd:   endIP.String(),
			},
		},
		V4AssignMode: ZTAssignMode{ZT: true},
		V6AssignMode: ZTAssignMode{ZT: false},
		MTU:          2800,
		MulticastLimit: 32,
		EnableBroadcast: true,
	}

	return s.zerotier.CreateNetwork(ctx, config)
}

// DeleteVPC deletes a VPC and its ZeroTier network
func (s *Service) DeleteVPC(ctx context.Context, vpcID string) error {
	var vpc database.VPC
	if err := s.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", vpcID).
		First(&vpc).Error; err != nil {
		return errors.NotFound("VPC")
	}

	// Delete ZeroTier network if exists
	if vpc.ZeroTierNetworkID != "" && s.isZeroTierConfigured() {
		if err := s.zerotier.DeleteNetwork(ctx, vpc.ZeroTierNetworkID); err != nil {
			s.log.Error("failed to delete ZeroTier network", "network_id", vpc.ZeroTierNetworkID, "error", err)
			// Continue with VPC deletion even if ZeroTier fails
		} else {
			s.log.Info("ZeroTier network deleted", "network_id", vpc.ZeroTierNetworkID)
		}
	}

	// Soft delete VPC
	result := s.db.Model(&database.VPC{}).
		Where("id = ?", vpcID).
		Update("deleted_at", sql.NullTime{Time: time.Now(), Valid: true})

	if result.RowsAffected == 0 {
		return errors.NotFound("VPC")
	}

	s.log.Info("VPC deleted", "vpc_id", vpcID)
	return nil
}

// CreateSubnetRequest represents a subnet creation request
type CreateSubnetRequest struct {
	Name     string `json:"name" validate:"required"`
	VPCID    string `json:"vpcId" validate:"required"`
	CIDR     string `json:"cidr" validate:"required"`
	Zone     string `json:"zone,omitempty"`
	IsPublic bool   `json:"isPublic"`
}

// CreateSubnet creates a new subnet
func (s *Service) CreateSubnet(ctx context.Context, req CreateSubnetRequest) (*SubnetResponse, error) {
	// Verify VPC exists
	var vpc database.VPC
	if err := s.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", req.VPCID).
		First(&vpc).Error; err != nil {
		return nil, errors.NotFound("VPC")
	}

	// Validate CIDR
	_, ipNet, err := net.ParseCIDR(req.CIDR)
	if err != nil {
		return nil, errors.BadRequest("invalid CIDR format")
	}

	// Verify subnet CIDR is within VPC CIDR
	_, vpcNet, _ := net.ParseCIDR(vpc.CIDR)
	if !vpcNet.Contains(ipNet.IP) {
		return nil, errors.BadRequest("subnet CIDR must be within VPC CIDR")
	}

	gatewayIP := calculateGatewayIP(ipNet)
	availableIPs := calculateAvailableIPs(ipNet)

	subnet := database.Subnet{
		Name:         req.Name,
		VPCID:        req.VPCID,
		CIDR:         req.CIDR,
		Zone:         req.Zone,
		IsPublic:     req.IsPublic,
		GatewayIP:    gatewayIP,
		AvailableIPs: availableIPs,
	}

	if err := s.db.Create(&subnet).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	// If VPC has ZeroTier network, add route for this subnet
	if vpc.ZeroTierNetworkID != "" && s.isZeroTierConfigured() {
		s.addZeroTierRoute(ctx, vpc.ZeroTierNetworkID, req.CIDR)
	}

	result := toSubnetResponse(subnet)
	return &result, nil
}

// addZeroTierRoute adds a route to the ZeroTier network
func (s *Service) addZeroTierRoute(ctx context.Context, networkID, cidr string) {
	network, err := s.zerotier.GetNetwork(ctx, networkID)
	if err != nil {
		s.log.Error("failed to get ZeroTier network for route update", "error", err)
		return
	}

	// Add new route to existing routes
	routes := network.NWConfig.Routes
	routes = append(routes, ZTRoute{Target: cidr})
	network.NWConfig.Routes = routes

	_, err = s.zerotier.UpdateNetwork(ctx, networkID, network.NWConfig)
	if err != nil {
		s.log.Error("failed to update ZeroTier network routes", "error", err)
	}
}

// DeleteSubnet deletes a subnet
func (s *Service) DeleteSubnet(ctx context.Context, subnetID string) error {
	result := s.db.WithContext(ctx).
		Where("id = ?", subnetID).
		Delete(&database.Subnet{})

	if result.RowsAffected == 0 {
		return errors.NotFound("subnet")
	}

	return nil
}

// SecurityGroupResponse represents a security group in API responses
type SecurityGroupResponse struct {
	ID          string                      `json:"id"`
	Name        string                      `json:"name"`
	Description string                      `json:"description,omitempty"`
	VPCID       string                      `json:"vpcId"`
	IsDefault   bool                        `json:"isDefault"`
	Rules       []SecurityGroupRuleResponse `json:"rules,omitempty"`
	CreatedAt   time.Time                   `json:"createdAt"`
}

// SecurityGroupRuleResponse represents a rule in API responses
type SecurityGroupRuleResponse struct {
	ID          string `json:"id"`
	Direction   string `json:"direction"`
	Protocol    string `json:"protocol"`
	PortFrom    int    `json:"portFrom"`
	PortTo      int    `json:"portTo"`
	Source      string `json:"source"`
	Description string `json:"description,omitempty"`
}

// ListSecurityGroups returns security groups for a VPC
func (s *Service) ListSecurityGroups(ctx context.Context, vpcID string) ([]SecurityGroupResponse, error) {
	var sgs []database.SecurityGroup
	if err := s.db.WithContext(ctx).
		Preload("Rules").
		Where("vpc_id = ?", vpcID).
		Find(&sgs).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	result := make([]SecurityGroupResponse, len(sgs))
	for i, sg := range sgs {
		result[i] = toSecurityGroupResponse(sg)
	}

	return result, nil
}

// CreateSecurityGroupRequest represents a security group creation request
type CreateSecurityGroupRequest struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description,omitempty"`
	VPCID       string `json:"vpcId" validate:"required"`
}

// CreateSecurityGroup creates a new security group
func (s *Service) CreateSecurityGroup(ctx context.Context, req CreateSecurityGroupRequest) (*SecurityGroupResponse, error) {
	sg := database.SecurityGroup{
		Name:        req.Name,
		Description: req.Description,
		VPCID:       req.VPCID,
		IsDefault:   false,
	}

	if err := s.db.Create(&sg).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	result := toSecurityGroupResponse(sg)
	return &result, nil
}

// CreateSecurityGroupRuleRequest represents a rule creation request
type CreateSecurityGroupRuleRequest struct {
	SecurityGroupID string `json:"securityGroupId" validate:"required"`
	Direction       string `json:"direction" validate:"required"`
	Protocol        string `json:"protocol" validate:"required"`
	PortFrom        int    `json:"portFrom"`
	PortTo          int    `json:"portTo"`
	Source          string `json:"source" validate:"required"`
	Description     string `json:"description,omitempty"`
}

// CreateSecurityGroupRule creates a new rule
func (s *Service) CreateSecurityGroupRule(ctx context.Context, req CreateSecurityGroupRuleRequest) (*SecurityGroupRuleResponse, error) {
	rule := database.SecurityGroupRule{
		SecurityGroupID: req.SecurityGroupID,
		Direction:       req.Direction,
		Protocol:        req.Protocol,
		PortFrom:        req.PortFrom,
		PortTo:          req.PortTo,
		Source:          req.Source,
		Description:     req.Description,
	}

	if err := s.db.Create(&rule).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	result := toSecurityGroupRuleResponse(rule)
	return &result, nil
}

// DeleteSecurityGroupRule deletes a rule
func (s *Service) DeleteSecurityGroupRule(ctx context.Context, ruleID string) error {
	result := s.db.WithContext(ctx).
		Where("id = ?", ruleID).
		Delete(&database.SecurityGroupRule{})

	if result.RowsAffected == 0 {
		return errors.NotFound("rule")
	}

	return nil
}

// Helper functions

func toVPCResponse(vpc database.VPC) VPCResponse {
	subnets := make([]SubnetResponse, len(vpc.Subnets))
	for i, subnet := range vpc.Subnets {
		subnets[i] = toSubnetResponse(subnet)
	}

	return VPCResponse{
		ID:                vpc.ID,
		Name:              vpc.Name,
		CIDR:              vpc.CIDR,
		Status:            vpc.Status,
		ProjectID:         vpc.ProjectID,
		ZeroTierNetworkID: vpc.ZeroTierNetworkID,
		Subnets:           subnets,
		CreatedAt:         vpc.CreatedAt,
	}
}

func toSubnetResponse(subnet database.Subnet) SubnetResponse {
	return SubnetResponse{
		ID:           subnet.ID,
		Name:         subnet.Name,
		CIDR:         subnet.CIDR,
		Zone:         subnet.Zone,
		IsPublic:     subnet.IsPublic,
		GatewayIP:    subnet.GatewayIP,
		AvailableIPs: subnet.AvailableIPs,
	}
}

func toSecurityGroupResponse(sg database.SecurityGroup) SecurityGroupResponse {
	rules := make([]SecurityGroupRuleResponse, len(sg.Rules))
	for i, rule := range sg.Rules {
		rules[i] = toSecurityGroupRuleResponse(rule)
	}

	return SecurityGroupResponse{
		ID:          sg.ID,
		Name:        sg.Name,
		Description: sg.Description,
		VPCID:       sg.VPCID,
		IsDefault:   sg.IsDefault,
		Rules:       rules,
		CreatedAt:   sg.CreatedAt,
	}
}

func toSecurityGroupRuleResponse(rule database.SecurityGroupRule) SecurityGroupRuleResponse {
	return SecurityGroupRuleResponse{
		ID:          rule.ID,
		Direction:   rule.Direction,
		Protocol:    rule.Protocol,
		PortFrom:    rule.PortFrom,
		PortTo:      rule.PortTo,
		Source:      rule.Source,
		Description: rule.Description,
	}
}

// IP utility functions

func calculateGatewayIP(ipNet *net.IPNet) string {
	ip := ipNet.IP.To4()
	if ip == nil {
		return ""
	}
	// Gateway is typically .1 of the network
	gateway := make(net.IP, len(ip))
	copy(gateway, ip)
	gateway[3] = 1
	return gateway.String()
}

func calculateAvailableIPs(ipNet *net.IPNet) int {
	ones, bits := ipNet.Mask.Size()
	// 2^(bits-ones) - 2 (network and broadcast addresses)
	total := 1 << (bits - ones)
	if total <= 2 {
		return 0
	}
	return total - 2
}

func incrementIP(ip net.IP) net.IP {
	result := make(net.IP, len(ip))
	copy(result, ip)
	for i := len(result) - 1; i >= 0; i-- {
		result[i]++
		if result[i] != 0 {
			break
		}
	}
	return result
}

func decrementIP(ip net.IP) net.IP {
	result := make(net.IP, len(ip))
	copy(result, ip)
	for i := len(result) - 1; i >= 0; i-- {
		result[i]--
		if result[i] != 255 {
			break
		}
	}
	return result
}

func calculateBroadcast(ipNet *net.IPNet) net.IP {
	ip := ipNet.IP.To4()
	if ip == nil {
		return nil
	}
	mask := ipNet.Mask
	broadcast := make(net.IP, 4)
	for i := 0; i < 4; i++ {
		broadcast[i] = ip[i] | ^mask[i]
	}
	return broadcast
}

// parseIPRange extracts start and end IPs from CIDR
func parseIPRange(cidr string) (string, string) {
	parts := strings.Split(cidr, "/")
	if len(parts) != 2 {
		return "", ""
	}
	_, ipNet, err := net.ParseCIDR(cidr)
	if err != nil {
		return "", ""
	}

	start := incrementIP(ipNet.IP)
	end := decrementIP(calculateBroadcast(ipNet))

	return start.String(), end.String()
}
