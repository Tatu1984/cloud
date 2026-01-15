package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/cloudplatform/backend/internal/billing"
	"github.com/cloudplatform/backend/internal/compute"
	"github.com/cloudplatform/backend/internal/config"
	"github.com/cloudplatform/backend/internal/database"
	"github.com/cloudplatform/backend/internal/health"
	"github.com/cloudplatform/backend/internal/iam"
	"github.com/cloudplatform/backend/internal/metrics"
	"github.com/cloudplatform/backend/internal/middleware"
	"github.com/cloudplatform/backend/internal/network"
	"github.com/cloudplatform/backend/pkg/logger"
	"github.com/cloudplatform/backend/pkg/response"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"gorm.io/gorm"
)

const version = "1.0.0"

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize logger
	log := logger.Init(cfg.Server.Environment, os.Stdout)
	log.Info("starting Cloud Platform API server",
		"environment", cfg.Server.Environment,
		"port", cfg.Server.Port,
	)

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		log.Error("configuration validation failed", "error", err)
		os.Exit(1)
	}

	// Connect to database
	db, err := database.Connect(&cfg.Database)
	if err != nil {
		log.Error("failed to connect to database", "error", err)
		if cfg.IsProduction() {
			log.Error("database connection is required in production")
			os.Exit(1)
		}
		// Only allow running without DB in development
		log.Warn("running without database connection - using mock data (DEVELOPMENT ONLY)")
	} else {
		// Run migrations
		if err := database.Migrate(db); err != nil {
			log.Error("failed to run migrations", "error", err)
			if cfg.IsProduction() {
				os.Exit(1)
			}
		}

		// Seed default data in development only
		if cfg.IsDevelopment() {
			if err := database.SeedDefaultData(db); err != nil {
				log.Error("failed to seed default data", "error", err)
			}
		}
	}

	// Initialize services
	iamService := iam.NewService(db, &cfg.JWT)
	computeService := compute.NewService(db, &cfg.Proxmox)
	networkService := network.NewService(db, &cfg.ZeroTier)
	billingService := billing.NewService(db)

	// Initialize handlers
	iamHandler := iam.NewHandler(iamService)
	computeHandler := compute.NewHandler(computeService)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(&cfg.JWT)

	// Initialize health checker
	healthChecker := health.NewChecker(db, version)

	// Create router
	r := chi.NewRouter()

	// Global middleware stack (order matters!)
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(middleware.SecureAPIHeaders(cfg.IsProduction())) // Security headers
	r.Use(metrics.Middleware)                               // Metrics collection
	r.Use(middleware.RequestLogger(log))
	r.Use(middleware.AuditLogger(log, nil)) // Audit logging
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Timeout(60 * time.Second))

	// CORS configuration
	allowedOrigins := []string{
		"http://localhost:3000",
		"http://localhost:3001",
		"http://127.0.0.1:3000",
		"http://127.0.0.1:3001",
	}
	// Add custom origins from environment variable (comma-separated)
	if customOrigins := os.Getenv("CORS_ALLOWED_ORIGINS"); customOrigins != "" {
		for _, origin := range splitString(customOrigins, ",") {
			if origin != "" {
				allowedOrigins = append(allowedOrigins, origin)
			}
		}
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Request-ID"},
		ExposedHeaders:   []string{"Link", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health and observability endpoints
	r.Get("/health", healthChecker.Handler())
	r.Get("/ready", healthChecker.ReadinessHandler())
	r.Get("/live", health.LivenessHandler())
	r.Get("/metrics", metrics.Get().Handler())

	// API Routes
	r.Route("/api/v1", func(r chi.Router) {
		// Auth routes (public)
		iamHandler.RegisterRoutes(r, authMiddleware)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.Authenticate)

			// Compute
			computeHandler.RegisterRoutes(r)

			// Networking
			r.Route("/vpcs", func(r chi.Router) {
				r.Get("/", func(w http.ResponseWriter, req *http.Request) {
					projectID := req.URL.Query().Get("projectId")
					if projectID == "" {
						response.BadRequest(w, "projectId is required")
						return
					}
					vpcs, err := networkService.ListVPCs(req.Context(), projectID)
					if err != nil {
						response.Error(w, err)
						return
					}
					response.OK(w, vpcs)
				})
				r.Post("/", func(w http.ResponseWriter, req *http.Request) {
					orgID := middleware.GetOrganizationID(req.Context())
					var createReq network.CreateVPCRequest
					if err := decodeJSON(req, &createReq); err != nil {
						response.BadRequest(w, "invalid request body")
						return
					}
					vpc, err := networkService.CreateVPC(req.Context(), orgID, createReq)
					if err != nil {
						response.Error(w, err)
						return
					}
					response.Created(w, vpc)
				})
				r.Get("/{id}", func(w http.ResponseWriter, req *http.Request) {
					vpcID := chi.URLParam(req, "id")
					vpc, err := networkService.GetVPC(req.Context(), vpcID)
					if err != nil {
						response.Error(w, err)
						return
					}
					response.OK(w, vpc)
				})
				r.Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {
					vpcID := chi.URLParam(req, "id")
					if err := networkService.DeleteVPC(req.Context(), vpcID); err != nil {
						response.Error(w, err)
						return
					}
					response.NoContent(w)
				})
			})

			// Subnets
			r.Route("/subnets", func(r chi.Router) {
				r.Post("/", func(w http.ResponseWriter, req *http.Request) {
					var createReq network.CreateSubnetRequest
					if err := decodeJSON(req, &createReq); err != nil {
						response.BadRequest(w, "invalid request body")
						return
					}
					subnet, err := networkService.CreateSubnet(req.Context(), createReq)
					if err != nil {
						response.Error(w, err)
						return
					}
					response.Created(w, subnet)
				})
				r.Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {
					subnetID := chi.URLParam(req, "id")
					if err := networkService.DeleteSubnet(req.Context(), subnetID); err != nil {
						response.Error(w, err)
						return
					}
					response.NoContent(w)
				})
			})

			// Security Groups
			r.Route("/security-groups", func(r chi.Router) {
				r.Get("/", func(w http.ResponseWriter, req *http.Request) {
					vpcID := req.URL.Query().Get("vpcId")
					if vpcID == "" {
						response.BadRequest(w, "vpcId is required")
						return
					}
					sgs, err := networkService.ListSecurityGroups(req.Context(), vpcID)
					if err != nil {
						response.Error(w, err)
						return
					}
					response.OK(w, sgs)
				})
				r.Post("/", func(w http.ResponseWriter, req *http.Request) {
					var createReq network.CreateSecurityGroupRequest
					if err := decodeJSON(req, &createReq); err != nil {
						response.BadRequest(w, "invalid request body")
						return
					}
					sg, err := networkService.CreateSecurityGroup(req.Context(), createReq)
					if err != nil {
						response.Error(w, err)
						return
					}
					response.Created(w, sg)
				})
			})

			// Billing
			r.Route("/billing", func(r chi.Router) {
				r.Get("/usage", func(w http.ResponseWriter, req *http.Request) {
					orgID := middleware.GetOrganizationID(req.Context())
					usage, err := billingService.GetUsageSummary(req.Context(), orgID)
					if err != nil {
						response.Error(w, err)
						return
					}
					response.OK(w, usage)
				})
				r.Get("/invoices", func(w http.ResponseWriter, req *http.Request) {
					orgID := middleware.GetOrganizationID(req.Context())
					page := getQueryInt(req, "page", 1)
					perPage := getQueryInt(req, "perPage", 20)
					invoices, total, err := billingService.ListInvoices(req.Context(), orgID, page, perPage)
					if err != nil {
						response.Error(w, err)
						return
					}
					response.Paginated(w, invoices, page, perPage, total)
				})
				r.Get("/invoices/{id}", func(w http.ResponseWriter, req *http.Request) {
					invoiceID := chi.URLParam(req, "id")
					invoice, err := billingService.GetInvoice(req.Context(), invoiceID)
					if err != nil {
						response.Error(w, err)
						return
					}
					response.OK(w, invoice)
				})
				r.Get("/plans", func(w http.ResponseWriter, req *http.Request) {
					plans, err := billingService.ListPlans(req.Context())
					if err != nil {
						response.Error(w, err)
						return
					}
					response.OK(w, plans)
				})
				r.Get("/quota", func(w http.ResponseWriter, req *http.Request) {
					orgID := middleware.GetOrganizationID(req.Context())
					quota, err := billingService.GetQuotaUsage(req.Context(), orgID)
					if err != nil {
						response.Error(w, err)
						return
					}
					response.OK(w, quota)
				})
			})

			// Projects
			r.Route("/projects", func(r chi.Router) {
				r.Get("/", listProjects(db))
				r.Post("/", createProject(db))
				r.Get("/{id}", getProject(db))
				r.Put("/{id}", updateProject(db))
				r.Delete("/{id}", deleteProject(db))
			})

			// Admin routes (requires admin role)
			r.Route("/admin", func(r chi.Router) {
				r.Use(middleware.RequireRole("admin"))

				r.Get("/stats", getPlatformStats(db))
				r.Get("/datacenters", listDatacenters(db))
				r.Get("/datacenters/{id}", getDatacenter(db))
				r.Get("/tenants", listTenants(db))
				r.Get("/tenants/{id}", getTenant(db))
			})
		})
	})

	// Create server
	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port),
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	// Start server in goroutine
	go func() {
		log.Info("server listening", "address", server.Addr)
		fmt.Printf("\nCloud Platform API server starting on http://localhost:%s\n", cfg.Server.Port)
		fmt.Println("API endpoints available at http://localhost:" + cfg.Server.Port + "/api/v1")
		fmt.Println("\nAvailable endpoints:")
		fmt.Println("  POST   /api/v1/auth/register     - Register new user")
		fmt.Println("  POST   /api/v1/auth/login        - Login")
		fmt.Println("  POST   /api/v1/auth/refresh      - Refresh token")
		fmt.Println("  GET    /api/v1/auth/me           - Get current user")
		fmt.Println("  GET    /api/v1/vms               - List VMs")
		fmt.Println("  POST   /api/v1/vms               - Create VM")
		fmt.Println("  GET    /api/v1/vpcs              - List VPCs")
		fmt.Println("  GET    /api/v1/billing/usage     - Get usage summary")
		fmt.Println("\nObservability:")
		fmt.Println("  GET    /health                   - Detailed health check")
		fmt.Println("  GET    /ready                    - Readiness probe")
		fmt.Println("  GET    /live                     - Liveness probe")
		fmt.Println("  GET    /metrics                  - Prometheus metrics")
		fmt.Println()

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Error("server shutdown error", "error", err)
	}

	// Close database
	if err := database.Close(); err != nil {
		log.Error("database close error", "error", err)
	}

	log.Info("server stopped")
}

