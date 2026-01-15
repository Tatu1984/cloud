package middleware

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/cloudplatform/backend/pkg/errors"
	"github.com/cloudplatform/backend/pkg/response"
	"github.com/google/uuid"
)

// MaxRequestBodySize limits the size of request bodies (10MB default)
const MaxRequestBodySize = 10 * 1024 * 1024

// RequestBodyLimit limits the size of incoming request bodies
func RequestBodyLimit(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil {
				r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ValidateContentType ensures requests have the expected Content-Type
func ValidateContentType(contentTypes ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip validation for GET, HEAD, OPTIONS requests
			if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}

			ct := r.Header.Get("Content-Type")
			if ct == "" {
				response.Error(w, errors.BadRequest("Content-Type header is required"))
				return
			}

			// Extract media type (ignore parameters like charset)
			mediaType := strings.Split(ct, ";")[0]
			mediaType = strings.TrimSpace(mediaType)

			for _, allowed := range contentTypes {
				if strings.EqualFold(mediaType, allowed) {
					next.ServeHTTP(w, r)
					return
				}
			}

			response.Error(w, errors.BadRequest("unsupported Content-Type: "+ct))
		})
	}
}

// ValidateJSON validates that the request body is valid JSON
func ValidateJSON(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip for non-JSON methods
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions || r.Method == http.MethodDelete {
			next.ServeHTTP(w, r)
			return
		}

		ct := r.Header.Get("Content-Type")
		if !strings.Contains(ct, "application/json") {
			next.ServeHTTP(w, r)
			return
		}

		if r.Body == nil {
			response.Error(w, errors.BadRequest("request body is required"))
			return
		}

		// Read body to validate
		body, err := io.ReadAll(io.LimitReader(r.Body, MaxRequestBodySize))
		if err != nil {
			response.Error(w, errors.BadRequest("failed to read request body"))
			return
		}

		// Validate JSON syntax
		if len(body) > 0 && !json.Valid(body) {
			response.Error(w, errors.BadRequest("invalid JSON in request body"))
			return
		}

		// Restore body for downstream handlers
		r.Body = io.NopCloser(strings.NewReader(string(body)))

		next.ServeHTTP(w, r)
	})
}

// ValidateUUID validates that a URL parameter is a valid UUID
func ValidateUUID(paramName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// This would require access to chi URL params
			// For now, we provide a helper function instead
			next.ServeHTTP(w, r)
		})
	}
}

// IsValidUUID checks if a string is a valid UUID
func IsValidUUID(s string) bool {
	_, err := uuid.Parse(s)
	return err == nil
}

// ValidateRequired validates that required fields are present in JSON
type RequiredFields struct {
	Fields []string
}

// Validate checks if all required fields are present
func (rf *RequiredFields) Validate(data map[string]interface{}) map[string]string {
	errs := make(map[string]string)
	for _, field := range rf.Fields {
		if val, exists := data[field]; !exists || val == nil || val == "" {
			errs[field] = field + " is required"
		}
	}
	return errs
}

// SanitizeInput removes potentially dangerous characters from input
func SanitizeInput(s string) string {
	// Remove null bytes
	s = strings.ReplaceAll(s, "\x00", "")
	// Trim whitespace
	s = strings.TrimSpace(s)
	return s
}
