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
		&ServiceAccount{},
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

// SeedPermissions creates default permissions for the platform
func SeedPermissions(db *gorm.DB) error {
	log.Println("Seeding permissions...")

	permissions := []Permission{
		// VM Permissions
		{Name: "vm:create", Resource: "vm", Action: "create", Description: "Create virtual machines"},
		{Name: "vm:read", Resource: "vm", Action: "read", Description: "View virtual machines"},
		{Name: "vm:update", Resource: "vm", Action: "update", Description: "Update virtual machines"},
		{Name: "vm:delete", Resource: "vm", Action: "delete", Description: "Delete virtual machines"},
		{Name: "vm:start", Resource: "vm", Action: "start", Description: "Start virtual machines"},
		{Name: "vm:stop", Resource: "vm", Action: "stop", Description: "Stop virtual machines"},
		{Name: "vm:console", Resource: "vm", Action: "console", Description: "Access VM console"},
		{Name: "vm:snapshot", Resource: "vm", Action: "snapshot", Description: "Create VM snapshots"},

		// Storage Permissions
		{Name: "storage:create", Resource: "storage", Action: "create", Description: "Create storage volumes"},
		{Name: "storage:read", Resource: "storage", Action: "read", Description: "View storage volumes"},
		{Name: "storage:update", Resource: "storage", Action: "update", Description: "Update storage volumes"},
		{Name: "storage:delete", Resource: "storage", Action: "delete", Description: "Delete storage volumes"},
		{Name: "storage:attach", Resource: "storage", Action: "attach", Description: "Attach storage to VMs"},
		{Name: "storage:detach", Resource: "storage", Action: "detach", Description: "Detach storage from VMs"},

		// Bucket Permissions
		{Name: "bucket:create", Resource: "bucket", Action: "create", Description: "Create object storage buckets"},
		{Name: "bucket:read", Resource: "bucket", Action: "read", Description: "View object storage buckets"},
		{Name: "bucket:update", Resource: "bucket", Action: "update", Description: "Update bucket settings"},
		{Name: "bucket:delete", Resource: "bucket", Action: "delete", Description: "Delete object storage buckets"},

		// Network Permissions
		{Name: "network:create", Resource: "network", Action: "create", Description: "Create VPCs and networks"},
		{Name: "network:read", Resource: "network", Action: "read", Description: "View networks"},
		{Name: "network:update", Resource: "network", Action: "update", Description: "Update networks"},
		{Name: "network:delete", Resource: "network", Action: "delete", Description: "Delete networks"},
		{Name: "network:subnet:manage", Resource: "network", Action: "subnet:manage", Description: "Manage subnets"},
		{Name: "network:securitygroup:manage", Resource: "network", Action: "securitygroup:manage", Description: "Manage security groups"},

		// Kubernetes Permissions
		{Name: "kubernetes:create", Resource: "kubernetes", Action: "create", Description: "Create Kubernetes clusters"},
		{Name: "kubernetes:read", Resource: "kubernetes", Action: "read", Description: "View Kubernetes clusters"},
		{Name: "kubernetes:update", Resource: "kubernetes", Action: "update", Description: "Update Kubernetes clusters"},
		{Name: "kubernetes:delete", Resource: "kubernetes", Action: "delete", Description: "Delete Kubernetes clusters"},
		{Name: "kubernetes:kubeconfig", Resource: "kubernetes", Action: "kubeconfig", Description: "Download kubeconfig"},

		// Database Permissions
		{Name: "database:create", Resource: "database", Action: "create", Description: "Create managed databases"},
		{Name: "database:read", Resource: "database", Action: "read", Description: "View managed databases"},
		{Name: "database:update", Resource: "database", Action: "update", Description: "Update managed databases"},
		{Name: "database:delete", Resource: "database", Action: "delete", Description: "Delete managed databases"},
		{Name: "database:backup", Resource: "database", Action: "backup", Description: "Manage database backups"},

		// Billing Permissions
		{Name: "billing:read", Resource: "billing", Action: "read", Description: "View billing information"},
		{Name: "billing:manage", Resource: "billing", Action: "manage", Description: "Manage billing settings"},
		{Name: "billing:invoices", Resource: "billing", Action: "invoices", Description: "View and download invoices"},
		{Name: "billing:payment", Resource: "billing", Action: "payment", Description: "Manage payment methods"},

		// IAM Permissions
		{Name: "iam:users:read", Resource: "iam", Action: "users:read", Description: "View users"},
		{Name: "iam:users:create", Resource: "iam", Action: "users:create", Description: "Create and invite users"},
		{Name: "iam:users:update", Resource: "iam", Action: "users:update", Description: "Update user details"},
		{Name: "iam:users:delete", Resource: "iam", Action: "users:delete", Description: "Delete users"},
		{Name: "iam:roles:read", Resource: "iam", Action: "roles:read", Description: "View roles"},
		{Name: "iam:roles:create", Resource: "iam", Action: "roles:create", Description: "Create roles"},
		{Name: "iam:roles:update", Resource: "iam", Action: "roles:update", Description: "Update roles"},
		{Name: "iam:roles:delete", Resource: "iam", Action: "roles:delete", Description: "Delete roles"},
		{Name: "iam:permissions:read", Resource: "iam", Action: "permissions:read", Description: "View permissions"},
		{Name: "iam:serviceaccounts:read", Resource: "iam", Action: "serviceaccounts:read", Description: "View service accounts"},
		{Name: "iam:serviceaccounts:create", Resource: "iam", Action: "serviceaccounts:create", Description: "Create service accounts"},
		{Name: "iam:serviceaccounts:update", Resource: "iam", Action: "serviceaccounts:update", Description: "Update service accounts"},
		{Name: "iam:serviceaccounts:delete", Resource: "iam", Action: "serviceaccounts:delete", Description: "Delete service accounts"},

		// Project Permissions
		{Name: "project:create", Resource: "project", Action: "create", Description: "Create projects"},
		{Name: "project:read", Resource: "project", Action: "read", Description: "View projects"},
		{Name: "project:update", Resource: "project", Action: "update", Description: "Update projects"},
		{Name: "project:delete", Resource: "project", Action: "delete", Description: "Delete projects"},

		// Admin Permissions
		{Name: "admin:datacenters:read", Resource: "admin", Action: "datacenters:read", Description: "View datacenters"},
		{Name: "admin:datacenters:manage", Resource: "admin", Action: "datacenters:manage", Description: "Manage datacenters"},
		{Name: "admin:tenants:read", Resource: "admin", Action: "tenants:read", Description: "View all tenants"},
		{Name: "admin:tenants:manage", Resource: "admin", Action: "tenants:manage", Description: "Manage tenants"},
		{Name: "admin:audit:read", Resource: "admin", Action: "audit:read", Description: "View audit logs"},
		{Name: "admin:platform:manage", Resource: "admin", Action: "platform:manage", Description: "Manage platform settings"},
	}

	for _, perm := range permissions {
		var existing Permission
		if err := db.Where("name = ?", perm.Name).First(&existing).Error; err == gorm.ErrRecordNotFound {
			if err := db.Create(&perm).Error; err != nil {
				return err
			}
		}
	}

	log.Println("Permissions seeded successfully")
	return nil
}

