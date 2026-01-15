# Cloud Platform - Technical Documentation

> **Last Updated:** January 14, 2026
>
> This document contains comprehensive technical documentation for developers working on the Cloud Platform project.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [API Reference](#5-api-reference)
6. [Frontend Documentation](#6-frontend-documentation)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [External Integrations](#8-external-integrations)
9. [Environment Configuration](#9-environment-configuration)
10. [Development Setup](#10-development-setup)
11. [Deployment](#11-deployment)
12. [Changelog](#12-changelog)

---

## 1. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Browser   │  │   Mobile    │  │     CLI     │  │   API SDK   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
└─────────┼────────────────┼────────────────┼────────────────┼───────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                                    │
                           ┌────────▼────────┐
                           │   Load Balancer │
                           │    (Vercel)     │
                           └────────┬────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          │                                                    │
┌─────────▼─────────┐                              ┌──────────▼──────────┐
│   FRONTEND        │                              │   BACKEND API       │
│   (Next.js 14)    │◄────── REST API ────────────►│   (Go 1.21+)        │
│   - Vercel        │                              │   - Railway/Render  │
│   - SSR/CSR       │                              │   - Port 8080       │
└───────────────────┘                              └──────────┬──────────┘
                                                              │
          ┌───────────────────────────────────────────────────┤
          │                    │                              │
┌─────────▼─────────┐ ┌───────▼───────┐           ┌──────────▼──────────┐
│   PostgreSQL      │ │     Redis     │           │  External Services  │
│   (Primary DB)    │ │   (Cache)     │           │  - Proxmox VE       │
│   - Port 5432     │ │   - Port 6379 │           │  - ZeroTier         │
└───────────────────┘ └───────────────┘           │  - Ceph Storage     │
                                                  └─────────────────────┘
```

### System Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js 14 | User interface, SSR, client-side routing |
| Backend API | Go 1.21+ | REST API, business logic, orchestration |
| Database | PostgreSQL 16 | Primary data store |
| Cache | Redis 7 | Session cache, rate limiting |
| Monitoring | Prometheus + Grafana | Metrics and visualization |
| Virtualization | Proxmox VE | VM provisioning and management |
| Networking | ZeroTier | Software-defined overlay networking |
| Storage | Ceph | Distributed block and object storage |

---

## 2. Technology Stack

### Backend

| Category | Technology | Version |
|----------|------------|---------|
| Language | Go | 1.21+ |
| HTTP Router | Chi | v5 |
| ORM | GORM | Latest |
| Database | PostgreSQL | 16 |
| Cache | Redis | 7 |
| Auth | JWT (golang-jwt) | v5 |
| Password Hashing | bcrypt | - |
| Containerization | Docker | - |

### Frontend

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js | 14.2.35 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 3.4.1 |
| UI Components | ShadcnUI (Radix UI) | Latest |
| State Management | Zustand | 5.0.9 |
| Forms | React Hook Form + Zod | 7.71.0 / 4.3.5 |
| Data Fetching | React Query | 5.90.16 |
| Icons | Lucide React | Latest |
| Charts | Recharts | 2.15.4 |

### Infrastructure

| Category | Technology | Purpose |
|----------|------------|---------|
| Compute | Proxmox VE | VM hypervisor |
| Networking | ZeroTier | Overlay networking |
| Storage | Ceph | Distributed storage |
| Monitoring | Prometheus | Metrics collection |
| Visualization | Grafana | Dashboards |

---

## 3. Project Structure

### Root Directory

```
cloud/
├── frontend/              # Next.js frontend application
├── backend/               # Go backend API
├── DEVELOPERS.md          # This documentation file
├── .gitignore            # Git ignore rules
└── azure-pipelines.yml   # CI/CD pipeline (Azure DevOps)
```

### Backend Structure

```
backend/
├── cmd/
│   └── api/
│       └── main.go              # Application entry point
├── internal/
│   ├── auth/
│   │   ├── jwt.go               # JWT token handling
│   │   └── password.go          # Password hashing utilities
│   ├── billing/
│   │   └── service.go           # Billing & usage tracking
│   ├── compute/
│   │   ├── handler.go           # HTTP handlers for compute
│   │   ├── service.go           # VM business logic
│   │   └── proxmox.go           # Proxmox API client
│   ├── config/
│   │   └── config.go            # Configuration management
│   ├── database/
│   │   ├── database.go          # Database connection
│   │   └── models.go            # GORM models
│   ├── handlers/
│   │   └── handlers.go          # Shared HTTP handlers
│   ├── iam/
│   │   ├── handler.go           # Auth HTTP handlers
│   │   └── service.go           # User/org business logic
│   ├── middleware/
│   │   ├── auth.go              # JWT authentication middleware
│   │   ├── logging.go           # Request logging
│   │   └── ratelimit.go         # Rate limiting
│   ├── models/
│   │   └── models.go            # Shared model definitions
│   ├── network/
│   │   ├── service.go           # Network business logic
│   │   └── zerotier.go          # ZeroTier API client
│   └── storage/
│       └── ceph.go              # Ceph API client
├── pkg/
│   ├── errors/
│   │   └── errors.go            # Custom error types
│   ├── logger/
│   │   └── logger.go            # Logging utilities
│   └── response/
│       └── response.go          # HTTP response helpers
├── Dockerfile                   # Container build
├── docker-compose.yml           # Local development stack
├── Makefile                     # Build commands
├── go.mod                       # Go module definition
└── prometheus.yml               # Prometheus configuration
```

### Frontend Structure

```
frontend/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── page.tsx             # Landing page (/)
│   │   ├── layout.tsx           # Root layout
│   │   ├── globals.css          # Global styles
│   │   ├── auth/                # Authentication pages
│   │   │   ├── layout.tsx       # Auth layout
│   │   │   ├── login/           # User login (/auth/login)
│   │   │   └── admin/login/     # Admin login (/auth/admin/login)
│   │   ├── dashboard/           # User dashboard (protected)
│   │   │   ├── layout.tsx       # Dashboard layout
│   │   │   ├── page.tsx         # Dashboard home
│   │   │   ├── compute/         # VMs, templates, snapshots
│   │   │   ├── kubernetes/      # K8s clusters
│   │   │   ├── networking/      # VPCs, security groups
│   │   │   ├── storage/         # Volumes, buckets
│   │   │   ├── databases/       # PostgreSQL, MySQL
│   │   │   ├── observability/   # Metrics, logs, alerts
│   │   │   ├── billing/         # Usage, invoices
│   │   │   └── settings/        # Organization settings
│   │   └── admin/               # Admin console (protected)
│   │       ├── layout.tsx       # Admin layout
│   │       ├── page.tsx         # Admin dashboard
│   │       ├── tenants/         # Tenant management
│   │       ├── infrastructure/  # Datacenters, nodes
│   │       ├── network/         # Network fabric
│   │       ├── storage/         # Ceph management
│   │       ├── operations/      # Platform ops
│   │       ├── security/        # Certificates, IAM
│   │       └── financials/      # Revenue, pricing
│   ├── components/
│   │   ├── ui/                  # ShadcnUI components (36+)
│   │   ├── layout/              # Layout components
│   │   │   ├── app-sidebar.tsx  # Sidebar navigation
│   │   │   └── header.tsx       # Top header
│   │   └── providers.tsx        # Global providers
│   ├── stores/
│   │   ├── auth-store.ts        # Authentication state
│   │   └── mock-data.ts         # Mock data for dev
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   ├── hooks/
│   │   ├── use-toast.ts         # Toast notifications
│   │   └── use-mobile.tsx       # Mobile detection
│   └── lib/
│       └── utils.ts             # Utility functions
├── public/                      # Static assets
├── package.json                 # Dependencies
├── tsconfig.json               # TypeScript config
├── tailwind.config.ts          # Tailwind config
├── next.config.mjs             # Next.js config
└── .env.example                # Environment template
```

---

## 4. Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Organization   │───────│      User       │───────│     Session     │
│─────────────────│  1:N  │─────────────────│  1:N  │─────────────────│
│ id              │       │ id              │       │ id              │
│ name            │       │ email           │       │ user_id         │
│ slug            │       │ name            │       │ refresh_token   │
│ plan            │       │ password_hash   │       │ expires_at      │
│ status          │       │ organization_id │       └─────────────────┘
│ settings (JSON) │       │ role            │
└────────┬────────┘       │ status          │       ┌─────────────────┐
         │                └────────┬────────┘       │     APIKey      │
         │                         │                │─────────────────│
         │ 1:N                     │ 1:N            │ id              │
         ▼                         ▼                │ user_id         │
┌─────────────────┐       ┌─────────────────┐       │ key_hash        │
│    Project      │       │     AuditLog    │       │ scopes          │
│─────────────────│       │─────────────────│       │ expires_at      │
│ id              │       │ id              │       └─────────────────┘
│ name            │       │ user_id         │
│ organization_id │       │ action          │
│ description     │       │ resource        │
│ status          │       │ details (JSON)  │
└────────┬────────┘       └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           RESOURCES                                  │
├─────────────────┬─────────────────┬─────────────────┬───────────────┤
│       VM        │       VPC       │     Volume      │   Database    │
│─────────────────│─────────────────│─────────────────│───────────────│
│ id              │ id              │ id              │ id            │
│ name            │ name            │ name            │ name          │
│ project_id      │ project_id      │ project_id      │ project_id    │
│ status          │ cidr            │ size            │ engine        │
│ vcpus           │ zerotier_id     │ type            │ version       │
│ memory          │ status          │ attached_to     │ status        │
│ disk            │                 │ encrypted       │ vcpus/memory  │
│ public_ip       │                 │                 │ endpoint      │
│ private_ip      │                 │                 │               │
└─────────────────┴─────────────────┴─────────────────┴───────────────┘
```

### Core Models

#### User Management

```go
// Organization - Multi-tenant organization
type Organization struct {
    ID        string         `gorm:"primaryKey"`
    Name      string         `gorm:"not null"`
    Slug      string         `gorm:"uniqueIndex;not null"`
    Plan      string         `gorm:"default:starter"`  // starter, professional, enterprise
    Status    string         `gorm:"default:active"`
    Settings  datatypes.JSON
    DeletedAt gorm.DeletedAt `gorm:"index"`
    CreatedAt time.Time
    UpdatedAt time.Time
}

// User - Platform user
type User struct {
    ID             string         `gorm:"primaryKey"`
    Email          string         `gorm:"uniqueIndex;not null"`
    Name           string         `gorm:"not null"`
    PasswordHash   string         `gorm:"not null"`
    Avatar         string
    OrganizationID string         `gorm:"not null"`
    EmailVerified  bool           `gorm:"default:false"`
    Status         string         `gorm:"default:active"`
    LastLoginAt    *time.Time
    DeletedAt      gorm.DeletedAt `gorm:"index"`
    CreatedAt      time.Time
    UpdatedAt      time.Time
}

// Project - Resource grouping within organization
type Project struct {
    ID             string         `gorm:"primaryKey"`
    Name           string         `gorm:"not null"`
    Description    string
    OrganizationID string         `gorm:"not null"`
    Status         string         `gorm:"default:active"`
    Settings       datatypes.JSON
    DeletedAt      gorm.DeletedAt `gorm:"index"`
    CreatedAt      time.Time
    UpdatedAt      time.Time
}
```

#### Compute Resources

```go
// VM - Virtual Machine
type VM struct {
    ID               string         `gorm:"primaryKey"`
    Name             string         `gorm:"not null"`
    ProjectID        string         `gorm:"not null"`
    DatacenterID     string
    ProxmoxClusterID string
    ProxmoxNodeID    string
    ProxmoxVMID      int
    Status           string         `gorm:"default:pending"`  // pending, creating, running, stopped, error
    VCPUs            int            `gorm:"not null"`
    Memory           int            `gorm:"not null"`         // MB
    DiskSize         int            `gorm:"not null"`         // GB
    OS               string         `gorm:"not null"`
    Template         string
    PublicIP         string
    PrivateIP        string
    SubnetID         string
    Tags             datatypes.JSON
    Metadata         datatypes.JSON
    DeletedAt        gorm.DeletedAt `gorm:"index"`
    CreatedAt        time.Time
    UpdatedAt        time.Time
}

// VMTemplate - Predefined VM configurations
type VMTemplate struct {
    ID              string `gorm:"primaryKey"`
    Name            string `gorm:"not null"`
    Description     string
    OS              string `gorm:"not null"`
    OSFamily        string // linux, windows
    DefaultVCPUs    int    `gorm:"default:1"`
    DefaultMemory   int    `gorm:"default:1024"`  // MB
    DefaultDisk     int    `gorm:"default:20"`    // GB
    ProxmoxTemplate string
    ImageURL        string
    IsPublic        bool   `gorm:"default:true"`
    Status          string `gorm:"default:active"`
    CreatedAt       time.Time
    UpdatedAt       time.Time
}
```

#### Networking

```go
// VPC - Virtual Private Cloud
type VPC struct {
    ID               string         `gorm:"primaryKey"`
    Name             string         `gorm:"not null"`
    ProjectID        string         `gorm:"not null"`
    CIDR             string         `gorm:"not null"`  // e.g., "10.0.0.0/16"
    Status           string         `gorm:"default:active"`
    ZeroTierNetworkID string
    DeletedAt        gorm.DeletedAt `gorm:"index"`
    CreatedAt        time.Time
    UpdatedAt        time.Time
}

// Subnet - Network segment within VPC
type Subnet struct {
    ID           string `gorm:"primaryKey"`
    Name         string `gorm:"not null"`
    VPCID        string `gorm:"not null"`
    CIDR         string `gorm:"not null"`  // e.g., "10.0.1.0/24"
    Zone         string
    IsPublic     bool   `gorm:"default:false"`
    GatewayIP    string
    AvailableIPs int
    CreatedAt    time.Time
    UpdatedAt    time.Time
}

// SecurityGroup - Firewall rule container
type SecurityGroup struct {
    ID          string `gorm:"primaryKey"`
    Name        string `gorm:"not null"`
    Description string
    VPCID       string `gorm:"not null"`
    IsDefault   bool   `gorm:"default:false"`
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

// SecurityGroupRule - Individual firewall rule
type SecurityGroupRule struct {
    ID              string `gorm:"primaryKey"`
    SecurityGroupID string `gorm:"not null"`
    Direction       string `gorm:"not null"`  // inbound, outbound
    Protocol        string `gorm:"not null"`  // tcp, udp, icmp, all
    PortFrom        int
    PortTo          int
    Source          string  // CIDR
    Description     string
    CreatedAt       time.Time
}
```

#### Storage

```go
// Volume - Block storage
type Volume struct {
    ID          string         `gorm:"primaryKey"`
    Name        string         `gorm:"not null"`
    ProjectID   string         `gorm:"not null"`
    Size        int            `gorm:"not null"`  // GB
    Type        string         `gorm:"default:ssd"`
    Status      string         `gorm:"default:available"`
    AttachedToVM string
    MountPath   string
    CephImageID string
    IOPS        int
    Throughput  int
    Encrypted   bool           `gorm:"default:false"`
    DeletedAt   gorm.DeletedAt `gorm:"index"`
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

// ObjectBucket - S3-compatible storage
type ObjectBucket struct {
    ID           string `gorm:"primaryKey"`
    Name         string `gorm:"uniqueIndex;not null"`
    ProjectID    string `gorm:"not null"`
    Status       string `gorm:"default:active"`
    Versioning   bool   `gorm:"default:false"`
    Encryption   bool   `gorm:"default:false"`
    PublicAccess bool   `gorm:"default:false"`
    SizeBytes    int64  `gorm:"default:0"`
    ObjectCount  int64  `gorm:"default:0"`
    CreatedAt    time.Time
    UpdatedAt    time.Time
}
```

#### Billing

```go
// BillingPlan - Subscription plans
type BillingPlan struct {
    ID            string         `gorm:"primaryKey"`
    Name          string         `gorm:"uniqueIndex;not null"`
    DisplayName   string         `gorm:"not null"`
    Description   string
    PriceMonthly  float64        `gorm:"not null"`
    MaxVMs        int            `gorm:"default:5"`
    MaxVCPUs      int            `gorm:"default:20"`
    MaxMemoryGB   int            `gorm:"default:64"`
    MaxStorageGB  int            `gorm:"default:500"`
    MaxProjects   int            `gorm:"default:3"`
    Features      datatypes.JSON
    IsActive      bool           `gorm:"default:true"`
    CreatedAt     time.Time
    UpdatedAt     time.Time
}

// UsageRecord - Resource usage tracking
type UsageRecord struct {
    ID             string    `gorm:"primaryKey"`
    OrganizationID string    `gorm:"not null;index"`
    ProjectID      string    `gorm:"index"`
    ResourceType   string    `gorm:"not null"`  // vm, volume, bandwidth, etc.
    ResourceID     string
    Quantity       float64   `gorm:"not null"`
    Unit           string    `gorm:"not null"`  // hours, gb, requests
    StartTime      time.Time `gorm:"not null"`
    EndTime        time.Time `gorm:"not null"`
    Cost           float64
    CreatedAt      time.Time
}
```

#### Admin Models

```go
// Datacenter - Physical datacenter
type Datacenter struct {
    ID            string         `gorm:"primaryKey"`
    Name          string         `gorm:"not null"`
    Code          string         `gorm:"uniqueIndex;not null"`  // e.g., "us-east-1"
    Location      string         `gorm:"not null"`
    Region        string         `gorm:"not null"`
    Status        string         `gorm:"default:active"`
    Latitude      float64
    Longitude     float64
    TotalCapacity datatypes.JSON
    CreatedAt     time.Time
    UpdatedAt     time.Time
}

// ProxmoxCluster - Virtualization cluster
type ProxmoxCluster struct {
    ID           string `gorm:"primaryKey"`
    Name         string `gorm:"not null"`
    DatacenterID string `gorm:"not null"`
    APIEndpoint  string `gorm:"not null"`
    Status       string `gorm:"default:active"`
    Version      string
    HasQuorum    bool   `gorm:"default:true"`
    TotalCPU     int
    UsedCPU      int
    TotalMemory  int64  // bytes
    UsedMemory   int64
    TotalStorage int64
    UsedStorage  int64
    CreatedAt    time.Time
    UpdatedAt    time.Time
}

// CephCluster - Storage cluster
type CephCluster struct {
    ID            string `gorm:"primaryKey"`
    Name          string `gorm:"not null"`
    FSID          string `gorm:"uniqueIndex"`
    Status        string `gorm:"default:active"`
    Health        string
    MonCount      int
    OSDCount      int
    TotalCapacity int64
    UsedCapacity  int64
    AvailCapacity int64
    CreatedAt     time.Time
    UpdatedAt     time.Time
}
```

---

## 5. API Reference

### Base URL

```
Production: https://do.roydevelops.tech/cloud-infps
Development: http://localhost:8080
```

### Authentication

All protected endpoints require a JWT Bearer token:

```
Authorization: Bearer <access_token>
```

### Endpoints

#### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-14T12:00:00Z"
}
```

#### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new user + organization | No |
| POST | `/api/v1/auth/login` | User login | No |
| POST | `/api/v1/auth/refresh` | Refresh access token | No |
| POST | `/api/v1/auth/logout` | Logout (invalidate session) | Yes |
| GET | `/api/v1/auth/me` | Get current user | Yes |
| PUT | `/api/v1/auth/me` | Update current user | Yes |
| POST | `/api/v1/auth/change-password` | Change password | Yes |

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Login Response:**
```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "eyJhbG...",
  "expires_in": 900,
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin",
    "organization_id": "org_123"
  }
}
```

#### Virtual Machines

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/vms` | List VMs (paginated) |
| POST | `/api/v1/vms` | Create VM |
| GET | `/api/v1/vms/{id}` | Get VM details |
| PUT | `/api/v1/vms/{id}` | Update VM |
| DELETE | `/api/v1/vms/{id}` | Delete VM |
| POST | `/api/v1/vms/{id}/action` | VM action (start/stop/reboot) |
| GET | `/api/v1/templates` | List VM templates |

**Create VM Request:**
```json
{
  "name": "web-server-01",
  "project_id": "proj_123",
  "template_id": "tpl_ubuntu22",
  "vcpus": 2,
  "memory": 4096,
  "disk_size": 50,
  "vpc_id": "vpc_123",
  "subnet_id": "sub_123"
}
```

**VM Action Request:**
```json
{
  "action": "start"  // start, stop, reboot, shutdown
}
```

#### Networking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/vpcs` | List VPCs |
| POST | `/api/v1/vpcs` | Create VPC |
| GET | `/api/v1/vpcs/{id}` | Get VPC details |
| DELETE | `/api/v1/vpcs/{id}` | Delete VPC |
| POST | `/api/v1/subnets` | Create subnet |
| DELETE | `/api/v1/subnets/{id}` | Delete subnet |
| GET | `/api/v1/security-groups` | List security groups |
| POST | `/api/v1/security-groups` | Create security group |

**Create VPC Request:**
```json
{
  "name": "production-vpc",
  "project_id": "proj_123",
  "cidr": "10.0.0.0/16"
}
```

#### Billing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/billing/usage` | Get usage summary |
| GET | `/api/v1/billing/invoices` | List invoices |
| GET | `/api/v1/billing/invoices/{id}` | Get invoice details |
| GET | `/api/v1/billing/plans` | List billing plans |
| GET | `/api/v1/billing/quota` | Get quota usage |

#### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects` | List projects |
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects/{id}` | Get project details |
| PUT | `/api/v1/projects/{id}` | Update project |
| DELETE | `/api/v1/projects/{id}` | Delete project |

#### Admin Endpoints (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/stats` | Platform statistics |
| GET | `/api/v1/admin/datacenters` | List datacenters |
| GET | `/api/v1/admin/datacenters/{id}` | Get datacenter details |
| GET | `/api/v1/admin/tenants` | List organizations |
| GET | `/api/v1/admin/tenants/{id}` | Get organization details |

### Error Responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "email": "must be a valid email address"
    }
  }
}
```

| HTTP Code | Error Code | Description |
|-----------|------------|-------------|
| 400 | VALIDATION_ERROR | Invalid request data |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

---

## 6. Frontend Documentation

### Route Structure

#### Public Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `page.tsx` | Landing page with features and login |
| `/auth/login` | `auth/login/page.tsx` | User login |
| `/auth/admin/login` | `auth/admin/login/page.tsx` | Admin login |

#### User Dashboard Routes (Protected)
| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | `dashboard/page.tsx` | Dashboard overview |
| `/dashboard/compute/vms` | VM listing | Virtual machines |
| `/dashboard/compute/vms/create` | VM creation form | Create new VM |
| `/dashboard/compute/templates` | Templates | VM templates |
| `/dashboard/networking/vpcs` | VPC listing | Virtual networks |
| `/dashboard/networking/security-groups` | Security groups | Firewall rules |
| `/dashboard/storage/volumes` | Volume listing | Block storage |
| `/dashboard/billing/usage` | Usage metrics | Resource usage |
| `/dashboard/settings/organization` | Org settings | Organization config |

#### Admin Routes (Protected, Admin Only)
| Route | Component | Description |
|-------|-----------|-------------|
| `/admin` | `admin/page.tsx` | Admin overview |
| `/admin/tenants` | Tenant listing | All organizations |
| `/admin/infrastructure/datacenters` | Datacenters | Physical locations |
| `/admin/infrastructure/clusters` | Proxmox clusters | Compute clusters |
| `/admin/infrastructure/nodes` | Physical nodes | Server nodes |
| `/admin/network/zerotier` | ZeroTier config | Overlay networking |
| `/admin/storage/ceph` | Ceph management | Storage clusters |
| `/admin/financials/revenue` | Revenue reports | Financial metrics |

### State Management (Zustand)

#### Auth Store

```typescript
// Location: src/stores/auth-store.ts

