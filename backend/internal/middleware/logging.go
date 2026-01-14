package middleware

import (
	"net/http"
	"time"

	"github.com/cloudplatform/backend/pkg/logger"
	"github.com/go-chi/chi/v5/middleware"
)

// RequestLogger logs HTTP requests
func RequestLogger(log *logger.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Wrap response writer to capture status code
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			// Process request
			next.ServeHTTP(ww, r)

			// Log request
			duration := time.Since(start)
			log.RequestLog(
				r.Method,
				r.URL.Path,
				ww.Status(),
				duration,
				r.RemoteAddr,
			)
		})
	}
}

// ContextLogger adds logger to request context
func ContextLogger(log *logger.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Add request ID to logger context
			requestID := middleware.GetReqID(r.Context())
			reqLog := log.WithFields(map[string]any{"request_id": requestID})

			// Add user info if available
			claims := GetClaims(r.Context())
			if claims != nil {
				reqLog = reqLog.WithFields(map[string]any{
					"user_id": claims.UserID,
					"org_id":  claims.OrganizationID,
				})
			}

			next.ServeHTTP(w, r)
		})
	}
}
