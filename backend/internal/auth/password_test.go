package auth

import (
	"testing"
)

func TestHashPassword(t *testing.T) {
	password := "testPassword123!"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	if hash == "" {
		t.Error("hash should not be empty")
	}

	if hash == password {
		t.Error("hash should not equal the original password")
	}

	// Hash should be different each time due to salt
	hash2, _ := HashPassword(password)
	if hash == hash2 {
		t.Error("hashes should be different due to salt")
	}
}

func TestCheckPassword(t *testing.T) {
	password := "testPassword123!"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	// Correct password should match
	if !CheckPassword(password, hash) {
		t.Error("correct password should match hash")
	}

	// Wrong password should not match
	if CheckPassword("wrongPassword", hash) {
		t.Error("wrong password should not match hash")
	}

	// Empty password should not match
	if CheckPassword("", hash) {
		t.Error("empty password should not match hash")
	}
}

func TestGenerateRandomString(t *testing.T) {
	// Generate strings of various lengths
	lengths := []int{8, 16, 32, 64}

	for _, length := range lengths {
		str, err := GenerateRandomString(length)
		if err != nil {
			t.Fatalf("failed to generate random string of length %d: %v", length, err)
		}

		if len(str) != length {
			t.Errorf("expected length %d, got %d", length, len(str))
		}
	}

	// Strings should be unique
	str1, _ := GenerateRandomString(32)
	str2, _ := GenerateRandomString(32)
	if str1 == str2 {
		t.Error("random strings should be unique")
	}
}

func TestPasswordStrength(t *testing.T) {
	// Test various passwords
	testCases := []struct {
		password string
		minLen   int
		valid    bool
	}{
		{"short", 8, false},
		{"longenough", 8, true},
		{"12345678", 8, true},
		{"", 8, false},
		{"a", 1, true},
	}

	for _, tc := range testCases {
		valid := len(tc.password) >= tc.minLen
		if valid != tc.valid {
			t.Errorf("password '%s' with minLen %d: expected valid=%v, got %v",
				tc.password, tc.minLen, tc.valid, valid)
		}
	}
}