interface AuthState {
  user: User | null;
  organization: Organization | null;
  currentProject: Project | null;
  projects: Project[];
  isAuthenticated: boolean;
  isAdmin: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  login: (user: User, org: Organization) => void;
  logout: () => void;
}

// Usage
import { useAuthStore } from '@/stores/auth-store';

const { user, isAuthenticated, login, logout } = useAuthStore();
```

### TypeScript Types

```typescript
// Location: src/types/index.ts

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'user';
  organizationId: string;
  avatar?: string;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'professional' | 'enterprise';
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  organizationId: string;
  description?: string;
  createdAt: string;
}

interface VM {
  id: string;
  name: string;
  status: 'pending' | 'creating' | 'running' | 'stopped' | 'error';
  projectId: string;
  vcpus: number;
  memory: number;  // MB
  disk: number;    // GB
  os: string;
  publicIp?: string;
  privateIp?: string;
  region: string;
  zone: string;
  tags: string[];
  createdAt: string;
}

interface VPC {
  id: string;
  name: string;
  projectId: string;
  cidr: string;
  subnets: Subnet[];
  region: string;
  createdAt: string;
}
```

### UI Components

The project uses **ShadcnUI** (Radix UI + Tailwind CSS). Components are located in `src/components/ui/`.

Key components:
- `Button` - Action buttons with variants
- `Card` - Container cards
- `Dialog` - Modal dialogs
- `Select` - Dropdown selects
- `Table` - Data tables
- `Tabs` - Tab navigation
- `Toast` - Notifications
- `Sidebar` - Navigation sidebar

Usage:
```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Virtual Machines</CardTitle>
  </CardHeader>
  <CardContent>
    <Button variant="default">Create VM</Button>
  </CardContent>
