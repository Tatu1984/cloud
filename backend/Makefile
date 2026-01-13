.PHONY: build run test clean docker-build docker-run docker-stop deps lint fmt

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
GOFMT=gofmt
BINARY_NAME=cloudplatform-api

# Docker parameters
DOCKER_IMAGE=cloudplatform-api
DOCKER_TAG=latest

all: deps build

# Download dependencies
deps:
	$(GOMOD) download
	$(GOMOD) tidy

# Build the application
build:
	$(GOBUILD) -o $(BINARY_NAME) -v ./cmd/api

# Run the application
run:
	$(GOCMD) run ./cmd/api

# Run tests
test:
	$(GOTEST) -v ./...

# Run tests with coverage
test-coverage:
	$(GOTEST) -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html

# Clean build artifacts
clean:
	rm -f $(BINARY_NAME)
	rm -f coverage.out coverage.html

# Format code
fmt:
	$(GOFMT) -w .

# Lint code
lint:
	golangci-lint run

# Build Docker image
docker-build:
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

# Run with Docker Compose
docker-run:
	docker-compose up -d

# Stop Docker Compose
docker-stop:
	docker-compose down

# View logs
docker-logs:
	docker-compose logs -f api

# Database migration
migrate-up:
	$(GOCMD) run ./cmd/api migrate up

migrate-down:
	$(GOCMD) run ./cmd/api migrate down

# Generate API documentation
docs:
	swag init -g cmd/api/main.go

# Development mode with hot reload
dev:
	air

# Install development tools
install-tools:
	go install github.com/air-verse/air@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/swaggo/swag/cmd/swag@latest

# Help
help:
	@echo "Available targets:"
	@echo "  deps          - Download and tidy dependencies"
	@echo "  build         - Build the application"
	@echo "  run           - Run the application"
	@echo "  test          - Run tests"
	@echo "  test-coverage - Run tests with coverage report"
	@echo "  clean         - Remove build artifacts"
	@echo "  fmt           - Format code"
	@echo "  lint          - Lint code"
	@echo "  docker-build  - Build Docker image"
	@echo "  docker-run    - Run with Docker Compose"
	@echo "  docker-stop   - Stop Docker Compose"
	@echo "  docker-logs   - View application logs"
	@echo "  dev           - Run with hot reload"
	@echo "  install-tools - Install development tools"
