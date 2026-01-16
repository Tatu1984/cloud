package iam

import (
	"context"
	"time"

	"github.com/cloudplatform/backend/internal/database"
	"github.com/cloudplatform/backend/pkg/errors"
	"gorm.io/gorm"
)

// RoleService handles role management operations
type RoleService struct {
	db *gorm.DB
}

// NewRoleService creates a new role service
func NewRoleService(db *gorm.DB) *RoleService {
	return &RoleService{db: db}
}

// RoleResponse represents a role in API responses
type RoleResponse struct {
	ID             string               `json:"id"`
	Name           string               `json:"name"`
	DisplayName    string               `json:"displayName"`
	Description    string               `json:"description,omitempty"`
	IsSystem       bool                 `json:"isSystem"`
	OrganizationID string               `json:"organizationId,omitempty"`
	Permissions    []PermissionResponse `json:"permissions,omitempty"`
	MemberCount    int64                `json:"memberCount"`
	CreatedAt      time.Time            `json:"createdAt"`
	UpdatedAt      time.Time            `json:"updatedAt"`
}

// CreateRoleRequest represents a request to create a role
type CreateRoleRequest struct {
	Name          string   `json:"name" validate:"required,min=2,max=100"`
	DisplayName   string   `json:"displayName" validate:"required,min=2,max=255"`
	Description   string   `json:"description,omitempty"`
	PermissionIDs []string `json:"permissionIds,omitempty"`
}

// UpdateRoleRequest represents a request to update a role
type UpdateRoleRequest struct {
	DisplayName string `json:"displayName,omitempty"`
	Description string `json:"description,omitempty"`
}

// UpdateRolePermissionsRequest represents a request to update role permissions
type UpdateRolePermissionsRequest struct {
	PermissionIDs []string `json:"permissionIds" validate:"required"`
}

// UserBrief represents a brief user info for role members
type UserBrief struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

// AssignRoleRequest represents a request to assign a role to a user
type AssignRoleRequest struct {
	RoleID string `json:"roleId" validate:"required"`
}

// CreateRole creates a new role
func (s *RoleService) CreateRole(ctx context.Context, orgID string, req CreateRoleRequest) (*RoleResponse, error) {
	// Check if role name already exists
	var existing database.Role
	if err := s.db.WithContext(ctx).Where("name = ? AND (organization_id = ? OR organization_id IS NULL OR organization_id = '')", req.Name, orgID).First(&existing).Error; err == nil {
		return nil, errors.New(errors.ErrResourceExists, "role with this name already exists")
	}

	role := database.Role{
		Name:           req.Name,
		DisplayName:    req.DisplayName,
		Description:    req.Description,
		IsSystem:       false,
		OrganizationID: orgID,
	}

	tx := s.db.WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Create(&role).Error; err != nil {
		tx.Rollback()
		return nil, errors.DatabaseError(err)
	}

	// Assign permissions if provided
	if len(req.PermissionIDs) > 0 {
		for _, permID := range req.PermissionIDs {
			rp := database.RolePermission{
				RoleID:       role.ID,
				PermissionID: permID,
				CreatedAt:    time.Now(),
			}
			if err := tx.Create(&rp).Error; err != nil {
				tx.Rollback()
				return nil, errors.DatabaseError(err)
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	return s.GetRole(ctx, role.ID)
}

// GetRole returns a role by ID
func (s *RoleService) GetRole(ctx context.Context, roleID string) (*RoleResponse, error) {
	var role database.Role
	if err := s.db.WithContext(ctx).
		Preload("Permissions").
		Where("id = ?", roleID).
		First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NotFound("role")
		}
		return nil, errors.DatabaseError(err)
	}

	var memberCount int64
	s.db.Model(&database.UserRole{}).Where("role_id = ?", roleID).Count(&memberCount)

	return toRoleResponse(role, memberCount), nil
}

// ListRoles returns all roles for an organization (including system roles)
func (s *RoleService) ListRoles(ctx context.Context, orgID string) ([]RoleResponse, error) {
	var roles []database.Role
	if err := s.db.WithContext(ctx).
		Preload("Permissions").
		Where("organization_id = ? OR organization_id IS NULL OR organization_id = '' OR is_system = true", orgID).
		Order("is_system DESC, name ASC").
		Find(&roles).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	result := make([]RoleResponse, len(roles))
	for i, role := range roles {
		var memberCount int64
		s.db.Model(&database.UserRole{}).Where("role_id = ?", role.ID).Count(&memberCount)
		result[i] = *toRoleResponse(role, memberCount)
	}

	return result, nil
}

// UpdateRole updates a role
func (s *RoleService) UpdateRole(ctx context.Context, roleID string, req UpdateRoleRequest) (*RoleResponse, error) {
	var role database.Role
	if err := s.db.WithContext(ctx).Where("id = ?", roleID).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NotFound("role")
		}
		return nil, errors.DatabaseError(err)
	}

	// Cannot update system roles
	if role.IsSystem {
		return nil, errors.New(errors.ErrForbidden, "cannot modify system roles")
	}

	updates := make(map[string]interface{})
	if req.DisplayName != "" {
		updates["display_name"] = req.DisplayName
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}

	if len(updates) > 0 {
		if err := s.db.Model(&role).Updates(updates).Error; err != nil {
			return nil, errors.DatabaseError(err)
		}
	}

	return s.GetRole(ctx, roleID)
}