// Helper functions

func decodeJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func getQueryInt(r *http.Request, key string, defaultVal int) int {
	val := r.URL.Query().Get(key)
	if val == "" {
		return defaultVal
	}
	i, err := strconv.Atoi(val)
	if err != nil {
		return defaultVal
	}
	return i
}

func splitString(s, sep string) []string {
	var result []string
	current := ""
	for _, char := range s {
		if string(char) == sep {
			result = append(result, current)
			current = ""
		} else {
			current += string(char)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}

// Stub handlers for projects and admin routes

func listProjects(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orgID := middleware.GetOrganizationID(r.Context())
		var projects []database.Project
		db.Where("organization_id = ? AND deleted_at IS NULL", orgID).Find(&projects)
		response.OK(w, projects)
	}
}

func createProject(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orgID := middleware.GetOrganizationID(r.Context())
		var req struct {
			Name        string `json:"name"`
			Description string `json:"description"`
		}
		if err := decodeJSON(r, &req); err != nil {
			response.BadRequest(w, "invalid request body")
			return
		}
		project := database.Project{
			Name:           req.Name,
			Description:    req.Description,
			OrganizationID: orgID,
			Status:         "active",
		}
		if err := db.Create(&project).Error; err != nil {
			response.InternalError(w, "failed to create project")
			return
		}
		response.Created(w, project)
	}
}

