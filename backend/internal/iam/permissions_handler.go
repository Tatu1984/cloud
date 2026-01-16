package iam

import (
	"net/http"

	"github.com/cloudplatform/backend/internal/middleware"
	"github.com/cloudplatform/backend/pkg/response"
	"github.com/go-chi/chi/v5"
)

// PermissionHandler handles permission HTTP requests
type PermissionHandler struct {
	service *PermissionService
}

// NewPermissionHandler creates a new permission handler
func NewPermissionHandler(service *PermissionService) *PermissionHandler {
	return &PermissionHandler{service: service}
}

// RegisterRoutes registers permission routes
func (h *PermissionHandler) RegisterRoutes(r chi.Router) {
	r.Route("/permissions", func(r chi.Router) {
		r.Get("/", h.ListPermissions)
		r.Get("/grouped", h.ListPermissionsGrouped)
		r.Get("/{id}", h.GetPermission)
	})

	// User permission check endpoint
	r.Get("/users/{id}/permissions", h.GetUserPermissions)
	r.Get("/auth/permissions", h.GetCurrentUserPermissions)
}

// ListPermissions returns all permissions
func (h *PermissionHandler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	permissions, err := h.service.ListPermissions(r.Context())
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, permissions)
}

// ListPermissionsGrouped returns permissions grouped by resource
func (h *PermissionHandler) ListPermissionsGrouped(w http.ResponseWriter, r *http.Request) {
	groups, err := h.service.ListPermissionsGrouped(r.Context())
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, groups)
}

// GetPermission returns a specific permission
func (h *PermissionHandler) GetPermission(w http.ResponseWriter, r *http.Request) {
	permID := chi.URLParam(r, "id")

	permission, err := h.service.GetPermission(r.Context(), permID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, permission)
}

// GetUserPermissions returns all permissions for a user
func (h *PermissionHandler) GetUserPermissions(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")

	permissions, err := h.service.GetUserPermissions(r.Context(), userID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, map[string]interface{}{
		"userId":      userID,
		"permissions": permissions,
	})
}

// GetCurrentUserPermissions returns permissions for the currently authenticated user
func (h *PermissionHandler) GetCurrentUserPermissions(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "not authenticated")
		return
	}

	permissions, err := h.service.GetUserPermissions(r.Context(), userID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, map[string]interface{}{
		"permissions": permissions,
	})
}
