package auth

import (
	"sync"
	"time"
)

// TokenBlacklist manages revoked tokens
// In production, this should be backed by Redis for distributed deployments
type TokenBlacklist struct {
	mu     sync.RWMutex
	tokens map[string]time.Time // token -> expiration time
}

var (
	blacklist     *TokenBlacklist
	blacklistOnce sync.Once
)

// GetBlacklist returns the singleton token blacklist
func GetBlacklist() *TokenBlacklist {
	blacklistOnce.Do(func() {
		blacklist = &TokenBlacklist{
			tokens: make(map[string]time.Time),
		}
		// Start cleanup goroutine
		go blacklist.cleanup()
	})
	return blacklist
}

// Add adds a token to the blacklist
func (b *TokenBlacklist) Add(tokenID string, expiresAt time.Time) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.tokens[tokenID] = expiresAt
}

// IsBlacklisted checks if a token is blacklisted
func (b *TokenBlacklist) IsBlacklisted(tokenID string) bool {
	b.mu.RLock()
	defer b.mu.RUnlock()

	exp, exists := b.tokens[tokenID]
	if !exists {
		return false
	}

	// If token has expired, it's effectively not blacklisted anymore
	// (it's invalid anyway due to expiration)
	if time.Now().After(exp) {
		return false
	}

	return true
}

// Remove removes a token from the blacklist
func (b *TokenBlacklist) Remove(tokenID string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	delete(b.tokens, tokenID)
}

// cleanup periodically removes expired tokens from the blacklist
func (b *TokenBlacklist) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		b.mu.Lock()
		now := time.Now()
		for tokenID, exp := range b.tokens {
			if now.After(exp) {
				delete(b.tokens, tokenID)
			}
		}
		b.mu.Unlock()
	}
}

// Count returns the number of blacklisted tokens (for monitoring)
func (b *TokenBlacklist) Count() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.tokens)
}

// Clear removes all tokens from the blacklist (use with caution)
func (b *TokenBlacklist) Clear() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.tokens = make(map[string]time.Time)
}