func getProject(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		projectID := chi.URLParam(r, "id")
		var project database.Project
		if err := db.Where("id = ? AND deleted_at IS NULL", projectID).First(&project).Error; err != nil {
			response.NotFound(w, "project")
			return
		}
		response.OK(w, project)
	}
}

func updateProject(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		projectID := chi.URLParam(r, "id")
		var req struct {
			Name        string `json:"name"`
			Description string `json:"description"`
		}
		if err := decodeJSON(r, &req); err != nil {
			response.BadRequest(w, "invalid request body")
			return
		}
		var project database.Project
		if err := db.Where("id = ? AND deleted_at IS NULL", projectID).First(&project).Error; err != nil {
			response.NotFound(w, "project")
			return
		}
		updates := map[string]interface{}{}
		if req.Name != "" {
			updates["name"] = req.Name
		}
		if req.Description != "" {
			updates["description"] = req.Description
		}
		db.Model(&project).Updates(updates)
		response.OK(w, project)
	}
}

func deleteProject(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		projectID := chi.URLParam(r, "id")
		result := db.Model(&database.Project{}).Where("id = ?", projectID).Update("deleted_at", time.Now())
		if result.RowsAffected == 0 {
			response.NotFound(w, "project")
			return
		}
		response.NoContent(w)
	}
}

func getPlatformStats(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var tenantCount, vmCount, datacenterCount int64
		db.Model(&database.Organization{}).Count(&tenantCount)
		db.Model(&database.VM{}).Where("deleted_at IS NULL").Count(&vmCount)
		db.Model(&database.Datacenter{}).Count(&datacenterCount)

		response.OK(w, map[string]interface{}{
			"totalTenants":     tenantCount,
			"totalVMs":         vmCount,
			"totalDatacenters": datacenterCount,
			"revenue":          182500,
			"revenueGrowth":    8.1,
		})
	}
}

func listDatacenters(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var datacenters []database.Datacenter
		if err := db.Find(&datacenters).Error; err != nil {
			response.InternalError(w, "failed to fetch datacenters")
			return
		}
		response.OK(w, datacenters)
	}
}

func getDatacenter(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		dcID := chi.URLParam(r, "id")
		var datacenter database.Datacenter
		if err := db.Where("id = ?", dcID).First(&datacenter).Error; err != nil {
			response.NotFound(w, "datacenter")
			return
		}
		response.OK(w, datacenter)
	}
}

func listTenants(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var orgs []database.Organization
		db.Where("deleted_at IS NULL").Find(&orgs)
		response.OK(w, orgs)
	}
}

func getTenant(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := chi.URLParam(r, "id")
		var org database.Organization
		if err := db.Where("id = ?", tenantID).First(&org).Error; err != nil {
			response.NotFound(w, "tenant")
			return
		}
		response.OK(w, org)
	}
}