</Card>
```

---

## 7. Authentication & Authorization

### JWT Token Flow

```
┌──────────┐      POST /auth/login      ┌──────────┐
│  Client  │ ────────────────────────► │  Server  │
│          │   { email, password }      │          │
│          │                            │          │
│          │ ◄──────────────────────── │          │
│          │   { access_token,          │          │
│          │     refresh_token }        │          │
└──────────┘                            └──────────┘
     │
     │  Store tokens (localStorage)
     │
     ▼
┌──────────┐   GET /api/v1/vms          ┌──────────┐
│  Client  │ ────────────────────────► │  Server  │
│          │   Authorization: Bearer    │          │
│          │   <access_token>           │          │
│          │                            │          │
│          │ ◄──────────────────────── │          │
│          │   { vms: [...] }           │          │
└──────────┘                            └──────────┘
```

### Token Configuration

```go
// JWT Configuration (backend)
JWTConfig struct {
    Secret          string        // 256-bit secret key
    AccessTokenTTL  time.Duration // 15 minutes
    RefreshTokenTTL time.Duration // 7 days
    Issuer          string        // "cloudplatform"
}
```

### Role-Based Access Control (RBAC)

| Role | Description | Access |
|------|-------------|--------|
| `admin` | Platform administrator | Full access to admin console + dashboard |
| `operator` | Operations user | Admin console access (limited) |
| `user` | Regular tenant user | Dashboard access only |

### Middleware

```go
// Authentication middleware (required on protected routes)
r.Use(middleware.Authenticate(jwtService))

