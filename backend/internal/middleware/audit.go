package middleware

import (
	"bytes"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/cloudplatform/backend/pkg/logger"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

// AuditConfig configures audit logging behavior
type AuditConfig struct {
	// SkipPaths are paths that should not be audited (e.g., health checks)
	SkipPaths []string
	// LogRequestBody enables logging of request bodies (be careful with sensitive data)
	LogRequestBody bool
	// MaxBodySize limits the size of logged request bodies
	MaxBodySize int
}

// DefaultAuditConfig returns sensible defaults
func DefaultAuditConfig() *AuditConfig {
	return &AuditConfig{
		SkipPaths:      []string{"/health", "/ready", "/live", "/metrics"},
		LogRequestBody: false,
		MaxBodySize:    1024,
	}
}

// AuditLogger logs all API requests with relevant context for security auditing
func AuditLogger(log *logger.Logger, cfg *AuditConfig) func(http.Handler) http.Handler {
	if cfg == nil {
		cfg = DefaultAuditConfig()
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip configured paths
			for _, path := range cfg.SkipPaths {
				if strings.HasPrefix(r.URL.Path, path) {
					next.ServeHTTP(w, r)
					return
				}
			}

			start := time.Now()
			requestID := chimiddleware.GetReqID(r.Context())

			// Capture request body if configured
			var requestBody string
			if cfg.LogRequestBody && r.Body != nil {
				bodyBytes, _ := io.ReadAll(io.LimitReader(r.Body, int64(cfg.MaxBodySize)))
				requestBody = string(bodyBytes)
				// Restore the body for downstream handlers
				r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			}

			// Wrap response writer to capture status code
			wrapped := &auditResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}

			// Execute handler
			next.ServeHTTP(wrapped, r)

			// Extract user context
			userID := GetUserID(r.Context())
			orgID := GetOrganizationID(r.Context())

			// Get route pattern if available
			routePattern := chi.RouteContext(r.Context()).RoutePattern()
			if routePattern == "" {
				routePattern = r.URL.Path
			}

			// Build audit log entry
			fields := []any{
				"type", "audit",
				"request_id", requestID,
				"method", r.Method,
				"path", r.URL.Path,
				"route", routePattern,
				"status", wrapped.statusCode,
				"duration_ms", time.Since(start).Milliseconds(),
				"ip", r.RemoteAddr,
				"user_agent", r.UserAgent(),
			}

			if userID != "" {
				fields = append(fields, "user_id", userID)
			}
			if orgID != "" {
				fields = append(fields, "org_id", orgID)
			}
			if requestBody != "" && !containsSensitiveData(r.URL.Path) {
				fields = append(fields, "request_body", truncate(requestBody, cfg.MaxBodySize))
			}

			// Log based on status code
			if wrapped.statusCode >= 500 {
				log.Error("API request failed", fields...)
			} else if wrapped.statusCode >= 400 {
				log.Warn("API request error", fields...)
			} else {
				log.Info("API request", fields...)
			}
		})
	}
}

type auditResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *auditResponseWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

// containsSensitiveData checks if the path likely contains sensitive data
func containsSensitiveData(path string) bool {
	sensitive := []string{"/auth/login", "/auth/register", "/auth/change-password", "/password"}
	for _, s := range sensitive {
		if strings.Contains(path, s) {
			return true
		}
	}
	return false
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
