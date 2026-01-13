package network

import (
	"context"
	"database/sql"
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
}

// NewService creates a new network service
func NewService(db *gorm.DB, cfg *config.ZeroTierConfig) *Service {
	return &Service{
		db:       db,
		zerotier: NewZeroTierClient(cfg),
	}
}

// VPCResponse represents a VPC in API responses
type VPCResponse struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	CIDR      string          `json:"cidr"`
	Status    string          `json:"status"`
	ProjectID string          `json:"projectId"`
	Subnets   []SubnetResponse `json:"subnets,omitempty"`
	CreatedAt time.Time       `json:"createdAt"`
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

// CreateVPC creates a new VPC
func (s *Service) CreateVPC(ctx context.Context, orgID string, req CreateVPCRequest) (*VPCResponse, error) {
	// Verify project belongs to organization
	var project database.Project
	if err := s.db.WithContext(ctx).
		Where("id = ? AND organization_id = ?", req.ProjectID, orgID).
		First(&project).Error; err != nil {
		return nil, errors.NotFound("project")
	}

	vpc := database.VPC{
		Name:      req.Name,
		ProjectID: req.ProjectID,
		CIDR:      req.CIDR,
		Status:    "active",
	}

	if err := s.db.Create(&vpc).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	// Create default subnet
	defaultSubnet := database.Subnet{
		Name:         "default",
		VPCID:        vpc.ID,
		CIDR:         req.CIDR,
		IsPublic:     false,
		AvailableIPs: 250,
	}
	s.db.Create(&defaultSubnet)

	// Reload with subnets
	s.db.Preload("Subnets").First(&vpc)

	result := toVPCResponse(vpc)
	return &result, nil
}

// DeleteVPC deletes a VPC
func (s *Service) DeleteVPC(ctx context.Context, vpcID string) error {
	result := s.db.WithContext(ctx).
		Model(&database.VPC{}).
		Where("id = ? AND deleted_at IS NULL", vpcID).
		Update("deleted_at", sql.NullTime{Time: time.Now(), Valid: true})

	if result.RowsAffected == 0 {
		return errors.NotFound("VPC")
	}

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

	subnet := database.Subnet{
		Name:         req.Name,
		VPCID:        req.VPCID,
		CIDR:         req.CIDR,
		Zone:         req.Zone,
		IsPublic:     req.IsPublic,
		AvailableIPs: 250, // Calculate from CIDR
	}

	if err := s.db.Create(&subnet).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	result := toSubnetResponse(subnet)
	return &result, nil
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
	ID          string                     `json:"id"`
	Name        string                     `json:"name"`
	Description string                     `json:"description,omitempty"`
	VPCID       string                     `json:"vpcId"`
	IsDefault   bool                       `json:"isDefault"`
	Rules       []SecurityGroupRuleResponse `json:"rules,omitempty"`
	CreatedAt   time.Time                  `json:"createdAt"`
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

func toVPCResponse(vpc database.VPC) VPCResponse {
	subnets := make([]SubnetResponse, len(vpc.Subnets))
	for i, subnet := range vpc.Subnets {
		subnets[i] = toSubnetResponse(subnet)
	}

	return VPCResponse{
		ID:        vpc.ID,
		Name:      vpc.Name,
		CIDR:      vpc.CIDR,
		Status:    vpc.Status,
		ProjectID: vpc.ProjectID,
		Subnets:   subnets,
		CreatedAt: vpc.CreatedAt,
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