// Role-based middleware
r.Use(middleware.RequireRole("admin", "operator"))

// Admin-only middleware
r.Use(middleware.RequireAdmin())
```

### Demo Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| User | `user@demo.com` | `demo123` | `/dashboard` |
| Admin | `admin@demo.com` | `admin123` | `/admin` + `/dashboard` |

---

### 7.1 Microsoft Entra ID (Azure AD) SSO

The platform supports Single Sign-On (SSO) via Microsoft Entra ID (formerly Azure Active Directory).

#### Prerequisites

- Microsoft Entra ID tenant (Azure subscription with Entra ID)
- Administrative access to register applications in Entra ID

#### Step 1: Register Application in Azure Portal

1. **Navigate to Azure Portal**
   - Go to: https://portal.azure.com
   - Select: `Microsoft Entra ID` > `App registrations` > `New registration`

2. **Configure Application**
   ```
   Name: Cloud Platform
   Supported account types: Accounts in this organizational directory only (Single tenant)
   Redirect URI (Web): http://localhost:3000/auth/callback
   ```

3. **Note the Application Values**
   ```
   Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Directory (tenant) ID: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
   ```

#### Step 2: Create Client Secret

1. **Navigate to Certificates & Secrets**
   - Go to: `App registrations` > Your App > `Certificates & secrets`
   - Click: `New client secret`

2. **Create Secret**
   ```
   Description: Cloud Platform Backend
   Expires: 24 months (recommended)
   ```

3. **Copy the Secret Value**
   > ⚠️ Copy immediately! The value is only shown once.

#### Step 3: Configure API Permissions

1. **Add Required Permissions**
   - Go to: `API permissions` > `Add a permission`
   - Select: `Microsoft Graph` > `Delegated permissions`
   - Add:
     - `openid`
     - `profile`
     - `email`
     - `User.Read`

2. **Grant Admin Consent** (if required by your organization)
   - Click: `Grant admin consent for [tenant]`

#### Step 4: Configure Redirect URIs

Add all required redirect URIs:
```
http://localhost:3000/auth/callback          # Local development
https://your-domain.com/auth/callback        # Production
```

#### Step 5: Backend Environment Variables

```bash
# Microsoft Entra ID Configuration
ENTRA_ID_ENABLED=true
ENTRA_ID_TENANT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
ENTRA_ID_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ENTRA_ID_CLIENT_SECRET=your-client-secret-value
ENTRA_ID_REDIRECT_URI=http://localhost:3000/auth/callback

