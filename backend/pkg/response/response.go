package response

import (
	"encoding/json"
	"net/http"

	"github.com/cloudplatform/backend/pkg/errors"
)

// Response represents a standard API response
type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *ErrorBody  `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

// ErrorBody represents the error portion of a response
type ErrorBody struct {
	Code    errors.ErrorCode  `json:"code"`
	Message string            `json:"message"`
	Details string            `json:"details,omitempty"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// Meta represents pagination and other metadata
type Meta struct {
	Page       int   `json:"page,omitempty"`
	PerPage    int   `json:"perPage,omitempty"`
	Total      int64 `json:"total,omitempty"`
	TotalPages int   `json:"totalPages,omitempty"`
}

// JSON sends a JSON response
func JSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := Response{
		Success: statusCode >= 200 && statusCode < 300,
		Data:    data,
	}

	json.NewEncoder(w).Encode(response)
}

// JSONWithMeta sends a JSON response with metadata
func JSONWithMeta(w http.ResponseWriter, statusCode int, data interface{}, meta *Meta) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := Response{
		Success: statusCode >= 200 && statusCode < 300,
		Data:    data,
		Meta:    meta,
	}

	json.NewEncoder(w).Encode(response)
}

// Error sends an error response
func Error(w http.ResponseWriter, err error) {
	appErr := errors.GetAppError(err)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.StatusCode)

	response := Response{
		Success: false,
		Error: &ErrorBody{
			Code:    appErr.Code,
			Message: appErr.Message,
			Details: appErr.Details,
			Fields:  appErr.Fields,
		},
	}

	json.NewEncoder(w).Encode(response)
}

// OK sends a 200 OK response
func OK(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, data)
}

// Created sends a 201 Created response
func Created(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusCreated, data)
}

// NoContent sends a 204 No Content response
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

// BadRequest sends a 400 Bad Request response
func BadRequest(w http.ResponseWriter, message string) {
	Error(w, errors.BadRequest(message))
}

// Unauthorized sends a 401 Unauthorized response
func Unauthorized(w http.ResponseWriter, message string) {
	Error(w, errors.Unauthorized(message))
}

// Forbidden sends a 403 Forbidden response
func Forbidden(w http.ResponseWriter, message string) {
	Error(w, errors.Forbidden(message))
}

// NotFound sends a 404 Not Found response
func NotFound(w http.ResponseWriter, resource string) {
	Error(w, errors.NotFound(resource))
}

// InternalError sends a 500 Internal Server Error response
func InternalError(w http.ResponseWriter, message string) {
	Error(w, errors.Internal(message))
}

// Paginated sends a paginated response
func Paginated(w http.ResponseWriter, data interface{}, page, perPage int, total int64) {
	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	meta := &Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	}

	JSONWithMeta(w, http.StatusOK, data, meta)
}