// DeleteRole deletes a role
func (s *RoleService) DeleteRole(ctx context.Context, roleID string) error {
	var role database.Role
	if err := s.db.WithContext(ctx).Where("id = ?", roleID).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.NotFound("role")
		}
		return errors.DatabaseError(err)
	}

	// Cannot delete system roles
	if role.IsSystem {
		return errors.New(errors.ErrForbidden, "cannot delete system roles")
	}

	// Check if any users have this role
	var count int64
	s.db.Model(&database.UserRole{}).Where("role_id = ?", roleID).Count(&count)
	if count > 0 {
		return errors.New(errors.ErrBadRequest, "cannot delete role with assigned users")
	}

	tx := s.db.WithContext(ctx).Begin()

	// Delete role permissions
	if err := tx.Where("role_id = ?", roleID).Delete(&database.RolePermission{}).Error; err != nil {
		tx.Rollback()
		return errors.DatabaseError(err)
	}

	// Delete role
	if err := tx.Delete(&role).Error; err != nil {
		tx.Rollback()
		return errors.DatabaseError(err)
	}

	return tx.Commit().Error
}

// GetRoleMembers returns all users with a specific role
func (s *RoleService) GetRoleMembers(ctx context.Context, roleID string) ([]UserBrief, error) {
	var userRoles []database.UserRole
	if err := s.db.WithContext(ctx).Where("role_id = ?", roleID).Find(&userRoles).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	if len(userRoles) == 0 {
		return []UserBrief{}, nil
	}

	userIDs := make([]string, len(userRoles))
	for i, ur := range userRoles {
		userIDs[i] = ur.UserID
	}

	var users []database.User
	if err := s.db.WithContext(ctx).Where("id IN ?", userIDs).Find(&users).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	result := make([]UserBrief, len(users))
	for i, user := range users {
		result[i] = UserBrief{
			ID:    user.ID,
			Email: user.Email,
			Name:  user.Name,
		}
	}

	return result, nil
}

// AssignRoleToUser assigns a role to a user
func (s *RoleService) AssignRoleToUser(ctx context.Context, userID, roleID string) error {
	// Verify role exists
	var role database.Role
	if err := s.db.WithContext(ctx).Where("id = ?", roleID).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.NotFound("role")
		}
		return errors.DatabaseError(err)
	}

	// Verify user exists
	var user database.User
	if err := s.db.WithContext(ctx).Where("id = ? AND deleted_at IS NULL", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.NotFound("user")
		}
		return errors.DatabaseError(err)
	}

	// Check if assignment already exists
	var existing database.UserRole
	if err := s.db.WithContext(ctx).Where("user_id = ? AND role_id = ?", userID, roleID).First(&existing).Error; err == nil {
		return errors.New(errors.ErrResourceExists, "user already has this role")
	}

	userRole := database.UserRole{
		UserID:    userID,
		RoleID:    roleID,
		CreatedAt: time.Now(),
	}

	if err := s.db.WithContext(ctx).Create(&userRole).Error; err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

// RemoveRoleFromUser removes a role from a user
func (s *RoleService) RemoveRoleFromUser(ctx context.Context, userID, roleID string) error {
	result := s.db.WithContext(ctx).
		Where("user_id = ? AND role_id = ?", userID, roleID).
		Delete(&database.UserRole{})

	if result.RowsAffected == 0 {
		return errors.NotFound("role assignment")
	}

	return nil
}

// UpdateRolePermissions updates the permissions for a role
func (s *RoleService) UpdateRolePermissions(ctx context.Context, roleID string, permissionIDs []string) error {
	var role database.Role
	if err := s.db.WithContext(ctx).Where("id = ?", roleID).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.NotFound("role")
		}
		return errors.DatabaseError(err)
	}

	// Cannot update system roles
	if role.IsSystem {
		return errors.New(errors.ErrForbidden, "cannot modify system role permissions")
	}

	tx := s.db.WithContext(ctx).Begin()

	// Delete existing permissions
	if err := tx.Where("role_id = ?", roleID).Delete(&database.RolePermission{}).Error; err != nil {
		tx.Rollback()
		return errors.DatabaseError(err)
	}

	// Add new permissions
	for _, permID := range permissionIDs {
		rp := database.RolePermission{
			RoleID:       roleID,
			PermissionID: permID,
			CreatedAt:    time.Now(),
		}
		if err := tx.Create(&rp).Error; err != nil {
			tx.Rollback()
			return errors.DatabaseError(err)
		}
	}

	return tx.Commit().Error
}

// GetUserRoles returns all roles for a user
func (s *RoleService) GetUserRoles(ctx context.Context, userID string) ([]RoleResponse, error) {
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

	result := make([]RoleResponse, len(user.Roles))
	for i, role := range user.Roles {
		var memberCount int64
		s.db.Model(&database.UserRole{}).Where("role_id = ?", role.ID).Count(&memberCount)
		result[i] = *toRoleResponse(role, memberCount)
	}

	return result, nil
}

// Helper function to convert database role to response
func toRoleResponse(role database.Role, memberCount int64) *RoleResponse {
	permissions := make([]PermissionResponse, len(role.Permissions))
	for i, p := range role.Permissions {
		permissions[i] = PermissionResponse{
			ID:          p.ID,
			Name:        p.Name,
			Resource:    p.Resource,
			Action:      p.Action,
			Description: p.Description,
		}
	}

	return &RoleResponse{
		ID:             role.ID,
		Name:           role.Name,
		DisplayName:    role.DisplayName,
		Description:    role.Description,
		IsSystem:       role.IsSystem,
		OrganizationID: role.OrganizationID,
		Permissions:    permissions,
		MemberCount:    memberCount,
		CreatedAt:      role.CreatedAt,
		UpdatedAt:      role.UpdatedAt,
	}
}