# Optional: Restrict to specific email domains
ENTRA_ID_ALLOWED_DOMAINS=yourdomain.com,anotherdomain.com

# Auto-provision new users on first SSO login
ENTRA_ID_AUTO_PROVISION=true
ENTRA_ID_DEFAULT_ROLE=user
```

#### Step 6: Frontend Environment Variables

```bash
# Microsoft Entra ID Configuration
NEXT_PUBLIC_ENTRA_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_ENTRA_TENANT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
NEXT_PUBLIC_ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback
```

#### Authentication Flow

```
┌──────────┐                    ┌──────────────┐                    ┌──────────┐
│  Client  │                    │  Microsoft   │                    │  Backend │
│ (Browser)│                    │  Entra ID    │                    │   API    │
└────┬─────┘                    └──────┬───────┘                    └────┬─────┘
     │                                 │                                 │
     │  1. Click "Sign in with Microsoft"                               │
     │─────────────────────────────────►                                │
     │                                 │                                 │
     │  2. Redirect to Microsoft login │                                │
     │◄─────────────────────────────────                                │
     │                                 │                                 │
     │  3. User authenticates          │                                │
     │─────────────────────────────────►                                │
     │                                 │                                 │
     │  4. Return authorization code   │                                │
     │◄─────────────────────────────────                                │
     │                                 │                                 │
     │  5. POST /auth/microsoft/callback (code)                         │
     │──────────────────────────────────────────────────────────────────►
     │                                 │                                 │
     │                                 │  6. Exchange code for tokens   │
     │                                 │◄────────────────────────────────
     │                                 │                                 │
     │                                 │  7. Return ID token            │
     │                                 │────────────────────────────────►
     │                                 │                                 │
     │  8. Return JWT tokens + user info                                │
     │◄──────────────────────────────────────────────────────────────────
     │                                 │                                 │
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/config` | Get auth configuration (includes Entra ID status) |
| GET | `/api/v1/auth/microsoft` | Get Microsoft authorization URL |
| POST | `/api/v1/auth/microsoft/callback` | Exchange auth code for tokens |

#### Troubleshooting

| Issue | Solution |
|-------|----------|
| `AADSTS50011: Reply URL mismatch` | Ensure redirect URI in Azure matches exactly |
| `AADSTS700016: Application not found` | Verify client ID is correct |
| `Token validation failed` | Check tenant ID and token audience |
| `Email domain not allowed` | Add domain to `ENTRA_ID_ALLOWED_DOMAINS` |
| `User not found` | Enable `ENTRA_ID_AUTO_PROVISION=true` |

---

## 8. External Integrations & Deployment Guide

This section provides step-by-step instructions for connecting to the infrastructure services.

---

### 8.1 Proxmox VE

**Purpose:** Virtual machine provisioning and lifecycle management

#### Prerequisites

- Proxmox VE 7.x or 8.x installed and accessible
- Network connectivity from the backend server to Proxmox API (port 8006)
- Administrative access to create API tokens

#### Step 1: Create API Token in Proxmox

1. **Login to Proxmox Web UI**
   ```
   https://<proxmox-ip>:8006
   ```

2. **Navigate to API Tokens**
   - Go to: `Datacenter` → `Permissions` → `API Tokens`
   - Click `Add`

3. **Create the Token**
   ```
   User:         root@pam (or your admin user)
   Token ID:     cloudplatform
   Privilege Separation: Unchecked (for full access)
   ```

4. **Save the Token Secret**
   > ⚠️ The secret is only shown once! Copy it immediately.
   ```
   Token: root@pam!cloudplatform
   Secret: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

