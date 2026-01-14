package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"

	"golang.org/x/crypto/bcrypt"
)

const (
	// DefaultCost is the default bcrypt cost
	DefaultCost = 10
	// APIKeyLength is the length of generated API keys
	APIKeyLength = 32
)

// HashPassword creates a bcrypt hash of a password
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), DefaultCost)
	return string(bytes), err
}

// CheckPassword compares a password with a bcrypt hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateAPIKey generates a new API key
func GenerateAPIKey() (key string, hash string, prefix string, err error) {
	// Generate random bytes
	bytes := make([]byte, APIKeyLength)
	if _, err = rand.Read(bytes); err != nil {
		return "", "", "", err
	}

	// Encode as base64 URL-safe string
	key = base64.URLEncoding.EncodeToString(bytes)

	// Create prefix (first 8 chars)
	prefix = key[:8]

	// Hash the key for storage
	hashBytes := sha256.Sum256([]byte(key))
	hash = hex.EncodeToString(hashBytes[:])

	return key, hash, prefix, nil
}

// HashAPIKey hashes an API key for comparison
func HashAPIKey(key string) string {
	hashBytes := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hashBytes[:])
}

// GenerateRandomString generates a random string of specified length
func GenerateRandomString(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes)[:length], nil
}

// GenerateVerificationCode generates a 6-digit verification code
func GenerateVerificationCode() (string, error) {
	bytes := make([]byte, 3)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	// Convert to 6 digits (0-999999)
	code := int(bytes[0])<<16 | int(bytes[1])<<8 | int(bytes[2])
	code = code % 1000000
	return hex.EncodeToString([]byte{byte(code / 100000), byte((code / 10000) % 10), byte((code / 1000) % 10), byte((code / 100) % 10), byte((code / 10) % 10), byte(code % 10)}), nil
}
