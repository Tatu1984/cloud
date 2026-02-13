# =============================================================================
# MicroDataCenter WebAPI - Makefile
# =============================================================================

.PHONY: help restore build run test clean docker-build docker-up docker-down \
        db-migrate db-update ef-add-migration

# Default target
help:
	@echo "MicroDataCenter WebAPI - Development Commands"
	@echo "=============================================="
	@echo ""
	@echo "Development:"
	@echo "  make restore       - Restore NuGet packages"
	@echo "  make build         - Build the solution"
	@echo "  make run           - Run the API locally"
	@echo "  make test          - Run all tests"
	@echo "  make clean         - Clean build artifacts"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build  - Build Docker image"
	@echo "  make docker-up     - Start with Docker Compose"
	@echo "  make docker-down   - Stop Docker Compose"
	@echo "  make docker-logs   - View Docker logs"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate    - Apply pending migrations"
	@echo "  make db-update     - Update database schema"
	@echo "  make ef-add-migration NAME=<name>  - Add new migration"
	@echo ""
	@echo "VS Code:"
	@echo "  make code          - Open in VS Code"
	@echo ""

# =============================================================================
# Development
# =============================================================================

restore:
	dotnet restore

build: restore
	dotnet build

run:
	cd MDC.Api && dotnet run

run-watch:
	cd MDC.Api && dotnet watch run

test:
	dotnet test

clean:
	dotnet clean
	rm -rf */bin */obj

# =============================================================================
# Docker
# =============================================================================

docker-build:
	docker build -t mdc-api:latest .

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f mdc-api

docker-clean:
	docker-compose down -v --remove-orphans

# =============================================================================
# Database (Entity Framework)
# =============================================================================

db-migrate:
	cd MDC.Api && dotnet ef database update --project ../MDC.Core

db-update: db-migrate

ef-add-migration:
ifndef NAME
	$(error NAME is required. Usage: make ef-add-migration NAME=<migration-name>)
endif
	cd MDC.Api && dotnet ef migrations add $(NAME) --project ../MDC.Core --output-dir Migrations

ef-remove-migration:
	cd MDC.Api && dotnet ef migrations remove --project ../MDC.Core

ef-list-migrations:
	cd MDC.Api && dotnet ef migrations list --project ../MDC.Core

# =============================================================================
# VS Code
# =============================================================================

code:
	code .

# =============================================================================
# Utilities
# =============================================================================

swagger:
	@echo "Swagger UI: http://localhost:5000/swagger"
	@echo "Scalar Docs: http://localhost:5000/scalar"
	open http://localhost:5000/swagger

health:
	curl -s http://localhost:5000/health | jq .
