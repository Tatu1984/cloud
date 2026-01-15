package metrics

import (
	"net/http"
	"runtime"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
)

// Metrics holds application metrics
type Metrics struct {
	mu sync.RWMutex

	// HTTP metrics
	httpRequestsTotal   map[string]*uint64
	httpRequestDuration map[string]*durationMetric

	// System metrics
	startTime time.Time

	// Business metrics
	activeUsers    uint64
	totalVMs       uint64
	totalProjects  uint64
}

type durationMetric struct {
	count uint64
	sum   uint64 // in microseconds
}

var instance *Metrics
var once sync.Once

// Get returns the singleton metrics instance
func Get() *Metrics {
	once.Do(func() {
		instance = &Metrics{
			httpRequestsTotal:   make(map[string]*uint64),
			httpRequestDuration: make(map[string]*durationMetric),
			startTime:           time.Now(),
		}
	})
	return instance
}

// RecordRequest records an HTTP request metric
func (m *Metrics) RecordRequest(method, path string, statusCode int, duration time.Duration) {
	key := method + "_" + path + "_" + strconv.Itoa(statusCode)

	m.mu.Lock()
	if m.httpRequestsTotal[key] == nil {
		var v uint64
		m.httpRequestsTotal[key] = &v
	}
	if m.httpRequestDuration[key] == nil {
		m.httpRequestDuration[key] = &durationMetric{}
	}
	m.mu.Unlock()

	atomic.AddUint64(m.httpRequestsTotal[key], 1)

	m.mu.RLock()
	dm := m.httpRequestDuration[key]
	m.mu.RUnlock()

	atomic.AddUint64(&dm.count, 1)
	atomic.AddUint64(&dm.sum, uint64(duration.Microseconds()))
}

// SetActiveUsers sets the active users gauge
func (m *Metrics) SetActiveUsers(count uint64) {
	atomic.StoreUint64(&m.activeUsers, count)
}

// SetTotalVMs sets the total VMs gauge
func (m *Metrics) SetTotalVMs(count uint64) {
	atomic.StoreUint64(&m.totalVMs, count)
}

// SetTotalProjects sets the total projects gauge
func (m *Metrics) SetTotalProjects(count uint64) {
	atomic.StoreUint64(&m.totalProjects, count)
}

// Handler returns an HTTP handler that exposes metrics in Prometheus format
func (m *Metrics) Handler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")

		// Runtime metrics
		var memStats runtime.MemStats
		runtime.ReadMemStats(&memStats)

		// Write metrics in Prometheus format
		writeMetric(w, "# HELP go_goroutines Number of goroutines")
		writeMetric(w, "# TYPE go_goroutines gauge")
		writeMetric(w, "go_goroutines "+strconv.Itoa(runtime.NumGoroutine()))

		writeMetric(w, "# HELP go_memstats_alloc_bytes Number of bytes allocated")
		writeMetric(w, "# TYPE go_memstats_alloc_bytes gauge")
		writeMetric(w, "go_memstats_alloc_bytes "+strconv.FormatUint(memStats.Alloc, 10))

		writeMetric(w, "# HELP go_memstats_heap_objects Number of heap objects")
		writeMetric(w, "# TYPE go_memstats_heap_objects gauge")
		writeMetric(w, "go_memstats_heap_objects "+strconv.FormatUint(memStats.HeapObjects, 10))

		writeMetric(w, "# HELP process_uptime_seconds Process uptime in seconds")
		writeMetric(w, "# TYPE process_uptime_seconds gauge")
		writeMetric(w, "process_uptime_seconds "+strconv.FormatFloat(time.Since(m.startTime).Seconds(), 'f', 2, 64))

		// Business metrics
		writeMetric(w, "# HELP cloudplatform_active_users Number of active users")
		writeMetric(w, "# TYPE cloudplatform_active_users gauge")
		writeMetric(w, "cloudplatform_active_users "+strconv.FormatUint(atomic.LoadUint64(&m.activeUsers), 10))

		writeMetric(w, "# HELP cloudplatform_total_vms Total number of VMs")
		writeMetric(w, "# TYPE cloudplatform_total_vms gauge")
		writeMetric(w, "cloudplatform_total_vms "+strconv.FormatUint(atomic.LoadUint64(&m.totalVMs), 10))

		writeMetric(w, "# HELP cloudplatform_total_projects Total number of projects")
		writeMetric(w, "# TYPE cloudplatform_total_projects gauge")
		writeMetric(w, "cloudplatform_total_projects "+strconv.FormatUint(atomic.LoadUint64(&m.totalProjects), 10))

		// HTTP request metrics
		writeMetric(w, "# HELP http_requests_total Total HTTP requests")
		writeMetric(w, "# TYPE http_requests_total counter")
		m.mu.RLock()
		for key, count := range m.httpRequestsTotal {
			writeMetric(w, "http_requests_total{endpoint=\""+key+"\"} "+strconv.FormatUint(atomic.LoadUint64(count), 10))
		}
		m.mu.RUnlock()
	}
}

func writeMetric(w http.ResponseWriter, line string) {
	w.Write([]byte(line + "\n"))
}

// Middleware records HTTP request metrics
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap response writer to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		// Record metrics
		Get().RecordRequest(r.Method, r.URL.Path, wrapped.statusCode, time.Since(start))
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *responseWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}
