package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/cloudplatform/backend/internal/auth"
	"github.com/cloudplatform/backend/internal/config"
	"github.com/cloudplatform/backend/internal/database"
	"github.com/cloudplatform/backend/pkg/errors"
	"github.com/cloudplatform/backend/pkg/response"
	"gorm.io/gorm"
)

// ContextKey type for context keys
type ContextKey string

const (
	UserKey    ContextKey = "user"
	ClaimsKey  ContextKey = "claims"
)

// AuthMiddleware handles JWT authentication
type AuthMiddleware struct {
	jwtService *auth.JWTService
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(cfg *config.JWTConfig) *AuthMiddleware {
	return &AuthMiddleware{
		jwtService: auth.NewJWTService(cfg),
	}
}

// Authenticate validates JWT tokens
func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			response.Error(w, errors.Unauthorized("missing authorization header"))
			return
		}

		// Check for Bearer token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			response.Error(w, errors.Unauthorized("invalid authorization header format"))
			return
		}

		tokenString := parts[1]

		// Validate token
		claims, err := m.jwtService.ValidateAccessToken(tokenString)
		if err != nil {
			response.Error(w, errors.New(errors.ErrInvalidToken, err.Error()))
			return
		}

		// Add claims to context
		ctx := context.WithValue(r.Context(), ClaimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OptionalAuth allows requests without authentication but adds claims if present
func (m *AuthMiddleware) OptionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				claims, err := m.jwtService.ValidateAccessToken(parts[1])
				if err == nil {
					ctx := context.WithValue(r.Context(), ClaimsKey, claims)
					r = r.WithContext(ctx)
				}
			}
		}
		next.ServeHTTP(w, r)
	})
}

// RequireRole checks if user has required role
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r.Context())
			if claims == nil {
				response.Error(w, errors.Unauthorized("authentication required"))
				return
			}

			hasRole := false
			for _, required := range roles {
				for _, userRole := range claims.Roles {
					if userRole == required || userRole == "admin" {
						hasRole = true
						break
					}
				}
				if hasRole {
					break
				}
			}

			if !hasRole {
				response.Error(w, errors.Forbidden("insufficient permissions"))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireAdmin checks if user is admin
func RequireAdmin(next http.Handler) http.Handler {
	return RequireRole("admin")(next)
}

// GetClaims extracts claims from context
func GetClaims(ctx context.Context) *auth.Claims {
	claims, ok := ctx.Value(ClaimsKey).(*auth.Claims)
	if !ok {
		return nil
	}
	return claims
}

// GetUserID extracts user ID from context
func GetUserID(ctx context.Context) string {
	claims := GetClaims(ctx)
	if claims == nil {
		return ""
	}
	return claims.UserID
}

// GetOrganizationID extracts organization ID from context
func GetOrganizationID(ctx context.Context) string {
	claims := GetClaims(ctx)
	if claims == nil {
		return ""
	}
	return claims.OrganizationID
}

// HasRole checks if user has specific role
func HasRole(ctx context.Context, role string) bool {
	claims := GetClaims(ctx)
	if claims == nil {
		return false
	}
	for _, r := range claims.Roles {
		if r == role || r == "admin" {
			return true
		}
	}
	return false
}

// IsAdmin checks if user is admin
func IsAdmin(ctx context.Context) bool {
	return HasRole(ctx, "admin")
}

// PermissionChecker provides permission checking functionality
type PermissionChecker struct {
	db *gorm.DB
}

// NewPermissionChecker creates a new permission checker
func NewPermissionChecker(db *gorm.DB) *PermissionChecker {
	return &PermissionChecker{db: db}
}

// RequirePermission checks if user has the required permission
func (pc *PermissionChecker) RequirePermission(permission string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r.Context())
			if claims == nil {
				response.Error(w, errors.Unauthorized("authentication required"))
				return
			}

			// Admin role bypasses permission checks
			for _, role := range claims.Roles {
				if role == "admin" || role == "super_admin" {
					next.ServeHTTP(w, r)
					return
				}
			}

			// Check if user has the required permission
			hasPermission, err := pc.hasPermission(r.Context(), claims.UserID, permission)
			if err != nil {
				response.Error(w, errors.Internal("failed to check permissions"))
				return
			}

			if !hasPermission {
				response.Error(w, errors.Forbidden("insufficient permissions: requires "+permission))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireAnyPermission checks if user has any of the required permissions
func (pc *PermissionChecker) RequireAnyPermission(permissions ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r.Context())
			if claims == nil {
				response.Error(w, errors.Unauthorized("authentication required"))
				return
			}

			// Admin role bypasses permission checks
			for _, role := range claims.Roles {
				if role == "admin" || role == "super_admin" {
					next.ServeHTTP(w, r)
					return
				}
			}

			// Check if user has any of the required permissions
			for _, permission := range permissions {
				hasPermission, err := pc.hasPermission(r.Context(), claims.UserID, permission)
				if err != nil {
					continue
				}
				if hasPermission {
					next.ServeHTTP(w, r)
					return
				}
			}

			response.Error(w, errors.Forbidden("insufficient permissions"))
			return
		})
	}
}

// hasPermission checks if a user has a specific permission
func (pc *PermissionChecker) hasPermission(ctx context.Context, userID, permissionName string) (bool, error) {
	// Get user with roles and permissions
	var user database.User
	if err := pc.db.WithContext(ctx).
		Preload("Roles").
		Preload("Roles.Permissions").
		Where("id = ? AND deleted_at IS NULL", userID).
		First(&user).Error; err != nil {
		return false, err
	}

	// Check each role's permissions
	for _, role := range user.Roles {
		for _, perm := range role.Permissions {
			if perm.Name == permissionName {
				return true, nil
			}
			// Check for wildcard permissions (e.g., "vm:*" matches "vm:create")
			if len(perm.Name) > 2 && perm.Name[len(perm.Name)-2:] == ":*" {
				resource := perm.Name[:len(perm.Name)-2]
				if len(permissionName) > len(resource)+1 && permissionName[:len(resource)+1] == resource+":" {
					return true, nil
				}
			}
		}
	}

	return false, nil
}

// GetUserPermissions returns all permissions for the current user
func (pc *PermissionChecker) GetUserPermissions(ctx context.Context, userID string) ([]string, error) {
	var user database.User
	if err := pc.db.WithContext(ctx).
		Preload("Roles").
		Preload("Roles.Permissions").
		Where("id = ? AND deleted_at IS NULL", userID).
		First(&user).Error; err != nil {
		return nil, err
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
