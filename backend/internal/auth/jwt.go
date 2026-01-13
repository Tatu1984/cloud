package auth

import (
	"errors"
	"time"

	"github.com/cloudplatform/backend/internal/config"
	"github.com/golang-jwt/jwt/v5"
)

// TokenType represents the type of JWT token
type TokenType string

const (
	AccessToken  TokenType = "access"
	RefreshToken TokenType = "refresh"
)

// Claims represents JWT claims
type Claims struct {
	UserID         string   `json:"user_id"`
	Email          string   `json:"email"`
	OrganizationID string   `json:"org_id"`
	Roles          []string `json:"roles"`
	TokenType      TokenType `json:"type"`
	jwt.RegisteredClaims
}

// JWTService handles JWT operations
type JWTService struct {
	config *config.JWTConfig
}

// NewJWTService creates a new JWT service
func NewJWTService(cfg *config.JWTConfig) *JWTService {
	return &JWTService{
		config: cfg,
	}
}

// GenerateAccessToken generates a new access token
func (s *JWTService) GenerateAccessToken(userID, email, orgID string, roles []string) (string, error) {
	return s.generateToken(userID, email, orgID, roles, AccessToken, s.config.AccessTokenTTL)
}

// GenerateRefreshToken generates a new refresh token
func (s *JWTService) GenerateRefreshToken(userID, email, orgID string) (string, error) {
	return s.generateToken(userID, email, orgID, nil, RefreshToken, s.config.RefreshTokenTTL)
}

// generateToken creates a JWT with the given parameters
func (s *JWTService) generateToken(userID, email, orgID string, roles []string, tokenType TokenType, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:         userID,
		Email:          email,
		OrganizationID: orgID,
		Roles:          roles,
		TokenType:      tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.config.Issuer,
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.Secret))
}

// ValidateToken validates a JWT and returns the claims
func (s *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.config.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

// ValidateAccessToken validates an access token
func (s *JWTService) ValidateAccessToken(tokenString string) (*Claims, error) {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != AccessToken {
		return nil, errors.New("not an access token")
	}

	return claims, nil
}

// ValidateRefreshToken validates a refresh token
func (s *JWTService) ValidateRefreshToken(tokenString string) (*Claims, error) {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != RefreshToken {
		return nil, errors.New("not a refresh token")
	}

	return claims, nil
}

// TokenPair represents a pair of access and refresh tokens
type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int64  `json:"expiresIn"`
	TokenType    string `json:"tokenType"`
}

// GenerateTokenPair generates both access and refresh tokens
func (s *JWTService) GenerateTokenPair(userID, email, orgID string, roles []string) (*TokenPair, error) {
	accessToken, err := s.GenerateAccessToken(userID, email, orgID, roles)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.GenerateRefreshToken(userID, email, orgID)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.config.AccessTokenTTL.Seconds()),
		TokenType:    "Bearer",
	}, nil
}
