package compute

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/cloudplatform/backend/internal/config"
	"github.com/cloudplatform/backend/internal/database"
	"github.com/cloudplatform/backend/pkg/errors"
	"gorm.io/gorm"
)

// Service handles compute operations
type Service struct {
	db      *gorm.DB
	proxmox *ProxmoxClient
}

// NewService creates a new compute service
func NewService(db *gorm.DB, cfg *config.ProxmoxConfig) *Service {
	return &Service{
		db:      db,
		proxmox: NewProxmoxClient(cfg),
	}
}

// VMResponse represents a VM in API responses
type VMResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Status      string    `json:"status"`
	VCPUs       int       `json:"vcpus"`
	Memory      int       `json:"memory"`
	DiskSize    int       `json:"diskSize"`
	OS          string    `json:"os"`
	PublicIP    string    `json:"publicIp,omitempty"`
	PrivateIP   string    `json:"privateIp,omitempty"`
	ProjectID   string    `json:"projectId"`
	Tags        []string  `json:"tags"`
	CreatedAt   time.Time `json:"createdAt"`
}

// CreateVMRequest represents a VM creation request
type CreateVMRequest struct {
	Name      string   `json:"name" validate:"required"`
	ProjectID string   `json:"projectId" validate:"required"`
	VCPUs     int      `json:"vcpus" validate:"required,min=1"`
	Memory    int      `json:"memory" validate:"required,min=512"`
	DiskSize  int      `json:"diskSize" validate:"required,min=10"`
	OS        string   `json:"os" validate:"required"`
	Template  string   `json:"template,omitempty"`
	SubnetID  string   `json:"subnetId,omitempty"`
	Tags      []string `json:"tags,omitempty"`
}

// ListVMs returns VMs for a project
func (s *Service) ListVMs(ctx context.Context, projectID string, page, perPage int) ([]VMResponse, int64, error) {
	var vms []database.VM
	var total int64

	query := s.db.WithContext(ctx).
		Where("project_id = ? AND deleted_at IS NULL", projectID)

	query.Model(&database.VM{}).Count(&total)

	offset := (page - 1) * perPage
	if err := query.Offset(offset).Limit(perPage).Order("created_at DESC").Find(&vms).Error; err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	result := make([]VMResponse, len(vms))
	for i, vm := range vms {
		result[i] = toVMResponse(vm)
	}

	return result, total, nil
}

// GetVM returns a specific VM
func (s *Service) GetVM(ctx context.Context, vmID string) (*VMResponse, error) {
	var vm database.VM
	if err := s.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", vmID).
		First(&vm).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NotFound("VM")
		}
		return nil, errors.DatabaseError(err)
	}

	result := toVMResponse(vm)
	return &result, nil
}

// CreateVM creates a new VM
func (s *Service) CreateVM(ctx context.Context, orgID string, req CreateVMRequest) (*VMResponse, error) {
	// Verify project belongs to organization
	var project database.Project
	if err := s.db.WithContext(ctx).
		Where("id = ? AND organization_id = ?", req.ProjectID, orgID).
		First(&project).Error; err != nil {
		return nil, errors.NotFound("project")
	}

	// Check quota
	var vmCount int64
	s.db.Model(&database.VM{}).
		Where("project_id = ? AND deleted_at IS NULL", req.ProjectID).
		Count(&vmCount)

	// TODO: Check actual quota from billing plan

	// Create VM record
	vm := database.VM{
		Name:      req.Name,
		ProjectID: req.ProjectID,
		Status:    "creating",
		VCPUs:     req.VCPUs,
		Memory:    req.Memory,
		DiskSize:  req.DiskSize,
		OS:        req.OS,
		Template:  req.Template,
		SubnetID:  req.SubnetID,
		Tags:      req.Tags,
	}

	if err := s.db.Create(&vm).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	// TODO: Queue VM provisioning job
	// For now, simulate async creation
	go s.provisionVM(context.Background(), vm.ID)

	result := toVMResponse(vm)
	return &result, nil
}

// provisionVM handles async VM provisioning
func (s *Service) provisionVM(ctx context.Context, vmID string) {
	// Simulate provisioning delay
	time.Sleep(5 * time.Second)

	// Update VM status
	s.db.Model(&database.VM{}).
		Where("id = ?", vmID).
		Updates(map[string]interface{}{
			"status":     "running",
			"private_ip": fmt.Sprintf("10.0.1.%d", 100+time.Now().Unix()%100),
		})
}

// UpdateVMRequest represents a VM update request
type UpdateVMRequest struct {
	Name   string   `json:"name,omitempty"`
	VCPUs  int      `json:"vcpus,omitempty"`
	Memory int      `json:"memory,omitempty"`
	Tags   []string `json:"tags,omitempty"`
}

