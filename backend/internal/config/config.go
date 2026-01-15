package config

import (
	"log"
	"os"
	"strconv"
	"time"
)

// Config holds all application configuration
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	EntraID  EntraIDConfig
	Proxmox  ProxmoxConfig
	ZeroTier ZeroTierConfig
	Ceph     CephConfig
	Redis    RedisConfig
}

// ServerConfig holds HTTP server settings
type ServerConfig struct {
	Port         string
	Host         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
	Environment  string
}

// DatabaseConfig holds database connection settings
type DatabaseConfig struct {
	Host            string
	Port            string
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// JWTConfig holds JWT settings
type JWTConfig struct {
	Secret          string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
	Issuer          string
}

// EntraIDConfig holds Microsoft Entra ID (Azure AD) settings
type EntraIDConfig struct {
	Enabled      bool
	TenantID     string
	ClientID     string
	ClientSecret string
	RedirectURI  string
	// Scopes for authorization (e.g., "User.Read", "openid", "profile", "email")
	Scopes []string
	// AllowedDomains restricts login to specific email domains (empty = allow all)
	AllowedDomains []string
	// AutoProvision creates users on first login if true
	AutoProvision bool
	// DefaultRole for auto-provisioned users
	DefaultRole string
}

// ProxmoxConfig holds Proxmox API settings
type ProxmoxConfig struct {
	APIUrl       string
	User         string
	Password     string
	TokenID      string
	TokenSecret  string
	VerifySSL    bool
	Timeout      time.Duration
}

// ZeroTierConfig holds ZeroTier API settings
type ZeroTierConfig struct {
	ControllerURL string
	APIToken      string
	NetworkID     string
	Timeout       time.Duration
}

// CephConfig holds Ceph API settings
type CephConfig struct {
	MonHosts      []string
	User          string
	Keyring       string
	Pool          string
	RBDImageSize  int64
}

// RedisConfig holds Redis settings
type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

// Load returns configuration from environment variables
func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:         getEnv("PORT", "8080"),
			Host:         getEnv("HOST", "0.0.0.0"),
			ReadTimeout:  getDurationEnv("READ_TIMEOUT", 15*time.Second),
			WriteTimeout: getDurationEnv("WRITE_TIMEOUT", 15*time.Second),
			IdleTimeout:  getDurationEnv("IDLE_TIMEOUT", 60*time.Second),
			Environment:  getEnv("ENVIRONMENT", "development"),
		},
		Database: DatabaseConfig{
			Host:            getEnv("DB_HOST", "localhost"),
			Port:            getEnv("DB_PORT", "5432"),
			User:            getEnv("DB_USER", "cloudplatform"),
			Password:        getEnv("DB_PASSWORD", "cloudplatform"),
			DBName:          getEnv("DB_NAME", "cloudplatform"),
			SSLMode:         getEnv("DB_SSL_MODE", "disable"),
			MaxOpenConns:    getIntEnv("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getIntEnv("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: getDurationEnv("DB_CONN_MAX_LIFETIME", 5*time.Minute),
		},
		JWT: JWTConfig{
			Secret:          getEnv("JWT_SECRET", "your-256-bit-secret-key-change-in-production"),
			AccessTokenTTL:  getDurationEnv("JWT_ACCESS_TOKEN_TTL", 15*time.Minute),
			RefreshTokenTTL: getDurationEnv("JWT_REFRESH_TOKEN_TTL", 7*24*time.Hour),
			Issuer:          getEnv("JWT_ISSUER", "cloudplatform"),
		},
		EntraID: EntraIDConfig{
			Enabled:        getBoolEnv("ENTRA_ID_ENABLED", false),
			TenantID:       getEnv("ENTRA_ID_TENANT_ID", ""),
			ClientID:       getEnv("ENTRA_ID_CLIENT_ID", ""),
			ClientSecret:   getEnv("ENTRA_ID_CLIENT_SECRET", ""),
			RedirectURI:    getEnv("ENTRA_ID_REDIRECT_URI", "http://localhost:3000/auth/callback"),
			Scopes:         getEnvSlice("ENTRA_ID_SCOPES", []string{"openid", "profile", "email", "User.Read"}),
			AllowedDomains: getEnvSlice("ENTRA_ID_ALLOWED_DOMAINS", []string{}),
			AutoProvision:  getBoolEnv("ENTRA_ID_AUTO_PROVISION", true),
			DefaultRole:    getEnv("ENTRA_ID_DEFAULT_ROLE", "user"),
		},
		Proxmox: ProxmoxConfig{
			APIUrl:      getEnv("PROXMOX_API_URL", "https://proxmox.local:8006/api2/json"),
			User:        getEnv("PROXMOX_USER", "root@pam"),
			Password:    getEnv("PROXMOX_PASSWORD", ""),
			TokenID:     getEnv("PROXMOX_TOKEN_ID", ""),
			TokenSecret: getEnv("PROXMOX_TOKEN_SECRET", ""),
			VerifySSL:   getBoolEnv("PROXMOX_VERIFY_SSL", false),
			Timeout:     getDurationEnv("PROXMOX_TIMEOUT", 30*time.Second),
		},
		ZeroTier: ZeroTierConfig{
			ControllerURL: getEnv("ZEROTIER_CONTROLLER_URL", "http://localhost:9993"),
			APIToken:      getEnv("ZEROTIER_API_TOKEN", ""),
			NetworkID:     getEnv("ZEROTIER_NETWORK_ID", ""),
			Timeout:       getDurationEnv("ZEROTIER_TIMEOUT", 10*time.Second),
		},
		Ceph: CephConfig{
			MonHosts:     getEnvSlice("CEPH_MON_HOSTS", []string{"localhost"}),
			User:         getEnv("CEPH_USER", "admin"),
			Keyring:      getEnv("CEPH_KEYRING", "/etc/ceph/ceph.client.admin.keyring"),
			Pool:         getEnv("CEPH_POOL", "cloudplatform"),
			RBDImageSize: getInt64Env("CEPH_RBD_IMAGE_SIZE", 10*1024*1024*1024), // 10GB default
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getIntEnv("REDIS_DB", 0),
		},
	}
}

