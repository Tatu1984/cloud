package iam

import (
	"context"
	"database/sql"
	"time"

	"github.com/cloudplatform/backend/internal/auth"
	"github.com/cloudplatform/backend/internal/config"
	"github.com/cloudplatform/backend/internal/database"
	"github.com/cloudplatform/backend/pkg/errors"
	"gorm.io/gorm"
)

// Service handles IAM operations
type Service struct {
	db         *gorm.DB
	jwtService *auth.JWTService
}

// NewService creates a new IAM service
func NewService(db *gorm.DB, cfg *config.JWTConfig) *Service {
	return &Service{
		db:         db,
		jwtService: auth.NewJWTService(cfg),
	}
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

// RegisterRequest represents a registration request
type RegisterRequest struct {
	Email            string `json:"email" validate:"required,email"`
	Password         string `json:"password" validate:"required,min=8"`
	Name             string `json:"name" validate:"required,min=2"`
	OrganizationName string `json:"organizationName" validate:"required,min=2"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	User         UserResponse       `json:"user"`
	Organization OrganizationResponse `json:"organization"`
	Tokens       *auth.TokenPair    `json:"tokens"`
}

// UserResponse represents a user in API responses
type UserResponse struct {
	ID             string    `json:"id"`
	Email          string    `json:"email"`
	Name           string    `json:"name"`
	Avatar         string    `json:"avatar,omitempty"`
	OrganizationID string    `json:"organizationId"`
	EmailVerified  bool      `json:"emailVerified"`
	Roles          []string  `json:"roles"`
	CreatedAt      time.Time `json:"createdAt"`
}

// OrganizationResponse represents an organization in API responses
type OrganizationResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Plan      string    `json:"plan"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

// Login authenticates a user
func (s *Service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	var user database.User
	if err := s.db.WithContext(ctx).
		Preload("Organization").
		Preload("Roles").
		Where("email = ? AND deleted_at IS NULL", req.Email).
		First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errors.ErrInvalidCredentials, "invalid email or password")
		}
		return nil, errors.DatabaseError(err)
	}

	// Check password
	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		return nil, errors.New(errors.ErrInvalidCredentials, "invalid email or password")
	}

	// Check user status
	if user.Status != "active" {
		return nil, errors.New(errors.ErrForbidden, "account is not active")
	}

	// Get role names
	roles := make([]string, len(user.Roles))
	for i, role := range user.Roles {
		roles[i] = role.Name
	}

	// Generate tokens
	tokens, err := s.jwtService.GenerateTokenPair(user.ID, user.Email, user.OrganizationID, roles)
	if err != nil {
		return nil, errors.Internal("failed to generate tokens")
	}

	// Update last login
	s.db.Model(&user).Update("last_login_at", time.Now())

	// Create session
	session := database.Session{
		UserID:       user.ID,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    time.Now().Add(7 * 24 * time.Hour),
	}
	s.db.Create(&session)

	return &AuthResponse{
		User:         toUserResponse(user, roles),
		Organization: toOrganizationResponse(user.Organization),
		Tokens:       tokens,
	}, nil
}

// Register creates a new user and organization
func (s *Service) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	// Check if email exists
	var existingUser database.User
	if err := s.db.WithContext(ctx).Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return nil, errors.New(errors.ErrResourceExists, "email already registered")
	}

	// Hash password
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, errors.Internal("failed to hash password")
	}

	// Generate slug from organization name
	slug := generateSlug(req.OrganizationName)

	// Start transaction
	tx := s.db.WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create organization
	org := database.Organization{
		Name:   req.OrganizationName,
		Slug:   slug,
		Plan:   "starter",
		Status: "active",
	}
	if err := tx.Create(&org).Error; err != nil {
		tx.Rollback()
		return nil, errors.DatabaseError(err)
	}

	// Create user
	user := database.User{
		Email:          req.Email,
		Name:           req.Name,
		PasswordHash:   passwordHash,
		OrganizationID: org.ID,
		EmailVerified:  false,
		Status:         "active",
	}
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		return nil, errors.DatabaseError(err)
	}

	// Get admin role
	var adminRole database.Role
	if err := tx.Where("name = ?", "admin").First(&adminRole).Error; err != nil {
		// Create admin role if not exists
		adminRole = database.Role{
			Name:        "admin",
			DisplayName: "Administrator",
			IsSystem:    true,
		}
		tx.Create(&adminRole)
	}

	// Assign admin role to user (first user in org is admin)
	userRole := database.UserRole{
		UserID: user.ID,
		RoleID: adminRole.ID,
	}
	if err := tx.Create(&userRole).Error; err != nil {
		tx.Rollback()
		return nil, errors.DatabaseError(err)
	}

	// Create default project
	project := database.Project{
		Name:           "Default Project",
		Description:    "Your default project",
		OrganizationID: org.ID,
		Status:         "active",
	}
	tx.Create(&project)

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	// Generate tokens
	roles := []string{"admin"}
	tokens, err := s.jwtService.GenerateTokenPair(user.ID, user.Email, org.ID, roles)
	if err != nil {
		return nil, errors.Internal("failed to generate tokens")
	}

	return &AuthResponse{
		User:         toUserResponse(user, roles),
		Organization: toOrganizationResponse(org),
		Tokens:       tokens,
	}, nil
}

