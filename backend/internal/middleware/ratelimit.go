package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/cloudplatform/backend/pkg/errors"
	"github.com/cloudplatform/backend/pkg/response"
)

// RateLimiter implements a simple token bucket rate limiter
type RateLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*bucket
	rate     int           // requests per interval
	interval time.Duration // interval duration
	burst    int           // max burst size
}

type bucket struct {
	tokens    int
	lastCheck time.Time
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(rate int, interval time.Duration, burst int) *RateLimiter {
	rl := &RateLimiter{
		buckets:  make(map[string]*bucket),
		rate:     rate,
		interval: interval,
		burst:    burst,
	}

	// Start cleanup goroutine
	go rl.cleanup()

	return rl
}

// Allow checks if request is allowed
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, exists := rl.buckets[key]

	if !exists {
		rl.buckets[key] = &bucket{
			tokens:    rl.burst - 1,
			lastCheck: now,
		}
		return true
	}

	// Refill tokens based on time passed
	elapsed := now.Sub(b.lastCheck)
	refill := int(elapsed / rl.interval) * rl.rate
	b.tokens = min(b.tokens+refill, rl.burst)
	b.lastCheck = now

	if b.tokens > 0 {
		b.tokens--
		return true
	}

	return false
}

// cleanup removes old buckets periodically
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		threshold := time.Now().Add(-5 * time.Minute)
		for key, b := range rl.buckets {
			if b.lastCheck.Before(threshold) {
				delete(rl.buckets, key)
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimit middleware
func RateLimit(limiter *RateLimiter, keyFunc func(*http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := keyFunc(r)
			if !limiter.Allow(key) {
				w.Header().Set("Retry-After", "60")
				response.Error(w, errors.New(errors.ErrRateLimited, "rate limit exceeded"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// IPRateLimiter returns a rate limiter keyed by IP address
func IPRateLimiter(rate int, interval time.Duration, burst int) func(http.Handler) http.Handler {
	limiter := NewRateLimiter(rate, interval, burst)
	return RateLimit(limiter, func(r *http.Request) string {
		return r.RemoteAddr
	})
}

// UserRateLimiter returns a rate limiter keyed by user ID
func UserRateLimiter(rate int, interval time.Duration, burst int) func(http.Handler) http.Handler {
	limiter := NewRateLimiter(rate, interval, burst)
	return RateLimit(limiter, func(r *http.Request) string {
		claims := GetClaims(r.Context())
		if claims != nil {
			return claims.UserID
		}
		return r.RemoteAddr
	})
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