// DSN returns the PostgreSQL connection string
func (c *DatabaseConfig) DSN() string {
	return "host=" + c.Host +
		" port=" + c.Port +
		" user=" + c.User +
		" password=" + c.Password +
		" dbname=" + c.DBName +
		" sslmode=" + c.SSLMode
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}

func getInt64Env(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.ParseInt(value, 10, 64); err == nil {
			return i
		}
	}
	return defaultValue
}

func getBoolEnv(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if b, err := strconv.ParseBool(value); err == nil {
			return b
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if d, err := time.ParseDuration(value); err == nil {
			return d
		}
	}
	return defaultValue
}

func getEnvSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// Simple comma-separated parsing
		var result []string
		current := ""
		for _, char := range value {
			if char == ',' {
				if current != "" {
					result = append(result, current)
				}
				current = ""
			} else {
				current += string(char)
			}
		}
		if current != "" {
			result = append(result, current)
		}
		if len(result) > 0 {
			return result
		}
	}
	return defaultValue
}

// Validate checks if required configuration is present
func (c *Config) Validate() error {
	var errs []string

	// Always validate JWT secret length (should be at least 32 bytes for HS256)
	if len(c.JWT.Secret) < 32 {
		errs = append(errs, "JWT_SECRET must be at least 32 characters")
	}

	if c.Server.Environment == "production" {
		// Reject default/placeholder secrets
		if c.JWT.Secret == "your-256-bit-secret-key-change-in-production" {
			errs = append(errs, "JWT_SECRET must be changed from default value in production")
		}

		// Require strong database password
		if c.Database.Password == "cloudplatform" || c.Database.Password == "" {
			errs = append(errs, "DB_PASSWORD must be set to a strong value in production")
		}

		// Require SSL for database in production
		if c.Database.SSLMode == "disable" {
			errs = append(errs, "DB_SSL_MODE must not be 'disable' in production (use 'require' or 'verify-full')")
		}

		// Validate CORS origins are set (not just localhost)
		corsOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
		if corsOrigins == "" {
			errs = append(errs, "CORS_ALLOWED_ORIGINS must be set in production")
		}
	}

	if len(errs) > 0 {
		for _, e := range errs {
			log.Printf("CONFIG ERROR: %s", e)
		}
		log.Fatal("Configuration validation failed. Please fix the above errors.")
	}

	return nil
}

// IsProduction returns true if running in production mode
func (c *Config) IsProduction() bool {
	return c.Server.Environment == "production"
}

// IsDevelopment returns true if running in development mode
func (c *Config) IsDevelopment() bool {
	return c.Server.Environment == "development"
}
