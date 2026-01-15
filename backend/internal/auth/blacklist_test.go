package auth

import (
	"testing"
	"time"
)

func TestTokenBlacklist_AddAndCheck(t *testing.T) {
	// Get fresh blacklist
	bl := GetBlacklist()
	bl.Clear()

	tokenID := "test-token-123"
	expiresAt := time.Now().Add(1 * time.Hour)

	// Token should not be blacklisted initially
	if bl.IsBlacklisted(tokenID) {
		t.Error("token should not be blacklisted initially")
	}

	// Add to blacklist
	bl.Add(tokenID, expiresAt)

	// Token should now be blacklisted
	if !bl.IsBlacklisted(tokenID) {
		t.Error("token should be blacklisted after adding")
	}

	// Count should be 1
	if bl.Count() != 1 {
		t.Errorf("expected count 1, got %d", bl.Count())
	}
}

func TestTokenBlacklist_Remove(t *testing.T) {
	bl := GetBlacklist()
	bl.Clear()

	tokenID := "test-token-456"
	expiresAt := time.Now().Add(1 * time.Hour)

	bl.Add(tokenID, expiresAt)

	if !bl.IsBlacklisted(tokenID) {
		t.Error("token should be blacklisted")
	}

	bl.Remove(tokenID)

	if bl.IsBlacklisted(tokenID) {
		t.Error("token should not be blacklisted after removal")
	}
}

func TestTokenBlacklist_ExpiredToken(t *testing.T) {
	bl := GetBlacklist()
	bl.Clear()

	tokenID := "test-token-expired"
	// Set expiration in the past
	expiresAt := time.Now().Add(-1 * time.Hour)

	bl.Add(tokenID, expiresAt)

	// Expired token should not be considered blacklisted
	// (it's invalid anyway due to JWT expiration)
	if bl.IsBlacklisted(tokenID) {
		t.Error("expired token should not be considered blacklisted")
	}
}

func TestTokenBlacklist_Clear(t *testing.T) {
	bl := GetBlacklist()
	bl.Clear()

	// Add multiple tokens
	for i := 0; i < 5; i++ {
		bl.Add("token-"+string(rune('a'+i)), time.Now().Add(1*time.Hour))
	}

	if bl.Count() != 5 {
		t.Errorf("expected count 5, got %d", bl.Count())
	}

	bl.Clear()

	if bl.Count() != 0 {
		t.Errorf("expected count 0 after clear, got %d", bl.Count())
	}
}

func TestTokenBlacklist_Singleton(t *testing.T) {
	bl1 := GetBlacklist()
	bl2 := GetBlacklist()

	if bl1 != bl2 {
		t.Error("GetBlacklist should return the same instance")
	}
}

func TestTokenBlacklist_Concurrent(t *testing.T) {
	bl := GetBlacklist()
	bl.Clear()

	// Concurrent access test
	done := make(chan bool)

	// Writer goroutine
	go func() {
		for i := 0; i < 100; i++ {
			bl.Add("concurrent-token-"+string(rune(i)), time.Now().Add(1*time.Hour))
		}
		done <- true
	}()

	// Reader goroutine
	go func() {
		for i := 0; i < 100; i++ {
			bl.IsBlacklisted("concurrent-token-" + string(rune(i)))
		}
		done <- true
	}()

	// Wait for both
	<-done
	<-done

	// Should not panic or deadlock
}
