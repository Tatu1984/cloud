package logger

import (
	"context"
	"io"
	"log/slog"
	"os"
	"runtime"
	"time"
)

// Logger wraps slog.Logger with additional functionality
type Logger struct {
	*slog.Logger
}

// ContextKey is a custom type for context keys
type ContextKey string

const (
	RequestIDKey   ContextKey = "request_id"
	UserIDKey      ContextKey = "user_id"
	OrgIDKey       ContextKey = "org_id"
	TraceIDKey     ContextKey = "trace_id"
)

var defaultLogger *Logger

// Init initializes the logger
func Init(env string, output io.Writer) *Logger {
	if output == nil {
		output = os.Stdout
	}

	var handler slog.Handler
	opts := &slog.HandlerOptions{
		AddSource: env != "production",
		Level:     getLogLevel(env),
	}

	if env == "production" {
		// JSON format for production
		handler = slog.NewJSONHandler(output, opts)
	} else {
		// Text format for development
		handler = slog.NewTextHandler(output, opts)
	}

	logger := &Logger{
		Logger: slog.New(handler),
	}
	defaultLogger = logger
	return logger
}

// Default returns the default logger
func Default() *Logger {
	if defaultLogger == nil {
		Init("development", os.Stdout)
	}
	return defaultLogger
}

// WithContext returns a logger with context values
func (l *Logger) WithContext(ctx context.Context) *Logger {
	attrs := []any{}

	if requestID := ctx.Value(RequestIDKey); requestID != nil {
		attrs = append(attrs, "request_id", requestID)
	}
	if userID := ctx.Value(UserIDKey); userID != nil {
		attrs = append(attrs, "user_id", userID)
	}
	if orgID := ctx.Value(OrgIDKey); orgID != nil {
		attrs = append(attrs, "org_id", orgID)
	}
	if traceID := ctx.Value(TraceIDKey); traceID != nil {
		attrs = append(attrs, "trace_id", traceID)
	}

	return &Logger{
		Logger: l.Logger.With(attrs...),
	}
}

// WithFields returns a logger with additional fields
func (l *Logger) WithFields(fields map[string]any) *Logger {
	attrs := make([]any, 0, len(fields)*2)
	for k, v := range fields {
		attrs = append(attrs, k, v)
	}
	return &Logger{
		Logger: l.Logger.With(attrs...),
	}
}

// WithError returns a logger with error field
func (l *Logger) WithError(err error) *Logger {
	return &Logger{
		Logger: l.Logger.With("error", err.Error()),
	}
}

// RequestLog logs an HTTP request
func (l *Logger) RequestLog(method, path string, statusCode int, duration time.Duration, clientIP string) {
	l.Info("http request",
		"method", method,
		"path", path,
		"status", statusCode,
		"duration_ms", duration.Milliseconds(),
		"client_ip", clientIP,
	)
}

// DBLog logs a database operation
func (l *Logger) DBLog(operation string, table string, duration time.Duration, err error) {
	attrs := []any{
		"operation", operation,
		"table", table,
		"duration_ms", duration.Milliseconds(),
	}
	if err != nil {
		attrs = append(attrs, "error", err.Error())
		l.Error("database operation failed", attrs...)
	} else {
		l.Debug("database operation", attrs...)
	}
}

// InfraLog logs infrastructure operations
func (l *Logger) InfraLog(service, operation string, resourceID string, err error) {
	attrs := []any{
		"service", service,
		"operation", operation,
		"resource_id", resourceID,
	}
	if err != nil {
		attrs = append(attrs, "error", err.Error())
		l.Error("infrastructure operation failed", attrs...)
	} else {
		l.Info("infrastructure operation", attrs...)
	}
}

// AuditLog logs audit events
func (l *Logger) AuditLog(userID, action, resource, resourceID string, details map[string]any) {
	l.Info("audit",
		"user_id", userID,
		"action", action,
		"resource", resource,
		"resource_id", resourceID,
		"details", details,
	)
}

// getCaller returns the caller's file and line number
func getCaller(skip int) (string, int) {
	_, file, line, ok := runtime.Caller(skip)
	if !ok {
		return "unknown", 0
	}
	return file, line
}

func getLogLevel(env string) slog.Level {
	switch env {
	case "production":
		return slog.LevelInfo
	case "development":
		return slog.LevelDebug
	default:
		return slog.LevelDebug
	}
}

// Convenience methods for default logger
func Info(msg string, args ...any)  { Default().Info(msg, args...) }
func Debug(msg string, args ...any) { Default().Debug(msg, args...) }
func Warn(msg string, args ...any)  { Default().Warn(msg, args...) }
func Error(msg string, args ...any) { Default().Error(msg, args...) }

// Fatal logs a message and exits
func Fatal(msg string, args ...any) {
	Default().Error(msg, args...)
	os.Exit(1)
}
