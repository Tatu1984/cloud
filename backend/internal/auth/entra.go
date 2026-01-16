package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/cloudplatform/backend/internal/config"
	"github.com/golang-jwt/jwt/v5"
)

// EntraIDService handles Microsoft Entra ID authentication
type EntraIDService struct {
	config     *config.EntraIDConfig
	httpClient *http.Client
	jwksCache  *JWKSCache
}

// JWKSCache caches JWKS keys from Microsoft
type JWKSCache struct {
	mu        sync.RWMutex
	keys      map[string]*rsa.PublicKey
	expiresAt time.Time
	issuer    string
}

// EntraIDClaims represents claims from Microsoft Entra ID token
type EntraIDClaims struct {
	Email             string   `json:"email"`
	PreferredUsername string   `json:"preferred_username"`
	Name              string   `json:"name"`
	GivenName         string   `json:"given_name"`
	FamilyName        string   `json:"family_name"`
	OID               string   `json:"oid"`  // Object ID (unique user identifier)
	TID               string   `json:"tid"`  // Tenant ID
	Roles             []string `json:"roles"` // App roles assigned to user
	Groups            []string `json:"groups"` // Group memberships
	jwt.RegisteredClaims
}

// EntraIDUserInfo represents user information from Microsoft Graph
type EntraIDUserInfo struct {
	ID                string `json:"id"`
	Email             string `json:"mail"`
	UserPrincipalName string `json:"userPrincipalName"`
	DisplayName       string `json:"displayName"`
	GivenName         string `json:"givenName"`
	Surname           string `json:"surname"`
	JobTitle          string `json:"jobTitle"`
	Department        string `json:"department"`
}

// JWKS represents JSON Web Key Set
type JWKS struct {
	Keys []JWK `json:"keys"`
}

// JWK represents a JSON Web Key
type JWK struct {
	Kty string `json:"kty"`
	Use string `json:"use"`
	Kid string `json:"kid"`
	N   string `json:"n"`
	E   string `json:"e"`
}

// NewEntraIDService creates a new Entra ID authentication service
func NewEntraIDService(cfg *config.EntraIDConfig) *EntraIDService {
	return &EntraIDService{
		config: cfg,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		jwksCache: &JWKSCache{
			keys: make(map[string]*rsa.PublicKey),
		},
	}
}

// IsEnabled returns whether Entra ID authentication is enabled
func (s *EntraIDService) IsEnabled() bool {
	return s.config.Enabled && s.config.TenantID != "" && s.config.ClientID != ""
}

// GetAuthorizationURL returns the Microsoft authorization URL
func (s *EntraIDService) GetAuthorizationURL(state string) string {
	scopes := strings.Join(s.config.Scopes, " ")
	return fmt.Sprintf(
		"https://login.microsoftonline.com/%s/oauth2/v2.0/authorize?"+
			"client_id=%s&"+
			"response_type=code&"+
			"redirect_uri=%s&"+
			"response_mode=query&"+
			"scope=%s&"+
			"state=%s",
		s.config.TenantID,
		s.config.ClientID,
		s.config.RedirectURI,
		scopes,
		state,
	)
}

// TokenResponse represents the response from Microsoft token endpoint
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
}

// ExchangeCode exchanges an authorization code for tokens
func (s *EntraIDService) ExchangeCode(ctx context.Context, code string) (*TokenResponse, error) {
	tokenURL := fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", s.config.TenantID)

	data := fmt.Sprintf(
		"client_id=%s&"+
			"scope=%s&"+
			"code=%s&"+
			"redirect_uri=%s&"+
			"grant_type=authorization_code&"+
			"client_secret=%s",
		s.config.ClientID,
		strings.Join(s.config.Scopes, " "),
		code,
		s.config.RedirectURI,
		s.config.ClientSecret,
	)

	req, err := http.NewRequestWithContext(ctx, "POST", tokenURL, strings.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("token exchange failed: %s", string(body))
	}

	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("failed to decode token response: %w", err)
	}

	return &tokenResp, nil
}

