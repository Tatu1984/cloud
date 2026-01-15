package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/cloudplatform/backend/internal/config"
)

func main() {
	// Parse command line flags
	direction := flag.String("direction", "up", "Migration direction: up or down")
	steps := flag.Int("steps", 0, "Number of migrations to run (0 = all)")
	flag.Parse()

	// Load configuration
	cfg := config.Load()

	// Build database URL
	dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.DBName,
		cfg.Database.SSLMode,
	)

	fmt.Printf("Running migrations (%s)...\n", *direction)
	fmt.Printf("Database: %s@%s:%s/%s\n",
		cfg.Database.User,
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.DBName,
	)

	// Note: In production, use golang-migrate/migrate library
	// For now, print instructions for manual migration
	fmt.Println("\nTo run migrations manually, use golang-migrate CLI:")
	fmt.Println("")
	fmt.Printf("# Install golang-migrate:\n")
	fmt.Printf("go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest\n")
	fmt.Println("")
	fmt.Printf("# Run migrations up:\n")
	fmt.Printf("migrate -path ./migrations -database \"%s\" up\n", dbURL)
	fmt.Println("")
	fmt.Printf("# Run migrations down:\n")
	fmt.Printf("migrate -path ./migrations -database \"%s\" down\n", dbURL)
	fmt.Println("")
	fmt.Printf("# Check migration version:\n")
	fmt.Printf("migrate -path ./migrations -database \"%s\" version\n", dbURL)

	if *direction != "up" && *direction != "down" {
		log.Fatal("Invalid direction. Use 'up' or 'down'")
	}

	_ = steps // Will be used with golang-migrate library

	os.Exit(0)
}
