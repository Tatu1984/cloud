package iam

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/cloudplatform/backend/internal/middleware"
	"github.com/cloudplatform/backend/pkg/errors"
	"github.com/cloudplatform/backend/pkg/response"
	"github.com/go-chi/chi/v5"
)

// Handler handles IAM HTTP requests
type Handler struct {
	service *Service
}

// NewHandler creates a new IAM handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers IAM routes
func (h *Handler) RegisterRoutes(r chi.Router, authMiddleware *middleware.AuthMiddleware) {
	// Rate limiter for auth endpoints: 10 requests per minute per IP
	authRateLimiter := middleware.IPRateLimiter(10, time.Minute, 15)

	// Public routes with rate limiting
	r.With(authRateLimiter).Post("/auth/login", h.Login)
	r.With(authRateLimiter).Post("/auth/register", h.Register)
	r.With(authRateLimiter).Post("/auth/refresh", h.RefreshToken)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware.Authenticate)

		r.Post("/auth/logout", h.Logout)
		r.Get("/auth/me", h.GetCurrentUser)
		r.Put("/auth/me", h.UpdateCurrentUser)
		r.Post("/auth/change-password", h.ChangePassword)

		// User management
		r.Get("/users", h.ListUsers)
		r.Get("/users/{id}", h.GetUser)
		r.Post("/users/invite", h.InviteUser)
		r.Delete("/users/{id}", h.DeleteUser)
	})
}

// Login handles user login
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		response.Error(w, errors.Validation(map[string]string{
			"email":    "email is required",
			"password": "password is required",
		}))
		return
	}

	result, err := h.service.Login(r.Context(), req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, result)
}

// Register handles user registration
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	validationErrors := make(map[string]string)
	if req.Email == "" {
		validationErrors["email"] = "email is required"
	}
	if req.Password == "" || len(req.Password) < 8 {
		validationErrors["password"] = "password must be at least 8 characters"
	}
	if req.Name == "" {
		validationErrors["name"] = "name is required"
	}
	if req.OrganizationName == "" {
		validationErrors["organizationName"] = "organization name is required"
	}

	if len(validationErrors) > 0 {
		response.Error(w, errors.Validation(validationErrors))
		return
	}

	result, err := h.service.Register(r.Context(), req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.Created(w, result)
}

// RefreshToken handles token refresh
func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if req.RefreshToken == "" {
		response.BadRequest(w, "refresh token is required")
		return
	}

	tokens, err := h.service.RefreshToken(r.Context(), req.RefreshToken)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, tokens)
}

// Logout handles user logout
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Try to get from cookie
		cookie, err := r.Cookie("refresh_token")
		if err == nil {
			req.RefreshToken = cookie.Value
		}
	}

	if req.RefreshToken != "" {
		h.service.Logout(r.Context(), req.RefreshToken)
	}

	response.NoContent(w)
}

// GetCurrentUser returns the current user
func (h *Handler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "not authenticated")
		return
	}

	user, err := h.service.GetCurrentUser(r.Context(), userID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, user)
}

// UpdateCurrentUser updates the current user
func (h *Handler) UpdateCurrentUser(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "not authenticated")
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	user, err := h.service.UpdateUser(r.Context(), userID, req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, user)
}

// ChangePassword changes the user's password
func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "not authenticated")
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.service.ChangePassword(r.Context(), userID, req); err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, map[string]string{"message": "password changed successfully"})
}

// ListUsers returns all users in the organization
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrganizationID(r.Context())
	if orgID == "" {
		response.Unauthorized(w, "not authenticated")
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

	users, total, err := h.service.ListUsers(r.Context(), orgID, page, perPage)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.Paginated(w, users, page, perPage, total)
}

// GetUser returns a specific user
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")

	user, err := h.service.GetUser(r.Context(), userID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.OK(w, user)
}

// InviteUser invites a user to the organization
func (h *Handler) InviteUser(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrganizationID(r.Context())
	if orgID == "" {
		response.Unauthorized(w, "not authenticated")
		return
	}

	// Check admin role
	if !middleware.IsAdmin(r.Context()) {
		response.Forbidden(w, "admin access required")
		return
	}

	var req InviteUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.service.InviteUser(r.Context(), orgID, req); err != nil {
		response.Error(w, err)
		return
	}

	response.Created(w, map[string]string{"message": "invitation sent"})
}

// DeleteUser deletes a user
func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	// Check admin role
	if !middleware.IsAdmin(r.Context()) {
		response.Forbidden(w, "admin access required")
		return
	}

	userID := chi.URLParam(r, "id")

	// Prevent self-deletion
	currentUserID := middleware.GetUserID(r.Context())
	if userID == currentUserID {
		response.BadRequest(w, "cannot delete your own account")
		return
	}

	if err := h.service.DeleteUser(r.Context(), userID); err != nil {
		response.Error(w, err)
		return
	}

	response.NoContent(w)
}
