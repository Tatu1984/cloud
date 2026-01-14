package database

import (
	"fmt"
	"log"
	"time"

	"github.com/cloudplatform/backend/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Connect establishes a connection to the PostgreSQL database
func Connect(cfg *config.DatabaseConfig) (*gorm.DB, error) {
	dsn := cfg.DSN()

	// Configure GORM logger based on environment
	gormLogger := logger.Default.LogMode(logger.Info)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:                 gormLogger,
		SkipDefaultTransaction: true,
		PrepareStmt:           true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying SQL DB
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	// Verify connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	DB = db
	log.Println("Database connection established successfully")

	return db, nil
}

// Close closes the database connection
func Close() error {
	if DB != nil {
		sqlDB, err := DB.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}

// Migrate runs database migrations
func Migrate(db *gorm.DB) error {
	log.Println("Running database migrations...")

	err := db.AutoMigrate(
		// IAM
		&Organization{},
		&User{},
		&Role{},
		&Permission{},
		&RolePermission{},
		&UserRole{},
		&APIKey{},
		&Session{},
		&AuditLog{},

		// Projects
		&Project{},

		// Compute
		&VM{},
		&VMTemplate{},
		&Snapshot{},

		// Kubernetes
		&KubernetesCluster{},
		&NodePool{},

		// Networking
		&VPC{},
		&Subnet{},
		&SecurityGroup{},
		&SecurityGroupRule{},
		&LoadBalancer{},
		&PublicIP{},
		&DNSZone{},
		&DNSRecord{},

		// Storage
		&Volume{},
		&ObjectBucket{},
		&FileShare{},
		&Backup{},

		// Databases
		&ManagedDatabase{},
		&DatabaseBackup{},

		// Admin
		&Datacenter{},
		&ProxmoxCluster{},
		&ProxmoxNode{},
		&ZeroTierNetwork{},
		&CephCluster{},
		&StoragePool{},

		// Billing
		&BillingPlan{},
		&PricingRule{},
		&UsageRecord{},
		&Invoice{},
		&InvoiceLineItem{},
		&Payment{},
	)

	if err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	log.Println("Database migrations completed successfully")
	return nil
}

// SeedDefaultData creates initial data for development
func SeedDefaultData(db *gorm.DB) error {
	log.Println("Seeding default data...")

	// Create default organization
	var orgCount int64
	db.Model(&Organization{}).Count(&orgCount)
	if orgCount == 0 {
		defaultOrg := Organization{
			Name:   "Default Organization",
			Slug:   "default",
			Plan:   "starter",
			Status: "active",
		}
		if err := db.Create(&defaultOrg).Error; err != nil {
			return err
		}
		log.Println("Created default organization")

		// Create admin role with all permissions
		adminRole := Role{
			Name:        "admin",
			DisplayName: "Administrator",
			Description: "Full system access",
			IsSystem:    true,
		}
		if err := db.Create(&adminRole).Error; err != nil {
			return err
		}

		// Create user role
		userRole := Role{
			Name:        "user",
			DisplayName: "User",
			Description: "Standard user access",
			IsSystem:    true,
		}
		if err := db.Create(&userRole).Error; err != nil {
			return err
		}

		// Create default admin user
		adminUser := User{
			Email:          "admin@cloudplatform.local",
			Name:           "Admin User",
			PasswordHash:   "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.aHJIRmjhJp6EZpiqAK", // password: admin123
			OrganizationID: defaultOrg.ID,
			EmailVerified:  true,
			Status:         "active",
		}
		if err := db.Create(&adminUser).Error; err != nil {
			return err
		}

		// Assign admin role
		userRoleAssignment := UserRole{
			UserID: adminUser.ID,
			RoleID: adminRole.ID,
		}
		if err := db.Create(&userRoleAssignment).Error; err != nil {
			return err
		}

		log.Println("Created default admin user (admin@cloudplatform.local / admin123)")

		// Create default billing plans
		plans := []BillingPlan{
			{
				Name:         "starter",
				DisplayName:  "Starter",
				Description:  "Perfect for small projects",
				PriceMonthly: 0,
				MaxVMs:       5,
				MaxVCPUs:     10,
				MaxMemoryGB:  20,
				MaxStorageGB: 100,
				MaxProjects:  2,
				IsActive:     true,
			},
			{
				Name:         "professional",
				DisplayName:  "Professional",
				Description:  "For growing businesses",
				PriceMonthly: 99,
				MaxVMs:       25,
				MaxVCPUs:     50,
				MaxMemoryGB:  100,
				MaxStorageGB: 500,
				MaxProjects:  10,
				IsActive:     true,
			},
			{
				Name:         "enterprise",
				DisplayName:  "Enterprise",
				Description:  "Unlimited resources",
				PriceMonthly: 499,
				MaxVMs:       -1, // unlimited
				MaxVCPUs:     -1,
				MaxMemoryGB:  -1,
				MaxStorageGB: -1,
				MaxProjects:  -1,
				IsActive:     true,
			},
		}

		for _, plan := range plans {
			if err := db.Create(&plan).Error; err != nil {
				return err
			}
		}
		log.Println("Created default billing plans")
	}

	log.Println("Default data seeding completed")
	return nil
}

// BaseModel provides common fields for all models
type BaseModel struct {
	ID        string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}
