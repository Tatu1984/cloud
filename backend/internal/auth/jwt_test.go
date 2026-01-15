package auth

import (
	"testing"
	"time"

	"github.com/cloudplatform/backend/internal/config"
)

func TestJWTService_GenerateAndValidateTokenPair(t *testing.T) {
	cfg := &config.JWTConfig{
		Secret:          "test-secret-key-must-be-at-least-32-chars",
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
		Issuer:          "test-issuer",
	}

	svc := NewJWTService(cfg)

	// Generate token pair
	tokens, err := svc.GenerateTokenPair("user123", "test@example.com", "org456", []string{"admin"})
	if err != nil {
		t.Fatalf("failed to generate token pair: %v", err)
	}

	if tokens.AccessToken == "" {
		t.Error("access token should not be empty")
	}
	if tokens.RefreshToken == "" {
		t.Error("refresh token should not be empty")
	}
	if tokens.TokenType != "Bearer" {
		t.Errorf("expected token type 'Bearer', got '%s'", tokens.TokenType)
	}

	// Validate access token
	claims, err := svc.ValidateAccessToken(tokens.AccessToken)
	if err != nil {
		t.Fatalf("failed to validate access token: %v", err)
	}

	if claims.UserID != "user123" {
		t.Errorf("expected user ID 'user123', got '%s'", claims.UserID)
	}
	if claims.Email != "test@example.com" {
		t.Errorf("expected email 'test@example.com', got '%s'", claims.Email)
	}
	if claims.OrganizationID != "org456" {
		t.Errorf("expected org ID 'org456', got '%s'", claims.OrganizationID)
	}
	if len(claims.Roles) != 1 || claims.Roles[0] != "admin" {
		t.Errorf("expected roles ['admin'], got %v", claims.Roles)
	}
	if claims.TokenType != AccessToken {
		t.Errorf("expected token type 'access', got '%s'", claims.TokenType)
	}

	// Validate refresh token
	refreshClaims, err := svc.ValidateRefreshToken(tokens.RefreshToken)
	if err != nil {
		t.Fatalf("failed to validate refresh token: %v", err)
	}

	if refreshClaims.UserID != "user123" {
		t.Errorf("expected user ID 'user123', got '%s'", refreshClaims.UserID)
	}
	if refreshClaims.TokenType != RefreshToken {
		t.Errorf("expected token type 'refresh', got '%s'", refreshClaims.TokenType)
	}
}

func TestJWTService_InvalidToken(t *testing.T) {
	cfg := &config.JWTConfig{
		Secret:          "test-secret-key-must-be-at-least-32-chars",
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
		Issuer:          "test-issuer",
	}

	svc := NewJWTService(cfg)

	// Test invalid token
	_, err := svc.ValidateToken("invalid-token")
	if err == nil {
		t.Error("expected error for invalid token")
	}

	// Test empty token
	_, err = svc.ValidateToken("")
	if err == nil {
		t.Error("expected error for empty token")
	}
}

func TestJWTService_WrongTokenType(t *testing.T) {
	cfg := &config.JWTConfig{
		Secret:          "test-secret-key-must-be-at-least-32-chars",
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
		Issuer:          "test-issuer",
	}

	svc := NewJWTService(cfg)

	// Generate token pair
	tokens, _ := svc.GenerateTokenPair("user123", "test@example.com", "org456", []string{"admin"})

	// Try to validate access token as refresh token
	_, err := svc.ValidateRefreshToken(tokens.AccessToken)
	if err == nil {
		t.Error("expected error when validating access token as refresh token")
	}

	// Try to validate refresh token as access token
	_, err = svc.ValidateAccessToken(tokens.RefreshToken)
	if err == nil {
		t.Error("expected error when validating refresh token as access token")
	}
}

func TestJWTService_TokenBlacklist(t *testing.T) {
	cfg := &config.JWTConfig{
		Secret:          "test-secret-key-must-be-at-least-32-chars",
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
		Issuer:          "test-issuer",
	}

	svc := NewJWTService(cfg)

	// Clear blacklist before test
	GetBlacklist().Clear()

	// Generate token
	tokens, _ := svc.GenerateTokenPair("user123", "test@example.com", "org456", []string{"admin"})

	// Token should be valid initially
	_, err := svc.ValidateAccessToken(tokens.AccessToken)
	if err != nil {
		t.Fatalf("token should be valid initially: %v", err)
	}

	// Revoke the token
	err = svc.RevokeToken(tokens.AccessToken)
	if err != nil {
		t.Fatalf("failed to revoke token: %v", err)
	}

	// Token should now be invalid
	_, err = svc.ValidateAccessToken(tokens.AccessToken)
	if err == nil {
		t.Error("revoked token should be invalid")
	}
}

func TestGenerateTokenID(t *testing.T) {
	// Generate multiple IDs and ensure they're unique
	ids := make(map[string]bool)
	for i := 0; i < 100; i++ {
		id, err := generateTokenID()
		if err != nil {
			t.Fatalf("failed to generate token ID: %v", err)
		}
		if id == "" {
			t.Error("token ID should not be empty")
		}
		if len(id) != 32 { // 16 bytes = 32 hex chars
			t.Errorf("expected token ID length 32, got %d", len(id))
		}
		if ids[id] {
			t.Error("token IDs should be unique")
		}
		ids[id] = true
	}
}