// SeedRoles creates default roles for the platform
func SeedRoles(db *gorm.DB) error {
	log.Println("Seeding roles...")

	// Define roles with their permissions
	rolePermissions := map[string]struct {
		DisplayName string
		Description string
		Permissions []string
	}{
		"super_admin": {
			DisplayName: "Super Administrator",
			Description: "Full platform administrative access with all permissions",
			Permissions: []string{"*"}, // Will be expanded to all permissions
		},
		"tenant_admin": {
			DisplayName: "Tenant Administrator",
			Description: "Organization-level management with full access to org resources",
			Permissions: []string{
				"vm:*", "storage:*", "bucket:*", "network:*", "kubernetes:*", "database:*",
				"billing:read", "billing:invoices",
				"iam:users:*", "iam:roles:read", "iam:serviceaccounts:*",
				"project:*",
			},
		},
		"operator": {
			DisplayName: "Operator",
			Description: "Infrastructure management for VMs, storage, and networking",
			Permissions: []string{
				"vm:*", "storage:*", "bucket:*", "network:*", "kubernetes:*", "database:*",
				"project:read",
			},
		},
		"developer": {
			DisplayName: "Developer",
			Description: "Development resource access for building and deploying applications",
			Permissions: []string{
				"vm:create", "vm:read", "vm:update", "vm:start", "vm:stop", "vm:console",
				"storage:read", "storage:attach", "storage:detach",
				"bucket:read",
				"network:read",
				"kubernetes:read", "kubernetes:kubeconfig",
				"database:read",
				"project:read",
			},
		},
		"readonly": {
			DisplayName: "Read Only",
			Description: "View-only access to all resources",
			Permissions: []string{
				"vm:read", "storage:read", "bucket:read", "network:read",
				"kubernetes:read", "database:read", "project:read",
				"billing:read",
			},
		},
		"billing_admin": {
			DisplayName: "Billing Administrator",
			Description: "Full billing and financial management access",
			Permissions: []string{
				"billing:*",
				"project:read",
			},
		},
	}

	// Get all permissions
	var allPermissions []Permission
	if err := db.Find(&allPermissions).Error; err != nil {
		return err
	}

	permissionMap := make(map[string]Permission)
	for _, p := range allPermissions {
		permissionMap[p.Name] = p
	}

	// Helper function to expand wildcards
	expandPermissions := func(patterns []string) []Permission {
		var result []Permission
		seen := make(map[string]bool)

		for _, pattern := range patterns {
			if pattern == "*" {
				// All permissions
				for _, p := range allPermissions {
					if !seen[p.ID] {
						result = append(result, p)
						seen[p.ID] = true
					}
				}
			} else if len(pattern) > 2 && pattern[len(pattern)-2:] == ":*" {
				// Resource wildcard (e.g., "vm:*")
				resource := pattern[:len(pattern)-2]
				for _, p := range allPermissions {
					if p.Resource == resource && !seen[p.ID] {
						result = append(result, p)
						seen[p.ID] = true
					}
				}
			} else {
				// Exact match
				if p, ok := permissionMap[pattern]; ok && !seen[p.ID] {
					result = append(result, p)
					seen[p.ID] = true
				}
			}
		}
		return result
	}

	// Create roles
	for roleName, roleData := range rolePermissions {
		var existingRole Role
		err := db.Where("name = ?", roleName).First(&existingRole).Error

		if err == gorm.ErrRecordNotFound {
			// Create new role
			role := Role{
				Name:        roleName,
				DisplayName: roleData.DisplayName,
				Description: roleData.Description,
				IsSystem:    true,
			}
			if err := db.Create(&role).Error; err != nil {
				return err
			}

			// Assign permissions
			perms := expandPermissions(roleData.Permissions)
			for _, p := range perms {
				rp := RolePermission{
					RoleID:       role.ID,
					PermissionID: p.ID,
				}
				db.Create(&rp)
			}
		}
	}

	log.Println("Roles seeded successfully")
	return nil
}

// SeedDefaultData creates initial data for development
func SeedDefaultData(db *gorm.DB) error {
	log.Println("Seeding default data...")

	// Seed permissions first
	if err := SeedPermissions(db); err != nil {
		return err
	}

	// Seed roles with permissions
	if err := SeedRoles(db); err != nil {
		return err
	}

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
