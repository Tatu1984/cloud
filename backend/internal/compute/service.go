package compute

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"sync"
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
	cfg     *config.ProxmoxConfig
	log     *slog.Logger

	// Job queue for async operations
	jobQueue chan Job
	wg       sync.WaitGroup
}

// Job represents an async operation
type Job struct {
	Type      string
	VMID      string
	Action    string
	Ctx       context.Context
}

// NewService creates a new compute service
func NewService(db *gorm.DB, cfg *config.ProxmoxConfig) *Service {
	s := &Service{
		db:       db,
		proxmox:  NewProxmoxClient(cfg),
		cfg:      cfg,
		log:      slog.New(slog.NewJSONHandler(os.Stdout, nil)),
		jobQueue: make(chan Job, 100),
	}

	// Start background job processor
	s.wg.Add(1)
	go s.processJobs()

	return s
}

// processJobs handles async operations
func (s *Service) processJobs() {
	defer s.wg.Done()

	for job := range s.jobQueue {
		switch job.Type {
		case "provision":
			s.executeProvisionVM(job.Ctx, job.VMID)
		case "action":
			s.executeVMAction(job.Ctx, job.VMID, VMAction(job.Action))
		case "delete":
			s.executeDeleteVM(job.Ctx, job.VMID)
		case "snapshot":
			s.executeCreateSnapshot(job.Ctx, job.VMID, job.Action) // Action contains snapshot name
		}
	}
}

// Close gracefully shuts down the service
func (s *Service) Close() {
	close(s.jobQueue)
	s.wg.Wait()
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
	ProxmoxVMID int       `json:"proxmoxVmId,omitempty"`
	Tags        []string  `json:"tags"`
	CreatedAt   time.Time `json:"createdAt"`
}

