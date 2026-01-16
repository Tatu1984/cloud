package iam

import (
	"encoding/json"
	"net/http"

	"github.com/cloudplatform/backend/internal/middleware"
	"github.com/cloudplatform/backend/pkg/errors"
	"github.com/cloudplatform/backend/pkg/response"
	"github.com/go-chi/chi/v5"
)

// RoleHandler handles role HTTP requests
type RoleHandler struct {
	service *RoleService
}

// NewRoleHandler creates a new role handler
func NewRoleHandler(service *RoleService) *RoleHandler {
	return &RoleHandler{service: service}
}

// RegisterRoutes registers role routes
func (h *RoleHandler) RegisterRoutes(r chi.Router) {
	r.Route("/roles", func(r chi.Router) {
		r.Get("/", h.ListRoles)
		r.Post("/", h.CreateRole)
		r.Get("/{id}", h.GetRole)
		r.Put("/{id}", h.UpdateRole)
		r.Delete("/{id}", h.DeleteRole)
		r.Get("/{id}/members", h.GetRoleMembers)
		r.Put("/{id}/permissions", h.UpdateRolePermissions)
	})

	// User role management
	r.Post("/users/{id}/roles", h.AssignRoleToUser)
	r.Delete("/users/{id}/roles/{roleId}", h.RemoveRoleFromUser)
	r.Get("/users/{id}/roles", h.GetUserRoles)
}

// ListRoles returns all roles for the organization
func (h *RoleHandler) ListRoles(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrganizationID(r.Context())
	if orgID == "" {
		response.Unauthorized(w, "not authenticated")
		return
	}

	roles, err := h.service.ListRoles(r.Context(), orgID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, roles)
}

// CreateRole creates a new role
func (h *RoleHandler) CreateRole(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrganizationID(r.Context())
	if orgID == "" {
		response.Unauthorized(w, "not authenticated")
		return
	}

	var req CreateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if req.Name == "" {
		response.Error(w, errors.Validation(map[string]string{
			"name": "name is required",
		}))
		return
	}

	if req.DisplayName == "" {
		req.DisplayName = req.Name
	}

	role, err := h.service.CreateRole(r.Context(), orgID, req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.Created(w, role)
}

// GetRole returns a specific role
func (h *RoleHandler) GetRole(w http.ResponseWriter, r *http.Request) {
	roleID := chi.URLParam(r, "id")

	role, err := h.service.GetRole(r.Context(), roleID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, role)
}

// UpdateRole updates a role
func (h *RoleHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	roleID := chi.URLParam(r, "id")

	var req UpdateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	role, err := h.service.UpdateRole(r.Context(), roleID, req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, role)
}

// DeleteRole deletes a role
func (h *RoleHandler) DeleteRole(w http.ResponseWriter, r *http.Request) {
	roleID := chi.URLParam(r, "id")

	if err := h.service.DeleteRole(r.Context(), roleID); err != nil {
		response.Error(w, err)
		return
	}

	response.NoContent(w)
}

// GetRoleMembers returns all users with a specific role
func (h *RoleHandler) GetRoleMembers(w http.ResponseWriter, r *http.Request) {
	roleID := chi.URLParam(r, "id")

	members, err := h.service.GetRoleMembers(r.Context(), roleID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, members)
}

// UpdateRolePermissions updates the permissions for a role
func (h *RoleHandler) UpdateRolePermissions(w http.ResponseWriter, r *http.Request) {
	roleID := chi.URLParam(r, "id")

	var req UpdateRolePermissionsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.service.UpdateRolePermissions(r.Context(), roleID, req.PermissionIDs); err != nil {
		response.Error(w, err)
		return
	}

	// Return updated role
	role, err := h.service.GetRole(r.Context(), roleID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, role)
}

// AssignRoleToUser assigns a role to a user
func (h *RoleHandler) AssignRoleToUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")

	var req AssignRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if req.RoleID == "" {
		response.Error(w, errors.Validation(map[string]string{
			"roleId": "roleId is required",
		}))
		return
	}

	if err := h.service.AssignRoleToUser(r.Context(), userID, req.RoleID); err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, map[string]string{"message": "role assigned successfully"})
}

// RemoveRoleFromUser removes a role from a user
func (h *RoleHandler) RemoveRoleFromUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")
	roleID := chi.URLParam(r, "roleId")

	if err := h.service.RemoveRoleFromUser(r.Context(), userID, roleID); err != nil {
		response.Error(w, err)
		return
	}

	response.NoContent(w)
}

// GetUserRoles returns all roles for a user
func (h *RoleHandler) GetUserRoles(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")

	roles, err := h.service.GetUserRoles(r.Context(), userID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, roles)
}