// RefreshToken refreshes an access token
func (s *Service) RefreshToken(ctx context.Context, refreshToken string) (*auth.TokenPair, error) {
	claims, err := s.jwtService.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, errors.New(errors.ErrInvalidToken, "invalid refresh token")
	}

	// Check session exists
	var session database.Session
	if err := s.db.WithContext(ctx).
		Where("refresh_token = ? AND expires_at > ?", refreshToken, time.Now()).
		First(&session).Error; err != nil {
		return nil, errors.New(errors.ErrInvalidToken, "session not found or expired")
	}

	// Get user with roles
	var user database.User
	if err := s.db.WithContext(ctx).
		Preload("Roles").
		Where("id = ? AND deleted_at IS NULL", claims.UserID).
		First(&user).Error; err != nil {
		return nil, errors.NotFound("user")
	}

	// Get role names
	roles := make([]string, len(user.Roles))
	for i, role := range user.Roles {
		roles[i] = role.Name
	}

	// Generate new tokens
	tokens, err := s.jwtService.GenerateTokenPair(user.ID, user.Email, user.OrganizationID, roles)
	if err != nil {
		return nil, errors.Internal("failed to generate tokens")
	}

	// Update session
	s.db.Model(&session).Updates(map[string]interface{}{
		"refresh_token": tokens.RefreshToken,
		"expires_at":    time.Now().Add(7 * 24 * time.Hour),
	})

	return tokens, nil
}

// Logout invalidates user session and revokes tokens
func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	// Revoke the refresh token by adding it to the blacklist
	s.jwtService.RevokeToken(refreshToken)

	// Delete the session from database
	return s.db.WithContext(ctx).
		Where("refresh_token = ?", refreshToken).
		Delete(&database.Session{}).Error
}

// LogoutAll invalidates all sessions for a user
func (s *Service) LogoutAll(ctx context.Context, userID string) error {
	// Get all sessions for the user
	var sessions []database.Session
	s.db.WithContext(ctx).Where("user_id = ?", userID).Find(&sessions)

	// Revoke all refresh tokens
	for _, session := range sessions {
		s.jwtService.RevokeToken(session.RefreshToken)
	}

	// Delete all sessions
	return s.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Delete(&database.Session{}).Error
}

// GetUser returns a user by ID
func (s *Service) GetUser(ctx context.Context, userID string) (*UserResponse, error) {
	var user database.User
	if err := s.db.WithContext(ctx).
		Preload("Roles").
		Where("id = ? AND deleted_at IS NULL", userID).
		First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NotFound("user")
		}
		return nil, errors.DatabaseError(err)
	}

	roles := make([]string, len(user.Roles))
	for i, role := range user.Roles {
		roles[i] = role.Name
	}

	resp := toUserResponse(user, roles)
	return &resp, nil
}

// GetCurrentUser returns the current user from context
func (s *Service) GetCurrentUser(ctx context.Context, userID string) (*UserResponse, error) {
	return s.GetUser(ctx, userID)
}

// UpdateUserRequest represents an update user request
type UpdateUserRequest struct {
	Name   string `json:"name,omitempty"`
	Avatar string `json:"avatar,omitempty"`
}

// UpdateUser updates a user
func (s *Service) UpdateUser(ctx context.Context, userID string, req UpdateUserRequest) (*UserResponse, error) {
	var user database.User
	if err := s.db.WithContext(ctx).
		Preload("Roles").
		Where("id = ? AND deleted_at IS NULL", userID).
		First(&user).Error; err != nil {
		return nil, errors.NotFound("user")
	}

	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}

	if len(updates) > 0 {
		if err := s.db.Model(&user).Updates(updates).Error; err != nil {
			return nil, errors.DatabaseError(err)
		}
	}

	roles := make([]string, len(user.Roles))
	for i, role := range user.Roles {
		roles[i] = role.Name
	}

	resp := toUserResponse(user, roles)
	return &resp, nil
}