// CreateVMRequest represents a VM creation request
type CreateVMRequest struct {
	Name       string   `json:"name" validate:"required"`
	ProjectID  string   `json:"projectId" validate:"required"`
	VCPUs      int      `json:"vcpus" validate:"required,min=1"`
	Memory     int      `json:"memory" validate:"required,min=512"`
	DiskSize   int      `json:"diskSize" validate:"required,min=10"`
	OS         string   `json:"os" validate:"required"`
	Template   string   `json:"template,omitempty"`
	SubnetID   string   `json:"subnetId,omitempty"`
	Tags       []string `json:"tags,omitempty"`
	NodeName   string   `json:"nodeName,omitempty"` // Optional: specific Proxmox node
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

// CreateVM creates a new VM with quota enforcement and Proxmox provisioning
func (s *Service) CreateVM(ctx context.Context, orgID string, req CreateVMRequest) (*VMResponse, error) {
	// Verify project belongs to organization
	var project database.Project
	if err := s.db.WithContext(ctx).
		Where("id = ? AND organization_id = ?", req.ProjectID, orgID).
		First(&project).Error; err != nil {
		return nil, errors.NotFound("project")
	}

	// Check quota enforcement
	if err := s.checkQuota(ctx, orgID, req.VCPUs, req.Memory, req.DiskSize); err != nil {
		return nil, err
	}

	// Create VM record with "creating" status
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

	s.log.Info("VM created in database, queuing provisioning",
		"vm_id", vm.ID,
		"name", vm.Name,
		"vcpus", vm.VCPUs,
		"memory", vm.Memory,
	)

	// Queue async provisioning
	s.jobQueue <- Job{
		Type: "provision",
		VMID: vm.ID,
		Ctx:  context.Background(),
	}

	result := toVMResponse(vm)
	return &result, nil
}

// checkQuota verifies the organization has sufficient quota
func (s *Service) checkQuota(ctx context.Context, orgID string, vcpus, memory, disk int) error {
	// Get organization's billing plan
	var org database.Organization
	if err := s.db.WithContext(ctx).Where("id = ?", orgID).First(&org).Error; err != nil {
		return errors.NotFound("organization")
	}

	// Get billing plan limits
	var plan database.BillingPlan
	if err := s.db.WithContext(ctx).Where("name = ?", org.Plan).First(&plan).Error; err != nil {
		// Default to starter plan limits
		plan = database.BillingPlan{
			MaxVMs:       5,
			MaxVCPUs:     10,
			MaxMemoryGB:  20,
			MaxStorageGB: 100,
		}
	}

	// Count current usage
	var vmCount, vcpuCount, memoryCount, storageCount int64

	s.db.Model(&database.VM{}).
		Joins("JOIN projects ON projects.id = vms.project_id").
		Where("projects.organization_id = ? AND vms.deleted_at IS NULL", orgID).
		Count(&vmCount)

	s.db.Model(&database.VM{}).
		Joins("JOIN projects ON projects.id = vms.project_id").
		Where("projects.organization_id = ? AND vms.deleted_at IS NULL", orgID).
		Select("COALESCE(SUM(vcpus), 0)").
		Scan(&vcpuCount)

	s.db.Model(&database.VM{}).
		Joins("JOIN projects ON projects.id = vms.project_id").
		Where("projects.organization_id = ? AND vms.deleted_at IS NULL", orgID).
		Select("COALESCE(SUM(memory), 0)").
		Scan(&memoryCount)

	s.db.Model(&database.Volume{}).
		Joins("JOIN projects ON projects.id = volumes.project_id").
		Where("projects.organization_id = ? AND volumes.deleted_at IS NULL", orgID).
		Select("COALESCE(SUM(size), 0)").
		Scan(&storageCount)

	// Check VM count
	if int(vmCount)+1 > plan.MaxVMs {
		return errors.QuotaExceeded("VM", plan.MaxVMs)
	}

	// Check vCPU quota
	if int(vcpuCount)+vcpus > plan.MaxVCPUs {
		return errors.QuotaExceeded("vCPU", plan.MaxVCPUs)
	}

	// Check memory quota (convert MB to GB for comparison)
	memoryGB := memory / 1024
	if int(memoryCount/1024)+memoryGB > plan.MaxMemoryGB {
		return errors.QuotaExceeded("memory", plan.MaxMemoryGB)
	}

	// Check storage quota
	if int(storageCount)+disk > plan.MaxStorageGB {
		return errors.QuotaExceeded("storage", plan.MaxStorageGB)
	}

	return nil
}

// executeProvisionVM handles the actual Proxmox VM creation
func (s *Service) executeProvisionVM(ctx context.Context, vmID string) {
	s.log.Info("starting VM provisioning", "vm_id", vmID)

	// Get VM from database
	var vm database.VM
	if err := s.db.Where("id = ?", vmID).First(&vm).Error; err != nil {
		s.log.Error("failed to get VM for provisioning", "vm_id", vmID, "error", err)
		return
	}

	// Check if Proxmox is configured
	if s.cfg.APIUrl == "" || s.cfg.APIUrl == "https://proxmox.local:8006/api2/json" {
		s.log.Warn("Proxmox not configured, simulating provisioning", "vm_id", vmID)
		s.simulateProvisioning(vmID, vm.Name)
		return
	}

	// Get available nodes from Proxmox
	nodes, err := s.proxmox.GetNodes(ctx)
	if err != nil {
		s.log.Error("failed to get Proxmox nodes", "error", err)
		s.updateVMStatus(vmID, "error", "Failed to connect to Proxmox")
		return
	}

	if len(nodes) == 0 {
		s.log.Error("no Proxmox nodes available")
		s.updateVMStatus(vmID, "error", "No nodes available")
		return
	}

	// Select best node (simple strategy: least CPU usage)
	selectedNode := s.selectNode(nodes)
	s.log.Info("selected Proxmox node", "node", selectedNode.Node, "cpu_usage", selectedNode.CPU)

	// Get next available VMID from Proxmox
	proxmoxVMID, err := s.proxmox.GetNextVMID(ctx)
	if err != nil {
		s.log.Error("failed to get next VMID", "error", err)
		s.updateVMStatus(vmID, "error", "Failed to allocate VMID")
		return
	}

	// Create VM on Proxmox
	opts := VMCreateOptions{
		VMID:    proxmoxVMID,
		Name:    vm.Name,
		Memory:  vm.Memory,
		Cores:   vm.VCPUs,
		Sockets: 1,
		CPU:     "host",
		OSType:  getOSType(vm.OS),
		SCSI0:   fmt.Sprintf("local-lvm:%d", vm.DiskSize),
		SCSIHw:  "virtio-scsi-pci",
		Net0:    "virtio,bridge=vmbr0",
		Start:   true,
	}

	// If template specified, clone instead of create
	if vm.Template != "" {
		s.log.Info("cloning from template", "template", vm.Template, "new_vmid", proxmoxVMID)

		// Find template VMID from database or Proxmox
		var template database.VMTemplate
		if err := s.db.Where("name = ? OR proxmox_template = ?", vm.Template, vm.Template).First(&template).Error; err == nil {
			// Get template VMID from Proxmox (search by name)
			templateVMs, err := s.proxmox.GetVMs(ctx, selectedNode.Node)
			if err == nil {
				for _, tvm := range templateVMs {
					if tvm.Name == template.ProxmoxTemplate {
						taskID, err := s.proxmox.CloneVM(ctx, selectedNode.Node, tvm.VMID, proxmoxVMID, vm.Name)
						if err != nil {
							s.log.Error("failed to clone VM", "error", err)
							s.updateVMStatus(vmID, "error", "Failed to clone template")
							return
						}

						// Wait for clone task
						if err := s.proxmox.WaitForTask(ctx, selectedNode.Node, taskID, 5*time.Minute); err != nil {
							s.log.Error("clone task failed", "error", err)
							s.updateVMStatus(vmID, "error", "Clone task failed")
							return
						}

						// Start the VM
						s.proxmox.StartVM(ctx, selectedNode.Node, proxmoxVMID)
						break
					}
				}
			}
		}
	} else {
		// Create new VM
		_, err = s.proxmox.CreateVM(ctx, selectedNode.Node, opts)
		if err != nil {
			s.log.Error("failed to create VM on Proxmox", "error", err)
			s.updateVMStatus(vmID, "error", fmt.Sprintf("Proxmox error: %v", err))
			return
		}
	}

	// Update VM record with Proxmox details
	privateIP := fmt.Sprintf("10.0.1.%d", 100+(proxmoxVMID%100))

	s.db.Model(&database.VM{}).
		Where("id = ?", vmID).
		Updates(map[string]interface{}{
			"status":            "running",
			"proxmox_vmid":      proxmoxVMID,
			"proxmox_node_id":   selectedNode.Node,
			"private_ip":        privateIP,
		})

	s.log.Info("VM provisioned successfully",
		"vm_id", vmID,
		"proxmox_vmid", proxmoxVMID,
		"node", selectedNode.Node,
	)
}

// selectNode selects the best Proxmox node based on CPU usage
func (s *Service) selectNode(nodes []ProxmoxNode) ProxmoxNode {
	best := nodes[0]
	for _, node := range nodes {
		if node.Status == "online" && node.CPU < best.CPU {
			best = node
		}
	}
	return best
}

// simulateProvisioning simulates VM provisioning when Proxmox is not configured
func (s *Service) simulateProvisioning(vmID, vmName string) {
	s.log.Info("simulating VM provisioning (Proxmox not configured)", "vm_id", vmID)

	// Simulate provisioning delay
	time.Sleep(3 * time.Second)

	// Update VM status
	s.db.Model(&database.VM{}).
		Where("id = ?", vmID).
		Updates(map[string]interface{}{
			"status":     "running",
			"private_ip": fmt.Sprintf("10.0.1.%d", 100+time.Now().Unix()%100),
		})

	s.log.Info("VM provisioning simulated", "vm_id", vmID)
}

// updateVMStatus updates VM status and optionally error message
func (s *Service) updateVMStatus(vmID, status, errorMsg string) {
	updates := map[string]interface{}{"status": status}
	if errorMsg != "" {
		// Store error in metadata
		updates["metadata"] = database.JSON{"error": errorMsg}
	}
	s.db.Model(&database.VM{}).Where("id = ?", vmID).Updates(updates)
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
	var vm database.VM
	if err := s.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", vmID).
		First(&vm).Error; err != nil {
		return errors.NotFound("VM")
	}

	// Update status to deleting
	s.db.Model(&vm).Update("status", "deleting")

	// Queue async deletion
	s.jobQueue <- Job{
		Type: "delete",
		VMID: vmID,
		Ctx:  context.Background(),
	}

	return nil
}

// executeDeleteVM handles actual Proxmox VM deletion
func (s *Service) executeDeleteVM(ctx context.Context, vmID string) {
	s.log.Info("starting VM deletion", "vm_id", vmID)

	var vm database.VM
	if err := s.db.Where("id = ?", vmID).First(&vm).Error; err != nil {
		s.log.Error("failed to get VM for deletion", "vm_id", vmID, "error", err)
		return
	}

	// Delete from Proxmox if configured and VM was provisioned
	if vm.ProxmoxVMID > 0 && s.cfg.APIUrl != "" && s.cfg.APIUrl != "https://proxmox.local:8006/api2/json" {
		nodeName := vm.ProxmoxNodeID
		if nodeName == "" {
			// Try to find the node
			nodes, err := s.proxmox.GetNodes(ctx)
			if err == nil && len(nodes) > 0 {
				nodeName = nodes[0].Node
			}
		}

		if nodeName != "" {
			// Stop VM first
			s.proxmox.StopVM(ctx, nodeName, vm.ProxmoxVMID)
			time.Sleep(2 * time.Second)

			// Delete VM
			_, err := s.proxmox.DeleteVM(ctx, nodeName, vm.ProxmoxVMID)
			if err != nil {
				s.log.Error("failed to delete VM from Proxmox", "error", err)
			}
		}
	}

	// Soft delete in database
	s.db.Model(&database.VM{}).
		Where("id = ?", vmID).
		Updates(map[string]interface{}{
			"status":     "deleted",
			"deleted_at": sql.NullTime{Time: time.Now(), Valid: true},
		})

	s.log.Info("VM deleted successfully", "vm_id", vmID)
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

	// Queue async action
	s.jobQueue <- Job{
		Type:   "action",
		VMID:   vmID,
		Action: string(action),
		Ctx:    context.Background(),
	}

	return nil
}

// executeVMAction handles actual Proxmox VM actions
func (s *Service) executeVMAction(ctx context.Context, vmID string, action VMAction) {
	s.log.Info("executing VM action", "vm_id", vmID, "action", action)

	var vm database.VM
	if err := s.db.Where("id = ?", vmID).First(&vm).Error; err != nil {
		s.log.Error("failed to get VM for action", "vm_id", vmID, "error", err)
		return
	}

	finalStatus := "running"
	if action == ActionStop || action == ActionShutdown {
		finalStatus = "stopped"
	}

	// Execute on Proxmox if configured
	if vm.ProxmoxVMID > 0 && s.cfg.APIUrl != "" && s.cfg.APIUrl != "https://proxmox.local:8006/api2/json" {
		nodeName := vm.ProxmoxNodeID
		if nodeName == "" {
			nodes, err := s.proxmox.GetNodes(ctx)
			if err == nil && len(nodes) > 0 {
				nodeName = nodes[0].Node
			}
		}

		if nodeName != "" {
			var taskID string
			var err error

			switch action {
			case ActionStart:
				taskID, err = s.proxmox.StartVM(ctx, nodeName, vm.ProxmoxVMID)
			case ActionStop:
				taskID, err = s.proxmox.StopVM(ctx, nodeName, vm.ProxmoxVMID)
			case ActionReboot:
				taskID, err = s.proxmox.RebootVM(ctx, nodeName, vm.ProxmoxVMID)
			case ActionShutdown:
				taskID, err = s.proxmox.ShutdownVM(ctx, nodeName, vm.ProxmoxVMID)
			}

			if err != nil {
				s.log.Error("failed to execute VM action on Proxmox", "error", err)
				s.updateVMStatus(vmID, "error", fmt.Sprintf("Action failed: %v", err))
				return
			}

			// Wait for task completion
			if taskID != "" {
				if err := s.proxmox.WaitForTask(ctx, nodeName, taskID, 2*time.Minute); err != nil {
					s.log.Error("VM action task failed", "error", err)
				}
			}
		}
	} else {
		// Simulate action delay
		time.Sleep(2 * time.Second)
	}

	// Update final status
	s.db.Model(&database.VM{}).Where("id = ?", vmID).Update("status", finalStatus)
	s.log.Info("VM action completed", "vm_id", vmID, "action", action, "status", finalStatus)
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

	// Queue async snapshot creation
	s.jobQueue <- Job{
		Type:   "snapshot",
		VMID:   vmID,
		Action: snapshot.ID, // Pass snapshot ID
		Ctx:    context.Background(),
	}

	return &snapshot, nil
}

// executeCreateSnapshot handles actual Proxmox snapshot creation
func (s *Service) executeCreateSnapshot(ctx context.Context, vmID, snapshotID string) {
	s.log.Info("creating VM snapshot", "vm_id", vmID, "snapshot_id", snapshotID)

	var vm database.VM
	if err := s.db.Where("id = ?", vmID).First(&vm).Error; err != nil {
		s.log.Error("failed to get VM for snapshot", "error", err)
		return
	}

	var snapshot database.Snapshot
	if err := s.db.Where("id = ?", snapshotID).First(&snapshot).Error; err != nil {
		s.log.Error("failed to get snapshot record", "error", err)
		return
	}

	// Create on Proxmox if configured
	if vm.ProxmoxVMID > 0 && s.cfg.APIUrl != "" && s.cfg.APIUrl != "https://proxmox.local:8006/api2/json" {
		nodeName := vm.ProxmoxNodeID
		if nodeName == "" {
			nodes, err := s.proxmox.GetNodes(ctx)
			if err == nil && len(nodes) > 0 {
				nodeName = nodes[0].Node
			}
		}

		if nodeName != "" {
			taskID, err := s.proxmox.CreateSnapshot(ctx, nodeName, vm.ProxmoxVMID, snapshot.Name, snapshot.Description)
			if err != nil {
				s.log.Error("failed to create snapshot on Proxmox", "error", err)
				s.db.Model(&snapshot).Update("status", "error")
				return
			}

			if err := s.proxmox.WaitForTask(ctx, nodeName, taskID, 5*time.Minute); err != nil {
				s.log.Error("snapshot task failed", "error", err)
				s.db.Model(&snapshot).Update("status", "error")
				return
			}
		}
	} else {
		// Simulate snapshot creation
		time.Sleep(3 * time.Second)
	}

	// Update snapshot status
	s.db.Model(&snapshot).Updates(map[string]interface{}{
		"status": "available",
		"size":   int64(vm.DiskSize) * 1024 * 1024 * 1024,
	})

	s.log.Info("snapshot created successfully", "vm_id", vmID, "snapshot_id", snapshotID)
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
		ID:          vm.ID,
		Name:        vm.Name,
		Status:      vm.Status,
		VCPUs:       vm.VCPUs,
		Memory:      vm.Memory,
		DiskSize:    vm.DiskSize,
		OS:          vm.OS,
		PublicIP:    vm.PublicIP,
		PrivateIP:   vm.PrivateIP,
		ProjectID:   vm.ProjectID,
		ProxmoxVMID: vm.ProxmoxVMID,
		Tags:        vm.Tags,
		CreatedAt:   vm.CreatedAt,
	}
}

func getOSType(os string) string {
	switch os {
	case "ubuntu", "debian":
		return "l26"
	case "centos", "rhel", "rocky", "alma":
		return "l26"
	case "windows":
		return "win11"
	default:
		return "l26"
	}
}
