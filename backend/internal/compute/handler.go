package compute

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/cloudplatform/backend/internal/middleware"
	"github.com/cloudplatform/backend/pkg/errors"
	"github.com/cloudplatform/backend/pkg/response"
	"github.com/go-chi/chi/v5"
)

// Handler handles compute HTTP requests
type Handler struct {
	service *Service
}

// NewHandler creates a new compute handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers compute routes
func (h *Handler) RegisterRoutes(r chi.Router) {
	// VMs
	r.Get("/vms", h.ListVMs)
	r.Post("/vms", h.CreateVM)
	r.Get("/vms/{id}", h.GetVM)
	r.Put("/vms/{id}", h.UpdateVM)
	r.Delete("/vms/{id}", h.DeleteVM)
	r.Post("/vms/{id}/actions", h.VMAction)

	// Snapshots
	r.Get("/vms/{id}/snapshots", h.ListSnapshots)
	r.Post("/vms/{id}/snapshots", h.CreateSnapshot)
	r.Delete("/snapshots/{id}", h.DeleteSnapshot)

	// Templates
	r.Get("/templates", h.ListTemplates)
}

// ListVMs returns all VMs for a project
func (h *Handler) ListVMs(w http.ResponseWriter, r *http.Request) {
	projectID := r.URL.Query().Get("projectId")
	if projectID == "" {
		response.BadRequest(w, "projectId is required")
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(r.URL.Query().Get("perPage"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	vms, total, err := h.service.ListVMs(r.Context(), projectID, page, perPage)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.Paginated(w, vms, page, perPage, total)
}

// GetVM returns a specific VM
func (h *Handler) GetVM(w http.ResponseWriter, r *http.Request) {
	vmID := chi.URLParam(r, "id")

	vm, err := h.service.GetVM(r.Context(), vmID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, vm)
}

// CreateVM creates a new VM
func (h *Handler) CreateVM(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrganizationID(r.Context())
	if orgID == "" {
		response.Unauthorized(w, "not authenticated")
		return
	}

	var req CreateVMRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	// Validate
	validationErrors := make(map[string]string)
	if req.Name == "" {
		validationErrors["name"] = "name is required"
	}
	if req.ProjectID == "" {
		validationErrors["projectId"] = "projectId is required"
	}
	if req.VCPUs < 1 {
		validationErrors["vcpus"] = "vcpus must be at least 1"
	}
	if req.Memory < 512 {
		validationErrors["memory"] = "memory must be at least 512 MB"
	}
	if req.DiskSize < 10 {
		validationErrors["diskSize"] = "diskSize must be at least 10 GB"
	}
	if req.OS == "" {
		validationErrors["os"] = "os is required"
	}

	if len(validationErrors) > 0 {
		response.Error(w, errors.Validation(validationErrors))
		return
	}

	vm, err := h.service.CreateVM(r.Context(), orgID, req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.Created(w, vm)
}

// UpdateVM updates a VM
func (h *Handler) UpdateVM(w http.ResponseWriter, r *http.Request) {
	vmID := chi.URLParam(r, "id")

	var req UpdateVMRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	vm, err := h.service.UpdateVM(r.Context(), vmID, req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, vm)
}

// DeleteVM deletes a VM
func (h *Handler) DeleteVM(w http.ResponseWriter, r *http.Request) {
	vmID := chi.URLParam(r, "id")

	if err := h.service.DeleteVM(r.Context(), vmID); err != nil {
		response.Error(w, err)
		return
	}

	response.NoContent(w)
}

// VMAction performs an action on a VM
func (h *Handler) VMAction(w http.ResponseWriter, r *http.Request) {
	vmID := chi.URLParam(r, "id")

	var req struct {
		Action string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	action := VMAction(req.Action)
	if action != ActionStart && action != ActionStop && action != ActionReboot && action != ActionShutdown {
		response.BadRequest(w, "invalid action")
		return
	}

	if err := h.service.PerformVMAction(r.Context(), vmID, action); err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, map[string]string{"message": "action initiated"})
}

// ListTemplates returns available VM templates
func (h *Handler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	templates, err := h.service.ListTemplates(r.Context())
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, templates)
}

// ListSnapshots returns snapshots for a VM
func (h *Handler) ListSnapshots(w http.ResponseWriter, r *http.Request) {
	vmID := chi.URLParam(r, "id")

	snapshots, err := h.service.ListSnapshots(r.Context(), vmID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, snapshots)
}

// CreateSnapshot creates a snapshot
func (h *Handler) CreateSnapshot(w http.ResponseWriter, r *http.Request) {
	vmID := chi.URLParam(r, "id")

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if req.Name == "" {
		response.BadRequest(w, "name is required")
		return
	}

	snapshot, err := h.service.CreateSnapshot(r.Context(), vmID, req.Name, req.Description)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.Created(w, snapshot)
}

// DeleteSnapshot deletes a snapshot
func (h *Handler) DeleteSnapshot(w http.ResponseWriter, r *http.Request) {
	snapshotID := chi.URLParam(r, "id")

	if err := h.service.DeleteSnapshot(r.Context(), snapshotID); err != nil {
		response.Error(w, err)
		return
	}

	response.NoContent(w)
}