// UpdateVM updates a VM
func (s *Service) UpdateVM(ctx context.Context, vmID string, req UpdateVMRequest) (*VMResponse, error) {
	var vm database.VM
	if err := s.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", vmID).
		First(&vm).Error; err != nil {
		return nil, errors.NotFound("VM")
	}

	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.VCPUs > 0 {
		updates["vcpus"] = req.VCPUs
	}
	if req.Memory > 0 {
		updates["memory"] = req.Memory
	}
	if req.Tags != nil {
		updates["tags"] = req.Tags
	}

	if len(updates) > 0 {
		if err := s.db.Model(&vm).Updates(updates).Error; err != nil {
			return nil, errors.DatabaseError(err)
		}
	}

	result := toVMResponse(vm)
	return &result, nil
}

// DeleteVM deletes a VM
func (s *Service) DeleteVM(ctx context.Context, vmID string) error {
	result := s.db.WithContext(ctx).
		Model(&database.VM{}).
		Where("id = ? AND deleted_at IS NULL", vmID).
		Updates(map[string]interface{}{
			"status":     "deleting",
			"deleted_at": sql.NullTime{Time: time.Now(), Valid: true},
		})

	if result.RowsAffected == 0 {
		return errors.NotFound("VM")
	}

	// TODO: Queue VM deletion job

	return nil
}

// VMAction represents a VM action
type VMAction string

const (
	ActionStart    VMAction = "start"
	ActionStop     VMAction = "stop"
	ActionReboot   VMAction = "reboot"
	ActionShutdown VMAction = "shutdown"
)

// PerformVMAction performs an action on a VM
func (s *Service) PerformVMAction(ctx context.Context, vmID string, action VMAction) error {
	var vm database.VM
	if err := s.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", vmID).
		First(&vm).Error; err != nil {
		return errors.NotFound("VM")
	}

	var newStatus string
	switch action {
	case ActionStart:
		if vm.Status != "stopped" {
			return errors.BadRequest("VM is not stopped")
		}
		newStatus = "starting"
	case ActionStop:
		if vm.Status != "running" {
			return errors.BadRequest("VM is not running")
		}
		newStatus = "stopping"
	case ActionReboot:
		if vm.Status != "running" {
			return errors.BadRequest("VM is not running")
		}
		newStatus = "rebooting"
	case ActionShutdown:
		if vm.Status != "running" {
			return errors.BadRequest("VM is not running")
		}
		newStatus = "stopping"
	default:
		return errors.BadRequest("invalid action")
	}

	// Update status
	s.db.Model(&vm).Update("status", newStatus)

	// TODO: Queue action job
	// Simulate action completion
	go func() {
		time.Sleep(3 * time.Second)
		finalStatus := "running"
		if action == ActionStop || action == ActionShutdown {
			finalStatus = "stopped"
		}
		s.db.Model(&database.VM{}).Where("id = ?", vmID).Update("status", finalStatus)
	}()

	return nil
}

// ListTemplates returns available VM templates
func (s *Service) ListTemplates(ctx context.Context) ([]database.VMTemplate, error) {
	var templates []database.VMTemplate
	if err := s.db.WithContext(ctx).
		Where("status = ? AND is_public = ?", "active", true).
		Find(&templates).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}
	return templates, nil
}

// CreateSnapshot creates a VM snapshot
func (s *Service) CreateSnapshot(ctx context.Context, vmID, name, description string) (*database.Snapshot, error) {
	var vm database.VM
	if err := s.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", vmID).
		First(&vm).Error; err != nil {
		return nil, errors.NotFound("VM")
	}

	snapshot := database.Snapshot{
		Name:        name,
		Description: description,
		VMID:        vmID,
		Status:      "creating",
	}

	if err := s.db.Create(&snapshot).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	// TODO: Queue snapshot creation
	go func() {
		time.Sleep(5 * time.Second)
		s.db.Model(&snapshot).Updates(map[string]interface{}{
			"status": "available",
			"size":   int64(vm.DiskSize) * 1024 * 1024 * 1024,
		})
	}()

	return &snapshot, nil
}

// ListSnapshots returns snapshots for a VM
func (s *Service) ListSnapshots(ctx context.Context, vmID string) ([]database.Snapshot, error) {
	var snapshots []database.Snapshot
	if err := s.db.WithContext(ctx).
		Where("vm_id = ?", vmID).
		Order("created_at DESC").
		Find(&snapshots).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}
	return snapshots, nil
}

// DeleteSnapshot deletes a snapshot
func (s *Service) DeleteSnapshot(ctx context.Context, snapshotID string) error {
	result := s.db.WithContext(ctx).
		Where("id = ?", snapshotID).
		Delete(&database.Snapshot{})

	if result.RowsAffected == 0 {
		return errors.NotFound("snapshot")
	}

	return nil
}

func toVMResponse(vm database.VM) VMResponse {
	return VMResponse{
		ID:        vm.ID,
		Name:      vm.Name,
		Status:    vm.Status,
		VCPUs:     vm.VCPUs,
		Memory:    vm.Memory,
		DiskSize:  vm.DiskSize,
		OS:        vm.OS,
		PublicIP:  vm.PublicIP,
		PrivateIP: vm.PrivateIP,
		ProjectID: vm.ProjectID,
		Tags:      vm.Tags,
		CreatedAt: vm.CreatedAt,
	}
}
