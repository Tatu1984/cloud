package config

import (
	"os"
	"testing"
	"time"
)

func TestLoad_Defaults(t *testing.T) {
	// Clear environment to test defaults
	os.Clearenv()

	cfg := Load()

	// Test server defaults
	if cfg.Server.Port != "8080" {
		t.Errorf("expected default port '8080', got '%s'", cfg.Server.Port)
	}
	if cfg.Server.Host != "0.0.0.0" {
		t.Errorf("expected default host '0.0.0.0', got '%s'", cfg.Server.Host)
	}
	if cfg.Server.Environment != "development" {
		t.Errorf("expected default environment 'development', got '%s'", cfg.Server.Environment)
	}

	// Test database defaults
	if cfg.Database.Host != "localhost" {
		t.Errorf("expected default DB host 'localhost', got '%s'", cfg.Database.Host)
	}
	if cfg.Database.Port != "5432" {
		t.Errorf("expected default DB port '5432', got '%s'", cfg.Database.Port)
	}

	// Test JWT defaults
	if cfg.JWT.AccessTokenTTL != 15*time.Minute {
		t.Errorf("expected default access token TTL 15m, got %v", cfg.JWT.AccessTokenTTL)
	}
}

func TestLoad_FromEnv(t *testing.T) {
	// Set environment variables
	os.Setenv("PORT", "9090")
	os.Setenv("HOST", "127.0.0.1")
	os.Setenv("ENVIRONMENT", "production")
	os.Setenv("DB_HOST", "db.example.com")
	os.Setenv("JWT_SECRET", "custom-secret-that-is-long-enough-for-production")
	defer os.Clearenv()

	cfg := Load()

	if cfg.Server.Port != "9090" {
		t.Errorf("expected port '9090', got '%s'", cfg.Server.Port)
	}
	if cfg.Server.Host != "127.0.0.1" {
		t.Errorf("expected host '127.0.0.1', got '%s'", cfg.Server.Host)
	}
	if cfg.Server.Environment != "production" {
		t.Errorf("expected environment 'production', got '%s'", cfg.Server.Environment)
	}
	if cfg.Database.Host != "db.example.com" {
		t.Errorf("expected DB host 'db.example.com', got '%s'", cfg.Database.Host)
	}
	if cfg.JWT.Secret != "custom-secret-that-is-long-enough-for-production" {
		t.Errorf("expected custom JWT secret")
	}
}

func TestDSN(t *testing.T) {
	cfg := &DatabaseConfig{
		Host:     "localhost",
		Port:     "5432",
		User:     "testuser",
		Password: "testpass",
		DBName:   "testdb",
		SSLMode:  "disable",
	}

	dsn := cfg.DSN()
	expected := "host=localhost port=5432 user=testuser password=testpass dbname=testdb sslmode=disable"
	if dsn != expected {
		t.Errorf("expected DSN '%s', got '%s'", expected, dsn)
	}
}

func TestIsProduction(t *testing.T) {
	cfg := &Config{
		Server: ServerConfig{
			Environment: "production",
		},
	}

	if !cfg.IsProduction() {
		t.Error("expected IsProduction() to return true")
	}

	cfg.Server.Environment = "development"
	if cfg.IsProduction() {
		t.Error("expected IsProduction() to return false")
	}
}

func TestIsDevelopment(t *testing.T) {
	cfg := &Config{
		Server: ServerConfig{
			Environment: "development",
		},
	}

	if !cfg.IsDevelopment() {
		t.Error("expected IsDevelopment() to return true")
	}

	cfg.Server.Environment = "production"
	if cfg.IsDevelopment() {
		t.Error("expected IsDevelopment() to return false")
	}
}

func TestGetEnvSlice(t *testing.T) {
	os.Setenv("TEST_SLICE", "a,b,c")
	defer os.Unsetenv("TEST_SLICE")

	result := getEnvSlice("TEST_SLICE", []string{"default"})
	if len(result) != 3 {
		t.Errorf("expected 3 elements, got %d", len(result))
	}
	if result[0] != "a" || result[1] != "b" || result[2] != "c" {
		t.Errorf("unexpected slice values: %v", result)
	}

	// Test default
	result = getEnvSlice("NONEXISTENT", []string{"default"})
	if len(result) != 1 || result[0] != "default" {
		t.Errorf("expected default value, got %v", result)
	}
}

func TestGetDurationEnv(t *testing.T) {
	os.Setenv("TEST_DURATION", "5m")
	defer os.Unsetenv("TEST_DURATION")

	result := getDurationEnv("TEST_DURATION", 1*time.Minute)
	if result != 5*time.Minute {
		t.Errorf("expected 5m, got %v", result)
	}

	// Test invalid duration falls back to default
	os.Setenv("TEST_DURATION", "invalid")
	result = getDurationEnv("TEST_DURATION", 1*time.Minute)
	if result != 1*time.Minute {
		t.Errorf("expected default 1m for invalid duration, got %v", result)
	}
}

func TestGetIntEnv(t *testing.T) {
	os.Setenv("TEST_INT", "42")
	defer os.Unsetenv("TEST_INT")

	result := getIntEnv("TEST_INT", 10)
	if result != 42 {
		t.Errorf("expected 42, got %d", result)
	}

	// Test invalid int falls back to default
	os.Setenv("TEST_INT", "notanumber")
	result = getIntEnv("TEST_INT", 10)
	if result != 10 {
		t.Errorf("expected default 10 for invalid int, got %d", result)
	}
}

func TestGetBoolEnv(t *testing.T) {
	testCases := []struct {
		value    string
		expected bool
	}{
		{"true", true},
		{"false", false},
		{"1", true},
		{"0", false},
		{"TRUE", true},
		{"FALSE", false},
	}

	for _, tc := range testCases {
		os.Setenv("TEST_BOOL", tc.value)
		result := getBoolEnv("TEST_BOOL", false)
		if result != tc.expected {
			t.Errorf("for value '%s', expected %v, got %v", tc.value, tc.expected, result)
		}
	}
	os.Unsetenv("TEST_BOOL")
}