// ChangePasswordRequest represents a password change request
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" validate:"required"`
	NewPassword     string `json:"newPassword" validate:"required,min=8"`
}

// ChangePassword changes user password
func (s *Service) ChangePassword(ctx context.Context, userID string, req ChangePasswordRequest) error {
	var user database.User
	if err := s.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", userID).
		First(&user).Error; err != nil {
		return errors.NotFound("user")
	}

	// Verify current password
	if !auth.CheckPassword(req.CurrentPassword, user.PasswordHash) {
		return errors.New(errors.ErrInvalidCredentials, "current password is incorrect")
	}

	// Hash new password
	newHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		return errors.Internal("failed to hash password")
	}

	// Update password
	if err := s.db.Model(&user).Update("password_hash", newHash).Error; err != nil {
		return errors.DatabaseError(err)
	}

	// Invalidate all sessions and revoke tokens (security best practice)
	s.LogoutAll(ctx, userID)

	return nil
}

// ListUsers returns all users in an organization
func (s *Service) ListUsers(ctx context.Context, orgID string, page, perPage int) ([]UserResponse, int64, error) {
	var users []database.User
	var total int64

	query := s.db.WithContext(ctx).
		Preload("Roles").
		Where("organization_id = ? AND deleted_at IS NULL", orgID)

	query.Model(&database.User{}).Count(&total)

	offset := (page - 1) * perPage
	if err := query.Offset(offset).Limit(perPage).Find(&users).Error; err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	result := make([]UserResponse, len(users))
	for i, user := range users {
		roles := make([]string, len(user.Roles))
		for j, role := range user.Roles {
			roles[j] = role.Name
		}
		result[i] = toUserResponse(user, roles)
	}

	return result, total, nil
}

// InviteUserRequest represents a user invitation request
type InviteUserRequest struct {
	Email string `json:"email" validate:"required,email"`
	Role  string `json:"role" validate:"required"`
}

// InviteUser invites a user to the organization
func (s *Service) InviteUser(ctx context.Context, orgID string, req InviteUserRequest) error {
	// Check if user already exists
	var existingUser database.User
	if err := s.db.WithContext(ctx).Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return errors.New(errors.ErrResourceExists, "user already exists")
	}

	// TODO: Send invitation email
	// For now, just create the user with a temporary password

	tempPassword, _ := auth.GenerateRandomString(16)
	passwordHash, _ := auth.HashPassword(tempPassword)

	user := database.User{
		Email:          req.Email,
		Name:           req.Email, // Will be updated by user
		PasswordHash:   passwordHash,
		OrganizationID: orgID,
		EmailVerified:  false,
		Status:         "pending",
	}

	if err := s.db.Create(&user).Error; err != nil {
		return errors.DatabaseError(err)
	}

	// Assign role
	var role database.Role
	if err := s.db.Where("name = ?", req.Role).First(&role).Error; err != nil {
		return errors.NotFound("role")
	}

	userRole := database.UserRole{
		UserID: user.ID,
		RoleID: role.ID,
	}
	s.db.Create(&userRole)

	return nil
}

// DeleteUser deletes a user
func (s *Service) DeleteUser(ctx context.Context, userID string) error {
	result := s.db.WithContext(ctx).
		Model(&database.User{}).
		Where("id = ?", userID).
		Update("deleted_at", sql.NullTime{Time: time.Now(), Valid: true})

	if result.RowsAffected == 0 {
		return errors.NotFound("user")
	}

	// Delete sessions
	s.db.Where("user_id = ?", userID).Delete(&database.Session{})

	return nil
}

// Helper functions

func toUserResponse(user database.User, roles []string) UserResponse {
	return UserResponse{
		ID:             user.ID,
		Email:          user.Email,
		Name:           user.Name,
		Avatar:         user.Avatar,
		OrganizationID: user.OrganizationID,
		EmailVerified:  user.EmailVerified,
		Roles:          roles,
		CreatedAt:      user.CreatedAt,
	}
}

func toOrganizationResponse(org database.Organization) OrganizationResponse {
	return OrganizationResponse{
		ID:        org.ID,
		Name:      org.Name,
		Slug:      org.Slug,
		Plan:      org.Plan,
		Status:    org.Status,
		CreatedAt: org.CreatedAt,
	}
}

func generateSlug(name string) string {
	// Simple slug generation
	slug := ""
	for _, c := range name {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') {
			slug += string(c)
		} else if c >= 'A' && c <= 'Z' {
			slug += string(c + 32) // lowercase
		} else if c == ' ' || c == '-' {
			if len(slug) > 0 && slug[len(slug)-1] != '-' {
				slug += "-"
			}
		}
	}
	return slug
}
