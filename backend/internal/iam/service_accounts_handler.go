package iam

import (
	"encoding/json"
	"net/http"

	"github.com/cloudplatform/backend/internal/middleware"
	"github.com/cloudplatform/backend/pkg/errors"
	"github.com/cloudplatform/backend/pkg/response"
	"github.com/go-chi/chi/v5"
)

// ServiceAccountHandler handles service account HTTP requests
type ServiceAccountHandler struct {
	service *ServiceAccountService
}

// NewServiceAccountHandler creates a new service account handler
func NewServiceAccountHandler(service *ServiceAccountService) *ServiceAccountHandler {
	return &ServiceAccountHandler{service: service}
}

// RegisterRoutes registers service account routes
func (h *ServiceAccountHandler) RegisterRoutes(r chi.Router) {
	r.Route("/service-accounts", func(r chi.Router) {
		r.Get("/", h.ListServiceAccounts)
		r.Post("/", h.CreateServiceAccount)
		r.Get("/{id}", h.GetServiceAccount)
		r.Put("/{id}", h.UpdateServiceAccount)
		r.Delete("/{id}", h.DeleteServiceAccount)
		r.Post("/{id}/rotate-key", h.RotateAPIKey)
		r.Post("/{id}/activate", h.ActivateServiceAccount)
		r.Post("/{id}/deactivate", h.DeactivateServiceAccount)
	})
}

// ListServiceAccounts returns all service accounts for the organization
func (h *ServiceAccountHandler) ListServiceAccounts(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrganizationID(r.Context())
	if orgID == "" {
		response.Unauthorized(w, "not authenticated")
		return
	}

	serviceAccounts, err := h.service.ListServiceAccounts(r.Context(), orgID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, serviceAccounts)
}

// CreateServiceAccount creates a new service account
func (h *ServiceAccountHandler) CreateServiceAccount(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrganizationID(r.Context())
	if orgID == "" {
		response.Unauthorized(w, "not authenticated")
		return
	}

	var req CreateServiceAccountRequest
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

	sa, err := h.service.CreateServiceAccount(r.Context(), orgID, req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.Created(w, sa)
}

// GetServiceAccount returns a specific service account
func (h *ServiceAccountHandler) GetServiceAccount(w http.ResponseWriter, r *http.Request) {
	saID := chi.URLParam(r, "id")

	sa, err := h.service.GetServiceAccount(r.Context(), saID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, sa)
}

// UpdateServiceAccount updates a service account
func (h *ServiceAccountHandler) UpdateServiceAccount(w http.ResponseWriter, r *http.Request) {
	saID := chi.URLParam(r, "id")

	var req UpdateServiceAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	sa, err := h.service.UpdateServiceAccount(r.Context(), saID, req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, sa)
}

// DeleteServiceAccount deletes a service account
func (h *ServiceAccountHandler) DeleteServiceAccount(w http.ResponseWriter, r *http.Request) {
	saID := chi.URLParam(r, "id")

	if err := h.service.DeleteServiceAccount(r.Context(), saID); err != nil {
		response.Error(w, err)
		return
	}

	response.NoContent(w)
}

// RotateAPIKey generates a new API key for a service account
func (h *ServiceAccountHandler) RotateAPIKey(w http.ResponseWriter, r *http.Request) {
	saID := chi.URLParam(r, "id")

	sa, err := h.service.RotateAPIKey(r.Context(), saID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, sa)
}

// ActivateServiceAccount activates a service account
func (h *ServiceAccountHandler) ActivateServiceAccount(w http.ResponseWriter, r *http.Request) {
	saID := chi.URLParam(r, "id")

	if err := h.service.ActivateServiceAccount(r.Context(), saID); err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, map[string]string{"message": "service account activated"})
}

// DeactivateServiceAccount deactivates a service account
func (h *ServiceAccountHandler) DeactivateServiceAccount(w http.ResponseWriter, r *http.Request) {
	saID := chi.URLParam(r, "id")

	if err := h.service.DeactivateServiceAccount(r.Context(), saID); err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, map[string]string{"message": "service account deactivated"})
}