// ValidateIDToken validates a Microsoft ID token and returns the claims
func (s *EntraIDService) ValidateIDToken(ctx context.Context, idToken string) (*EntraIDClaims, error) {
	// Parse the token header to get the key ID
	parts := strings.Split(idToken, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid token format")
	}

	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("failed to decode token header: %w", err)
	}

	var header struct {
		Kid string `json:"kid"`
		Alg string `json:"alg"`
	}
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, fmt.Errorf("failed to parse token header: %w", err)
	}

	// Get the public key
	publicKey, err := s.getPublicKey(ctx, header.Kid)
	if err != nil {
		return nil, fmt.Errorf("failed to get public key: %w", err)
	}

	// Parse and validate the token
	token, err := jwt.ParseWithClaims(idToken, &EntraIDClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return publicKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to validate token: %w", err)
	}

	claims, ok := token.Claims.(*EntraIDClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	// Validate audience (client ID)
	audienceValid := false
	for _, aud := range claims.Audience {
		if aud == s.config.ClientID {
			audienceValid = true
			break
		}
	}
	if !audienceValid {
		return nil, errors.New("invalid token audience")
	}

	// Validate issuer
	expectedIssuer := fmt.Sprintf("https://login.microsoftonline.com/%s/v2.0", s.config.TenantID)
	if claims.Issuer != expectedIssuer {
		return nil, errors.New("invalid token issuer")
	}

	return claims, nil
}

// getPublicKey retrieves the public key for the given key ID
func (s *EntraIDService) getPublicKey(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	s.jwksCache.mu.RLock()
	if key, ok := s.jwksCache.keys[kid]; ok && time.Now().Before(s.jwksCache.expiresAt) {
		s.jwksCache.mu.RUnlock()
		return key, nil
	}
	s.jwksCache.mu.RUnlock()

	// Fetch JWKS
	if err := s.refreshJWKS(ctx); err != nil {
		return nil, err
	}

	s.jwksCache.mu.RLock()
	defer s.jwksCache.mu.RUnlock()

	key, ok := s.jwksCache.keys[kid]
	if !ok {
		return nil, fmt.Errorf("key %s not found in JWKS", kid)
	}
	return key, nil
}

// refreshJWKS fetches the JWKS from Microsoft
func (s *EntraIDService) refreshJWKS(ctx context.Context) error {
	jwksURL := fmt.Sprintf("https://login.microsoftonline.com/%s/discovery/v2.0/keys", s.config.TenantID)

	req, err := http.NewRequestWithContext(ctx, "GET", jwksURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create JWKS request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS request failed with status: %d", resp.StatusCode)
	}

	var jwks JWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("failed to decode JWKS: %w", err)
	}

	s.jwksCache.mu.Lock()
	defer s.jwksCache.mu.Unlock()

	// Clear and repopulate cache
	s.jwksCache.keys = make(map[string]*rsa.PublicKey)
	for _, key := range jwks.Keys {
		if key.Kty != "RSA" || key.Use != "sig" {
			continue
		}

		pubKey, err := parseRSAPublicKey(key.N, key.E)
		if err != nil {
			continue
		}
		s.jwksCache.keys[key.Kid] = pubKey
	}

	// Cache for 24 hours
	s.jwksCache.expiresAt = time.Now().Add(24 * time.Hour)

	return nil
}

// parseRSAPublicKey parses RSA public key from JWK components
func parseRSAPublicKey(nStr, eStr string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode N: %w", err)
	}

	eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode E: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	e := 0
	for _, b := range eBytes {
		e = e*256 + int(b)
	}

	return &rsa.PublicKey{
		N: n,
		E: e,
	}, nil
}

// GetUserInfo fetches user information from Microsoft Graph API
func (s *EntraIDService) GetUserInfo(ctx context.Context, accessToken string) (*EntraIDUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "https://graph.microsoft.com/v1.0/me", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create user info request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("user info request failed: %s", string(body))
	}

	var userInfo EntraIDUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %w", err)
	}

	return &userInfo, nil
}

// GetEmail returns the best available email from claims
func (c *EntraIDClaims) GetEmail() string {
	if c.Email != "" {
		return c.Email
	}
	return c.PreferredUsername
}

// GetDisplayName returns the best available display name from claims
func (c *EntraIDClaims) GetDisplayName() string {
	if c.Name != "" {
		return c.Name
	}
	if c.GivenName != "" && c.FamilyName != "" {
		return c.GivenName + " " + c.FamilyName
	}
	return c.PreferredUsername
}

// IsEmailAllowed checks if the email domain is in the allowed list
func (s *EntraIDService) IsEmailAllowed(email string) bool {
	if len(s.config.AllowedDomains) == 0 {
		return true
	}

	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}

	domain := strings.ToLower(parts[1])
	for _, allowed := range s.config.AllowedDomains {
		if strings.ToLower(allowed) == domain {
			return true
		}
	}
	return false
}

// GetConfig returns the Entra ID configuration
func (s *EntraIDService) GetConfig() *config.EntraIDConfig {
	return s.config
}
