package errors

import (
	"fmt"
	"net/http"
)

// ErrorCode represents application error codes
type ErrorCode string

const (
	// General errors
	ErrInternal          ErrorCode = "INTERNAL_ERROR"
	ErrBadRequest        ErrorCode = "BAD_REQUEST"
	ErrNotFound          ErrorCode = "NOT_FOUND"
	ErrConflict          ErrorCode = "CONFLICT"
	ErrValidation        ErrorCode = "VALIDATION_ERROR"
	ErrRateLimited       ErrorCode = "RATE_LIMITED"

	// Authentication errors
	ErrUnauthorized      ErrorCode = "UNAUTHORIZED"
	ErrForbidden         ErrorCode = "FORBIDDEN"
	ErrInvalidToken      ErrorCode = "INVALID_TOKEN"
	ErrTokenExpired      ErrorCode = "TOKEN_EXPIRED"
	ErrInvalidCredentials ErrorCode = "INVALID_CREDENTIALS"

	// Resource errors
	ErrResourceNotFound  ErrorCode = "RESOURCE_NOT_FOUND"
	ErrResourceExists    ErrorCode = "RESOURCE_EXISTS"
	ErrQuotaExceeded     ErrorCode = "QUOTA_EXCEEDED"

	// Infrastructure errors
	ErrProxmoxAPI        ErrorCode = "PROXMOX_API_ERROR"
	ErrZeroTierAPI       ErrorCode = "ZEROTIER_API_ERROR"
	ErrCephAPI           ErrorCode = "CEPH_API_ERROR"
	ErrDatabaseError     ErrorCode = "DATABASE_ERROR"
)

// AppError represents a structured application error
type AppError struct {
	Code       ErrorCode         `json:"code"`
	Message    string            `json:"message"`
	Details    string            `json:"details,omitempty"`
	StatusCode int               `json:"-"`
	Err        error             `json:"-"`
	Fields     map[string]string `json:"fields,omitempty"`
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s - %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Unwrap returns the underlying error
func (e *AppError) Unwrap() error {
	return e.Err
}

// New creates a new AppError
func New(code ErrorCode, message string) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: getStatusCode(code),
	}
}

// Wrap wraps an existing error
func Wrap(err error, code ErrorCode, message string) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: getStatusCode(code),
		Err:        err,
	}
}

// WithDetails adds details to the error
func (e *AppError) WithDetails(details string) *AppError {
	e.Details = details
	return e
}

// WithFields adds field-specific errors (for validation)
func (e *AppError) WithFields(fields map[string]string) *AppError {
	e.Fields = fields
	return e
}

// Common error constructors
func Internal(message string) *AppError {
	return New(ErrInternal, message)
}

func BadRequest(message string) *AppError {
	return New(ErrBadRequest, message)
}

func NotFound(resource string) *AppError {
	return New(ErrResourceNotFound, fmt.Sprintf("%s not found", resource))
}

func Unauthorized(message string) *AppError {
	return New(ErrUnauthorized, message)
}

func Forbidden(message string) *AppError {
	return New(ErrForbidden, message)
}

func Conflict(message string) *AppError {
	return New(ErrConflict, message)
}

func Validation(fields map[string]string) *AppError {
	return New(ErrValidation, "Validation failed").WithFields(fields)
}

func QuotaExceeded(resource string, limit int) *AppError {
	return New(ErrQuotaExceeded, fmt.Sprintf("Quota exceeded for %s (limit: %d)", resource, limit))
}

func DatabaseError(err error) *AppError {
	return Wrap(err, ErrDatabaseError, "Database operation failed")
}

func ProxmoxError(err error, operation string) *AppError {
	return Wrap(err, ErrProxmoxAPI, fmt.Sprintf("Proxmox operation failed: %s", operation))
}

func ZeroTierError(err error, operation string) *AppError {
	return Wrap(err, ErrZeroTierAPI, fmt.Sprintf("ZeroTier operation failed: %s", operation))
}

func CephError(err error, operation string) *AppError {
	return Wrap(err, ErrCephAPI, fmt.Sprintf("Ceph operation failed: %s", operation))
}

// getStatusCode maps error codes to HTTP status codes
func getStatusCode(code ErrorCode) int {
	switch code {
	case ErrBadRequest, ErrValidation:
		return http.StatusBadRequest
	case ErrUnauthorized, ErrInvalidToken, ErrTokenExpired, ErrInvalidCredentials:
		return http.StatusUnauthorized
	case ErrForbidden:
		return http.StatusForbidden
	case ErrNotFound, ErrResourceNotFound:
		return http.StatusNotFound
	case ErrConflict, ErrResourceExists:
		return http.StatusConflict
	case ErrQuotaExceeded:
		return http.StatusPaymentRequired
	case ErrRateLimited:
		return http.StatusTooManyRequests
	default:
		return http.StatusInternalServerError
	}
}

// IsAppError checks if an error is an AppError
func IsAppError(err error) bool {
	_, ok := err.(*AppError)
	return ok
}

// GetAppError extracts AppError from error
func GetAppError(err error) *AppError {
	if appErr, ok := err.(*AppError); ok {
		return appErr
	}
	return Internal(err.Error())
}