#### Step 2: Configure Environment Variables

```bash
# Proxmox Configuration
PROXMOX_API_URL=https://192.168.1.100:8006/api2/json
PROXMOX_USER=root@pam
PROXMOX_TOKEN_ID=cloudplatform
PROXMOX_TOKEN_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PROXMOX_VERIFY_SSL=false  # Set to true if using valid SSL cert
```

#### Step 3: Test Connection

```bash
# Test API connectivity
curl -k -H "Authorization: PVEAPIToken=root@pam!cloudplatform=<secret>" \
  https://<proxmox-ip>:8006/api2/json/version

# Expected response:
# {"data":{"version":"8.1.3","release":"8.1","repoid":"..."}}
```

#### Step 4: Required Proxmox Permissions

For production, create a dedicated user with minimal permissions:

```bash
# On Proxmox server, create role
pveum role add CloudPlatform -privs "VM.Allocate VM.Clone VM.Config.CDROM VM.Config.CPU VM.Config.Cloudinit VM.Config.Disk VM.Config.HWType VM.Config.Memory VM.Config.Network VM.Config.Options VM.Monitor VM.Audit VM.PowerMgmt Datastore.AllocateSpace Datastore.Audit SDN.Use"

# Create user
pveum user add cloudplatform@pve

# Create API token
pveum user token add cloudplatform@pve api --privsep=0

# Assign role
pveum aclmod / -user cloudplatform@pve -role CloudPlatform
```

#### Proxmox API Operations

