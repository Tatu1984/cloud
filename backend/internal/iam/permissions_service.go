package iam

import (
	"context"

	"github.com/cloudplatform/backend/internal/database"
	"github.com/cloudplatform/backend/pkg/errors"
	"gorm.io/gorm"
)

// PermissionService handles permission operations
type PermissionService struct {
	db *gorm.DB
}

// NewPermissionService creates a new permission service
func NewPermissionService(db *gorm.DB) *PermissionService {
	return &PermissionService{db: db}
}

// PermissionResponse represents a permission in API responses
type PermissionResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Resource    string `json:"resource"`
	Action      string `json:"action"`
	Description string `json:"description,omitempty"`
}

// PermissionGroup represents permissions grouped by resource
type PermissionGroup struct {
	Resource    string               `json:"resource"`
	DisplayName string               `json:"displayName"`
	Permissions []PermissionResponse `json:"permissions"`
}

// ListPermissions returns all permissions
func (s *PermissionService) ListPermissions(ctx context.Context) ([]PermissionResponse, error) {
	var permissions []database.Permission
	if err := s.db.WithContext(ctx).Order("resource ASC, action ASC").Find(&permissions).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	result := make([]PermissionResponse, len(permissions))
	for i, p := range permissions {
		result[i] = PermissionResponse{
			ID:          p.ID,
			Name:        p.Name,
			Resource:    p.Resource,
			Action:      p.Action,
			Description: p.Description,
		}
	}

	return result, nil
}

// ListPermissionsGrouped returns permissions grouped by resource
func (s *PermissionService) ListPermissionsGrouped(ctx context.Context) ([]PermissionGroup, error) {
	var permissions []database.Permission
	if err := s.db.WithContext(ctx).Order("resource ASC, action ASC").Find(&permissions).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	// Group by resource
	groupMap := make(map[string]*PermissionGroup)
	resourceOrder := []string{}

	resourceDisplayNames := map[string]string{
		"vm":         "Virtual Machines",
		"storage":    "Block Storage",
		"bucket":     "Object Storage",
		"network":    "Networking",
		"kubernetes": "Kubernetes",
		"database":   "Databases",
		"billing":    "Billing",
		"iam":        "Identity & Access",
		"project":    "Projects",
		"admin":      "Administration",
	}

	for _, p := range permissions {
		if _, exists := groupMap[p.Resource]; !exists {
			displayName := resourceDisplayNames[p.Resource]
			if displayName == "" {
				displayName = p.Resource
			}
			groupMap[p.Resource] = &PermissionGroup{
				Resource:    p.Resource,
				DisplayName: displayName,
				Permissions: []PermissionResponse{},
			}
			resourceOrder = append(resourceOrder, p.Resource)
		}

		groupMap[p.Resource].Permissions = append(groupMap[p.Resource].Permissions, PermissionResponse{
			ID:          p.ID,
			Name:        p.Name,
			Resource:    p.Resource,
			Action:      p.Action,
			Description: p.Description,
		})
	}

	result := make([]PermissionGroup, len(resourceOrder))
	for i, resource := range resourceOrder {
		result[i] = *groupMap[resource]
	}

	return result, nil
}

// GetPermission returns a specific permission
func (s *PermissionService) GetPermission(ctx context.Context, permID string) (*PermissionResponse, error) {
	var permission database.Permission
	if err := s.db.WithContext(ctx).Where("id = ?", permID).First(&permission).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NotFound("permission")
		}
		return nil, errors.DatabaseError(err)
	}

	return &PermissionResponse{
		ID:          permission.ID,
		Name:        permission.Name,
		Resource:    permission.Resource,
		Action:      permission.Action,
		Description: permission.Description,
	}, nil
}

// GetUserPermissions returns all permissions for a user (from all their roles)
func (s *PermissionService) GetUserPermissions(ctx context.Context, userID string) ([]string, error) {
	var user database.User
	if err := s.db.WithContext(ctx).
		Preload("Roles").
		Preload("Roles.Permissions").
		Where("id = ? AND deleted_at IS NULL", userID).
		First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NotFound("user")
		}
		return nil, errors.DatabaseError(err)
	}

	// Collect unique permissions
	permSet := make(map[string]bool)
	for _, role := range user.Roles {
		for _, perm := range role.Permissions {
			permSet[perm.Name] = true
		}
	}

	result := make([]string, 0, len(permSet))
	for perm := range permSet {
		result = append(result, perm)
	}

	return result, nil
}

// HasPermission checks if a user has a specific permission
func (s *PermissionService) HasPermission(ctx context.Context, userID, permissionName string) (bool, error) {
	permissions, err := s.GetUserPermissions(ctx, userID)
	if err != nil {
		return false, err
	}

	for _, p := range permissions {
		if p == permissionName {
			return true, nil
		}
		// Check for wildcard permissions
		// e.g., "vm:*" should match "vm:create"
		if len(p) > 2 && p[len(p)-2:] == ":*" {
			resource := p[:len(p)-2]
			if len(permissionName) > len(resource)+1 && permissionName[:len(resource)+1] == resource+":" {
				return true, nil
			}
		}
	}

	return false, nil
}

// HasAnyPermission checks if a user has any of the specified permissions
func (s *PermissionService) HasAnyPermission(ctx context.Context, userID string, permissionNames []string) (bool, error) {
	for _, perm := range permissionNames {
		has, err := s.HasPermission(ctx, userID, perm)
		if err != nil {
			return false, err
		}
		if has {
			return true, nil
		}
	}
	return false, nil
}
