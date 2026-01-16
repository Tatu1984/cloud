package iam

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"time"

	"github.com/cloudplatform/backend/internal/database"
	"github.com/cloudplatform/backend/pkg/errors"
	"gorm.io/gorm"
)

// ServiceAccountService handles service account operations
type ServiceAccountService struct {
	db *gorm.DB
}

// NewServiceAccountService creates a new service account service
func NewServiceAccountService(db *gorm.DB) *ServiceAccountService {
	return &ServiceAccountService{db: db}
}

// ServiceAccountResponse represents a service account in API responses
type ServiceAccountResponse struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Description    string    `json:"description,omitempty"`
	OrganizationID string    `json:"organizationId"`
	RoleID         string    `json:"roleId,omitempty"`
	RoleName       string    `json:"roleName,omitempty"`
	Status         string    `json:"status"`
	KeyPrefix      string    `json:"keyPrefix,omitempty"`
	LastUsedAt     *string   `json:"lastUsedAt,omitempty"`
	ExpiresAt      *string   `json:"expiresAt,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// ServiceAccountWithKey includes the API key (only returned on create/rotate)
type ServiceAccountWithKey struct {
	ServiceAccountResponse
	APIKey string `json:"apiKey"` // Only returned once during creation or rotation
}

// CreateServiceAccountRequest represents a request to create a service account
type CreateServiceAccountRequest struct {
	Name        string  `json:"name" validate:"required,min=2,max=255"`
	Description string  `json:"description,omitempty"`
	RoleID      string  `json:"roleId,omitempty"`
	ExpiresAt   *string `json:"expiresAt,omitempty"` // ISO 8601 format
}

// UpdateServiceAccountRequest represents a request to update a service account
type UpdateServiceAccountRequest struct {
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
	RoleID      string `json:"roleId,omitempty"`
}

// CreateServiceAccount creates a new service account with an API key
func (s *ServiceAccountService) CreateServiceAccount(ctx context.Context, orgID string, req CreateServiceAccountRequest) (*ServiceAccountWithKey, error) {
	// Check if name is unique within organization
	var existing database.ServiceAccount
	if err := s.db.WithContext(ctx).Where("name = ? AND organization_id = ?", req.Name, orgID).First(&existing).Error; err == nil {
		return nil, errors.New(errors.ErrResourceExists, "service account with this name already exists")
	}

	// Generate API key
	apiKey, keyHash, keyPrefix, err := generateAPIKey()
	if err != nil {
		return nil, errors.Internal("failed to generate API key")
	}

	sa := database.ServiceAccount{
		Name:           req.Name,
		Description:    req.Description,
		OrganizationID: orgID,
		RoleID:         req.RoleID,
		Status:         "active",
		KeyHash:        keyHash,
		KeyPrefix:      keyPrefix,
	}

	if req.ExpiresAt != nil {
		expiresAt, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err == nil {
			sa.ExpiresAt = sql.NullTime{Time: expiresAt, Valid: true}
		}
	}

	if err := s.db.WithContext(ctx).Create(&sa).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	resp := s.toServiceAccountResponse(sa)
	return &ServiceAccountWithKey{
		ServiceAccountResponse: *resp,
		APIKey:                 apiKey,
	}, nil
}

// ListServiceAccounts returns all service accounts for an organization
func (s *ServiceAccountService) ListServiceAccounts(ctx context.Context, orgID string) ([]ServiceAccountResponse, error) {
	var serviceAccounts []database.ServiceAccount
	if err := s.db.WithContext(ctx).
		Preload("Role").
		Where("organization_id = ?", orgID).
		Order("name ASC").
		Find(&serviceAccounts).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	result := make([]ServiceAccountResponse, len(serviceAccounts))
	for i, sa := range serviceAccounts {
		result[i] = *s.toServiceAccountResponse(sa)
	}

	return result, nil
}

// GetServiceAccount returns a service account by ID
func (s *ServiceAccountService) GetServiceAccount(ctx context.Context, saID string) (*ServiceAccountResponse, error) {
	var sa database.ServiceAccount
	if err := s.db.WithContext(ctx).
		Preload("Role").
		Where("id = ?", saID).
		First(&sa).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NotFound("service account")
		}
		return nil, errors.DatabaseError(err)
	}

	return s.toServiceAccountResponse(sa), nil
}

// UpdateServiceAccount updates a service account
func (s *ServiceAccountService) UpdateServiceAccount(ctx context.Context, saID string, req UpdateServiceAccountRequest) (*ServiceAccountResponse, error) {
	var sa database.ServiceAccount
	if err := s.db.WithContext(ctx).Where("id = ?", saID).First(&sa).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NotFound("service account")
		}
		return nil, errors.DatabaseError(err)
	}

	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.RoleID != "" {
		updates["role_id"] = req.RoleID
	}

	if len(updates) > 0 {
		if err := s.db.Model(&sa).Updates(updates).Error; err != nil {
			return nil, errors.DatabaseError(err)
		}
	}

	return s.GetServiceAccount(ctx, saID)
}

// DeleteServiceAccount deletes a service account
func (s *ServiceAccountService) DeleteServiceAccount(ctx context.Context, saID string) error {
	result := s.db.WithContext(ctx).Where("id = ?", saID).Delete(&database.ServiceAccount{})
	if result.RowsAffected == 0 {
		return errors.NotFound("service account")
	}
	return nil
}

// RotateAPIKey generates a new API key for a service account
func (s *ServiceAccountService) RotateAPIKey(ctx context.Context, saID string) (*ServiceAccountWithKey, error) {
	var sa database.ServiceAccount
	if err := s.db.WithContext(ctx).Where("id = ?", saID).First(&sa).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NotFound("service account")
		}
		return nil, errors.DatabaseError(err)
	}

	// Generate new API key
	apiKey, keyHash, keyPrefix, err := generateAPIKey()
	if err != nil {
		return nil, errors.Internal("failed to generate API key")
	}

	// Update service account with new key
	if err := s.db.Model(&sa).Updates(map[string]interface{}{
		"key_hash":   keyHash,
		"key_prefix": keyPrefix,
	}).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	resp := s.toServiceAccountResponse(sa)
	resp.KeyPrefix = keyPrefix
	return &ServiceAccountWithKey{
		ServiceAccountResponse: *resp,
		APIKey:                 apiKey,
	}, nil
}

// ActivateServiceAccount activates a service account
func (s *ServiceAccountService) ActivateServiceAccount(ctx context.Context, saID string) error {
	result := s.db.WithContext(ctx).
		Model(&database.ServiceAccount{}).
		Where("id = ?", saID).
		Update("status", "active")

	if result.RowsAffected == 0 {
		return errors.NotFound("service account")
	}
	return nil
}

// DeactivateServiceAccount deactivates a service account
func (s *ServiceAccountService) DeactivateServiceAccount(ctx context.Context, saID string) error {
	result := s.db.WithContext(ctx).
		Model(&database.ServiceAccount{}).
		Where("id = ?", saID).
		Update("status", "inactive")

	if result.RowsAffected == 0 {
		return errors.NotFound("service account")
	}
	return nil
}

// ValidateAPIKey validates a service account API key and returns the service account
func (s *ServiceAccountService) ValidateAPIKey(ctx context.Context, apiKey string) (*database.ServiceAccount, error) {
	// Hash the provided key
	hash := sha256.Sum256([]byte(apiKey))
	keyHash := hex.EncodeToString(hash[:])

	var sa database.ServiceAccount
	if err := s.db.WithContext(ctx).
		Preload("Role").
		Preload("Role.Permissions").
		Where("key_hash = ? AND status = 'active'", keyHash).
		First(&sa).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errors.ErrUnauthorized, "invalid API key")
		}
		return nil, errors.DatabaseError(err)
	}

	// Check expiration
	if sa.ExpiresAt.Valid && sa.ExpiresAt.Time.Before(time.Now()) {
		return nil, errors.New(errors.ErrUnauthorized, "API key has expired")
	}

	// Update last used timestamp
	s.db.Model(&sa).Update("last_used_at", time.Now())

	return &sa, nil
}

// Helper function to generate API key
func generateAPIKey() (apiKey, keyHash, keyPrefix string, err error) {
	// Generate 32 random bytes for the key
	keyBytes := make([]byte, 32)
	if _, err := rand.Read(keyBytes); err != nil {
		return "", "", "", err
	}

	// Create the API key with a prefix
	apiKey = "sk_" + hex.EncodeToString(keyBytes)

	// Hash the key for storage
	hash := sha256.Sum256([]byte(apiKey))
	keyHash = hex.EncodeToString(hash[:])

	// Store prefix for identification
	keyPrefix = apiKey[:10]

	return apiKey, keyHash, keyPrefix, nil
}

// Helper function to convert database model to response
func (s *ServiceAccountService) toServiceAccountResponse(sa database.ServiceAccount) *ServiceAccountResponse {
	resp := &ServiceAccountResponse{
		ID:             sa.ID,
		Name:           sa.Name,
		Description:    sa.Description,
		OrganizationID: sa.OrganizationID,
		RoleID:         sa.RoleID,
		Status:         sa.Status,
		KeyPrefix:      sa.KeyPrefix,
		CreatedAt:      sa.CreatedAt,
		UpdatedAt:      sa.UpdatedAt,
	}

	if sa.Role.ID != "" {
		resp.RoleName = sa.Role.DisplayName
		if resp.RoleName == "" {
			resp.RoleName = sa.Role.Name
		}
	}

	if sa.LastUsedAt.Valid {
		t := sa.LastUsedAt.Time.Format(time.RFC3339)
		resp.LastUsedAt = &t
	}

	if sa.ExpiresAt.Valid {
		t := sa.ExpiresAt.Time.Format(time.RFC3339)
		resp.ExpiresAt = &t
	}

	return resp
}