| Operation | API Endpoint | Method |
|-----------|--------------|--------|
| List VMs | `/nodes/{node}/qemu` | GET |
| Create VM | `/nodes/{node}/qemu` | POST |
| Start VM | `/nodes/{node}/qemu/{vmid}/status/start` | POST |
| Stop VM | `/nodes/{node}/qemu/{vmid}/status/stop` | POST |
| Delete VM | `/nodes/{node}/qemu/{vmid}` | DELETE |
| Clone VM | `/nodes/{node}/qemu/{vmid}/clone` | POST |
| Get Status | `/nodes/{node}/qemu/{vmid}/status/current` | GET |

---

### 8.2 ZeroTier

**Purpose:** Software-defined overlay networking for VPCs

#### Prerequisites

- ZeroTier Central account OR self-hosted ZeroTier controller
- ZeroTier One installed on all nodes that need connectivity

#### Option A: ZeroTier Central (Recommended for getting started)

1. **Create Account**
   - Go to: https://my.zerotier.com
   - Sign up for free account

2. **Create Network**
   - Click `Create A Network`
   - Note the 16-character Network ID (e.g., `a09acf02337b1234`)

3. **Get API Token**
   - Go to: `Account` → `API Access Tokens`
   - Click `Generate New Token`
   - Save the token securely

4. **Configure Environment**
   ```bash
   ZEROTIER_CONTROLLER_URL=https://api.zerotier.com/api/v1
   ZEROTIER_API_TOKEN=<your-api-token>
   ZEROTIER_NETWORK_ID=a09acf02337b1234
   ```

#### Option B: Self-Hosted Controller

1. **Install ZeroTier with Controller**
   ```bash
   # Install ZeroTier
   curl -s https://install.zerotier.com | sudo bash

   # Enable controller mode
   sudo zerotier-cli set <node-id> allowManaged=1
   ```

2. **Generate Controller Token**
   ```bash
   # Get authtoken
   sudo cat /var/lib/zerotier-one/authtoken.secret
   ```

3. **Create Network via API**
   ```bash
   # Create new network
   curl -X POST http://localhost:9993/controller/network/<node-id>______ \
     -H "X-ZT1-AUTH: <authtoken>" \
     -d '{}'
   ```

4. **Configure Environment**
   ```bash
   ZEROTIER_CONTROLLER_URL=http://localhost:9993
   ZEROTIER_API_TOKEN=<authtoken-secret>
   ZEROTIER_NETWORK_ID=<network-id>
   ```

#### Step: Test ZeroTier Connection

```bash
# For ZeroTier Central
curl -H "Authorization: token <api-token>" \
  https://api.zerotier.com/api/v1/network

# For self-hosted
curl -H "X-ZT1-AUTH: <authtoken>" \
  http://localhost:9993/controller/network
```

#### ZeroTier API Operations

| Operation | API Endpoint | Method |
|-----------|--------------|--------|
| List Networks | `/network` | GET |
| Get Network | `/network/{networkId}` | GET |
| Create Network | `/network/{networkId}` | POST |
| Delete Network | `/network/{networkId}` | DELETE |
| List Members | `/network/{networkId}/member` | GET |
| Authorize Member | `/network/{networkId}/member/{nodeId}` | POST |

#### Joining VMs to ZeroTier Network

```bash
# On each VM that needs network access
curl -s https://install.zerotier.com | sudo bash
sudo zerotier-cli join <network-id>

# Authorize in ZeroTier Central or via API
curl -X POST "https://api.zerotier.com/api/v1/network/<network-id>/member/<node-id>" \
  -H "Authorization: token <api-token>" \
  -d '{"config": {"authorized": true}}'
```

---

### 8.3 Ceph Storage

**Purpose:** Distributed block and object storage

#### Prerequisites

- Ceph cluster deployed (Quincy or Reef recommended)
- Network connectivity to Ceph monitors
- Ceph client credentials (keyring)

#### Step 1: Get Ceph Credentials

```bash
# On a Ceph monitor node, get the admin keyring
sudo ceph auth get-or-create client.cloudplatform \
  mon 'allow r' \
  osd 'allow rwx pool=cloudplatform' \
  -o /etc/ceph/ceph.client.cloudplatform.keyring

# Get the key
sudo ceph auth get client.cloudplatform
```

#### Step 2: Create Storage Pool

```bash
# Create RBD pool for block storage
sudo ceph osd pool create cloudplatform 128
sudo ceph osd pool application enable cloudplatform rbd
sudo rbd pool init cloudplatform
```

#### Step 3: Configure Environment

```bash
# Ceph Configuration
CEPH_MON_HOSTS=192.168.1.10,192.168.1.11,192.168.1.12
CEPH_USER=cloudplatform
CEPH_KEYRING=/etc/ceph/ceph.client.cloudplatform.keyring
CEPH_POOL=cloudplatform
```

#### Step 4: Test Connection

```bash
# Test cluster connectivity
ceph -s --id cloudplatform

# Test RBD access
rbd ls cloudplatform --id cloudplatform
```

#### Ceph Operations

| Operation | Command |
|-----------|---------|
| Create Volume | `rbd create --size 10G cloudplatform/volume-001` |
| Delete Volume | `rbd rm cloudplatform/volume-001` |
| Resize Volume | `rbd resize --size 20G cloudplatform/volume-001` |
| Create Snapshot | `rbd snap create cloudplatform/volume-001@snap1` |
| Clone Volume | `rbd clone cloudplatform/vol@snap cloudplatform/vol-clone` |

---

