package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/cloudplatform/backend/internal/auth"
	"github.com/cloudplatform/backend/internal/config"
	"github.com/cloudplatform/backend/pkg/errors"
	"github.com/cloudplatform/backend/pkg/response"
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
