package health

import (
	"context"
	"net/http"
	"sync"
	"time"

	"gorm.io/gorm"
)

// Status represents the health status of a component
type Status string

const (
	StatusHealthy   Status = "healthy"
	StatusUnhealthy Status = "unhealthy"
	StatusDegraded  Status = "degraded"
)

// ComponentHealth represents the health of a single component
type ComponentHealth struct {
	Status  Status `json:"status"`
	Message string `json:"message,omitempty"`
	Latency string `json:"latency,omitempty"`
}

// HealthResponse represents the overall health response
type HealthResponse struct {
	Status     Status                     `json:"status"`
	Version    string                     `json:"version"`
	Timestamp  string                     `json:"timestamp"`
	Components map[string]ComponentHealth `json:"components"`
}

// Checker performs health checks on dependencies
type Checker struct {
	db      *gorm.DB
	version string
}

// NewChecker creates a new health checker
func NewChecker(db *gorm.DB, version string) *Checker {
	return &Checker{
		db:      db,
		version: version,
	}
}

// Check performs health checks on all components
func (c *Checker) Check(ctx context.Context) *HealthResponse {
	resp := &HealthResponse{
		Status:     StatusHealthy,
		Version:    c.version,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Components: make(map[string]ComponentHealth),
	}

	var wg sync.WaitGroup
	var mu sync.Mutex

	// Check database
	wg.Add(1)
	go func() {
		defer wg.Done()
		health := c.checkDatabase(ctx)
		mu.Lock()
		resp.Components["database"] = health
		if health.Status == StatusUnhealthy {
			resp.Status = StatusUnhealthy
		} else if health.Status == StatusDegraded && resp.Status == StatusHealthy {
			resp.Status = StatusDegraded
		}
		mu.Unlock()
	}()

	wg.Wait()
	return resp
}

// checkDatabase checks database connectivity
func (c *Checker) checkDatabase(ctx context.Context) ComponentHealth {
	if c.db == nil {
		return ComponentHealth{
			Status:  StatusUnhealthy,
			Message: "database connection not configured",
		}
	}

	start := time.Now()
	sqlDB, err := c.db.DB()
	if err != nil {
		return ComponentHealth{
			Status:  StatusUnhealthy,
			Message: "failed to get database connection: " + err.Error(),
		}
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		return ComponentHealth{
			Status:  StatusUnhealthy,
			Message: "database ping failed: " + err.Error(),
		}
	}

	latency := time.Since(start)

	// Consider slow responses as degraded
	if latency > 1*time.Second {
		return ComponentHealth{
			Status:  StatusDegraded,
			Message: "database responding slowly",
			Latency: latency.String(),
		}
	}

	return ComponentHealth{
		Status:  StatusHealthy,
		Latency: latency.String(),
	}
}

// Handler returns an HTTP handler for health checks
func (c *Checker) Handler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp := c.Check(r.Context())

		w.Header().Set("Content-Type", "application/json")

		// Return appropriate status code based on health
		switch resp.Status {
		case StatusUnhealthy:
			w.WriteHeader(http.StatusServiceUnavailable)
		case StatusDegraded:
			w.WriteHeader(http.StatusOK) // Still return 200 for degraded
		default:
			w.WriteHeader(http.StatusOK)
		}

		// Simple JSON encoding
		w.Write([]byte(`{"status":"` + string(resp.Status) + `","version":"` + resp.Version + `","timestamp":"` + resp.Timestamp + `","components":{`))

		first := true
		for name, comp := range resp.Components {
			if !first {
				w.Write([]byte(","))
			}
			first = false
			w.Write([]byte(`"` + name + `":{"status":"` + string(comp.Status) + `"`))
			if comp.Message != "" {
				w.Write([]byte(`,"message":"` + comp.Message + `"`))
			}
			if comp.Latency != "" {
				w.Write([]byte(`,"latency":"` + comp.Latency + `"`))
			}
			w.Write([]byte("}"))
		}
		w.Write([]byte("}}"))
	}
}

// LivenessHandler returns a simple liveness probe handler
func LivenessHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"alive"}`))
	}
}

// ReadinessHandler returns a readiness probe handler that checks critical dependencies
func (c *Checker) ReadinessHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp := c.Check(r.Context())

		w.Header().Set("Content-Type", "application/json")

		if resp.Status == StatusUnhealthy {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"ready":false}`))
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ready":true}`))
	}
}