### 8.4 Network Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLOUD PLATFORM                                │
│  ┌─────────────┐                                                    │
│  │   Backend   │                                                    │
│  │   Server    │                                                    │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ├──────────────────┬───────────────────┬──────────────────┐│
│         │                  │                   │                  ││
│         ▼                  ▼                   ▼                  ▼│
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐│
│  │   Proxmox    │  │   ZeroTier   │  │    Ceph      │  │  Redis  ││
│  │   Cluster    │  │  Controller  │  │   Cluster    │  │  Cache  ││
│  │  :8006/api   │  │    :9993     │  │   :6789      │  │  :6379  ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────┘│
│         │                  │                   │                   │
│         │         ┌────────┴────────┐          │                   │
│         │         │  ZeroTier       │          │                   │
│         │         │  Overlay Net    │          │                   │
│         │         │  (10.147.x.x)   │          │                   │
│         │         └────────┬────────┘          │                   │
│         │                  │                   │                   │
│         ▼                  ▼                   ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    VIRTUAL MACHINES                          │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │  │
│  │  │  VM 1   │  │  VM 2   │  │  VM 3   │  │  VM N   │         │  │
│  │  │ ZT+RBD  │  │ ZT+RBD  │  │ ZT+RBD  │  │ ZT+RBD  │         │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘         │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 8.5 Troubleshooting

#### Proxmox Connection Issues

| Issue | Solution |
|-------|----------|
| `SSL certificate problem` | Set `PROXMOX_VERIFY_SSL=false` or add valid cert |
| `401 Unauthorized` | Verify token format: `user@realm!tokenid=secret` |
| `Connection refused` | Check firewall, ensure port 8006 is open |
| `Permission denied` | Verify API token has required privileges |

#### ZeroTier Connection Issues

| Issue | Solution |
|-------|----------|
| `OFFLINE` status | Check ZeroTier service: `systemctl status zerotier-one` |
| `ACCESS_DENIED` | Member not authorized - authorize via API/Central |
| `NO_DIRECT_PATH` | Check firewall UDP 9993, may need relay |
| `Network not found` | Verify network ID is correct |

#### Ceph Connection Issues

| Issue | Solution |
|-------|----------|
| `RADOS permission denied` | Check keyring path and permissions |
| `Monitor connection failed` | Verify MON_HOSTS IPs, check port 6789 |
| `Pool does not exist` | Create pool: `ceph osd pool create <name> 128` |
| `No space left` | Check cluster capacity: `ceph df` |

---

## 9. Environment Configuration

### Backend Environment Variables

```bash
# Server
PORT=8080
HOST=0.0.0.0
ENVIRONMENT=development  # development, production

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=cloudplatform
DB_PASSWORD=cloudplatform
DB_NAME=cloudplatform
DB_SSL_MODE=disable

# JWT
JWT_SECRET=your-256-bit-secret-key-change-in-production
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=168h

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com

# Proxmox (optional)
PROXMOX_API_URL=https://proxmox.local:8006/api2/json
PROXMOX_USER=root@pam
PROXMOX_TOKEN_ID=
PROXMOX_TOKEN_SECRET=
PROXMOX_VERIFY_SSL=false

# ZeroTier (optional)
ZEROTIER_CONTROLLER_URL=http://localhost:9993
ZEROTIER_API_TOKEN=
ZEROTIER_NETWORK_ID=

# Ceph (optional)
CEPH_MON_HOSTS=localhost
CEPH_USER=admin
CEPH_KEYRING=/etc/ceph/ceph.client.admin.keyring
CEPH_POOL=cloudplatform
```

### Frontend Environment Variables

```bash
# API URL
NEXT_PUBLIC_API_URL=http://localhost:8080

# Production
# NEXT_PUBLIC_API_URL=https://do.roydevelops.tech/cloud-infps
```

---

## 10. Development Setup

### Prerequisites

- Go 1.21+
- Node.js 20+
- Docker & Docker Compose
- Git

### Backend Setup

```bash
# Clone repository
git clone git@github.com:Tatu1984/cloud.git
cd cloud/backend

# Start dependencies (PostgreSQL, Redis, etc.)
docker-compose up -d

# Run backend
make run
# OR
go run ./cmd/api

# Build binary
make build

# Run tests
make test
```

### Frontend Setup

```bash
cd cloud/frontend

# Install dependencies
npm install

# Create env file
cp .env.example .env.local
# Edit .env.local with your API URL

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Full Stack Development

```bash
# Terminal 1: Backend
cd backend && docker-compose up -d && make run

# Terminal 2: Frontend
cd frontend && npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Grafana: http://localhost:3001 (admin/admin)
- Prometheus: http://localhost:9090

---

## 11. Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Set Root Directory: `frontend`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://do.roydevelops.tech/cloud-infps`
5. Deploy

### Backend (Railway/Render)

1. Push to GitHub
2. Create new service in Railway/Render
3. Set Root Directory: `backend`
4. Add environment variables (see [Environment Configuration](#9-environment-configuration))
5. Deploy

### Docker Deployment

```bash
# Build backend image
cd backend
docker build -t cloud-api:latest .

# Run with docker-compose
docker-compose up -d
```

---

## 12. Changelog

### January 14, 2026

#### Added
- Landing page with animated design (adapted from MicroDataCluster)
- User login page (`/auth/login`) with demo credentials
- Admin login page (`/auth/admin/login`) with demo credentials
- Auth layout for login pages
- Auth protection on dashboard and admin routes
- Demo credentials display on landing and login pages

#### Changed
- Updated auth store to start logged out (removed default mock login)
- Login redirects: User → `/dashboard`, Admin → `/admin`

#### Fixed
- Removed `output: 'standalone'` from Next.js config for Vercel compatibility
- Fixed Dockerfile to handle missing `go.sum`
- Fixed unused import in `zerotier.go`
- Fixed PostgreSQL version mismatch in Docker volumes
- Fixed landing page center alignment (added `mx-auto` to all container elements)

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| User | `user@demo.com` | `demo123` |
| Admin | `admin@demo.com` | `admin123` |

---

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test
3. Commit with descriptive message
4. Push and create pull request
5. Update this documentation with any architectural changes

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/Tatu1984/cloud/issues
- Documentation: This file (`DEVELOPERS.md`)
