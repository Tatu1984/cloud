# Cloud Platform User Manual

> **Version:** 1.1
> **Last Updated:** January 16, 2026
> **Audience:** Platform Users, Administrators, and Operators

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [User Dashboard Guide](#3-user-dashboard-guide)
4. [MicroDataCluster Integration](#4-microdatacluster-integration)
5. [Admin Console Guide](#5-admin-console-guide)
6. [Quick Reference](#6-quick-reference)

---

# 1. Introduction

## 1.1 About This Manual

This manual serves as a comprehensive training guide for the Cloud Platform. It covers all features accessible through the User Dashboard (for tenants/customers) and the Admin Console (for platform operators).

## 1.2 User Roles

| Role | Access Level | Description |
|------|--------------|-------------|
| **User** | User Dashboard | Regular tenant users who manage their organization's cloud resources |
| **Admin** | User Dashboard + Admin Console | Platform administrators with full access to all features |
| **Operator** | Admin Console (limited) | Operations staff managing infrastructure and tenants |

## 1.3 Logging In

1. Navigate to the platform URL
2. Choose your login type:
   - **User Login:** `/auth/login` - For regular users
   - **Admin Login:** `/auth/admin/login` - For administrators
3. Enter credentials or use "Sign in with Microsoft" for SSO

---

# 2. Getting Started

## 2.1 First Login

After logging in, you will see:
- **Users:** The User Dashboard with your organization's resources
- **Admins:** The Admin Console for platform management

## 2.2 Navigation

- **Sidebar:** Main navigation on the left side
- **Header:** Top bar with notifications, search, and profile menu
- **Project Selector:** (User Dashboard) Switch between projects within your organization

---

# 3. User Dashboard Guide

The User Dashboard is where tenants manage their cloud resources. Access it at `/dashboard`.

---

## 3.1 Dashboard (Overview)

**Location:** `/dashboard`
**Icon:** Layout Dashboard
**Purpose:** Provide a high-level overview of your cloud environment

### What You'll See
- **Resource Summary:** Total VMs, storage used, network resources
- **Usage Charts:** CPU, memory, and storage utilization over time
- **Recent Activity:** Latest actions and changes in your environment
- **Quick Actions:** Buttons to create VMs, view billing, etc.
- **Alerts:** Active warnings or issues requiring attention

### How to Use
1. Review the summary cards for resource counts
2. Check usage trends to plan capacity
3. Click on any metric to drill down into details
4. Use quick action buttons for common tasks

---

## 3.2 Compute

**Icon:** Server
**Purpose:** Manage virtual machines and compute resources

### 3.2.1 Virtual Machines

**Location:** `/dashboard/compute/vms`
**Purpose:** Create, manage, and monitor virtual machines

#### Features
- **List View:** See all VMs with status, specs, and IPs
- **Create VM:** Launch new virtual machines from templates
- **Actions:** Start, stop, reboot, resize, snapshot, delete
- **Console Access:** Connect to VM console via browser

#### How to Create a VM
1. Click **"+ Create VM"**
2. Select a template (Ubuntu, CentOS, Windows, etc.)
3. Choose size (vCPUs, memory, disk)
4. Configure networking (VPC, subnet)
5. Add SSH keys or set password
6. Review and launch

#### Common Tasks
| Task | Steps |
|------|-------|
| Start VM | Click VM → Actions → Start |
| Stop VM | Click VM → Actions → Stop |
| Resize VM | Click VM → Actions → Resize → Select new size |
| Take Snapshot | Click VM → Actions → Create Snapshot |
| Delete VM | Click VM → Actions → Delete → Confirm |

### 3.2.2 Templates

**Location:** `/dashboard/compute/templates`
**Purpose:** Manage VM templates for quick provisioning

#### Features
- **System Templates:** Pre-built OS images (Ubuntu, CentOS, Windows)
- **Custom Templates:** Your own saved VM configurations
- **Create Template:** Save a VM as a reusable template

### 3.2.3 Snapshots

**Location:** `/dashboard/compute/snapshots`
**Purpose:** Manage point-in-time backups of VMs

#### Features
- **List Snapshots:** View all snapshots with size and creation date
- **Restore:** Revert a VM to a previous state
- **Create VM from Snapshot:** Launch a new VM from snapshot
- **Delete:** Remove old snapshots to free storage

---

## 3.3 Kubernetes

**Icon:** Container
**Purpose:** Manage Kubernetes clusters for container orchestration

### 3.3.1 Clusters

**Location:** `/dashboard/kubernetes/clusters`
**Purpose:** Create and manage Kubernetes clusters

#### Features
- **Cluster List:** View all clusters with status and node count
- **Create Cluster:** Deploy new Kubernetes cluster
- **Kubeconfig:** Download configuration for kubectl access
- **Upgrade:** Update cluster to newer Kubernetes version
- **Scale:** Add or remove worker nodes

### 3.3.2 Node Pools

**Location:** `/dashboard/kubernetes/node-pools`
**Purpose:** Manage groups of worker nodes within clusters

#### Features
- **Pool Management:** Create pools with different VM sizes
- **Auto-scaling:** Configure minimum/maximum nodes
- **Labels/Taints:** Add Kubernetes node labels and taints

### 3.3.3 Registry

**Location:** `/dashboard/kubernetes/registry`
**Purpose:** Private container image registry

#### Features
- **Repositories:** Organize container images
- **Push/Pull:** Docker commands for image management
- **Access Tokens:** Generate tokens for CI/CD integration

---

## 3.4 Networking

**Icon:** Network
**Purpose:** Configure virtual networks and connectivity

### 3.4.1 VPCs (Virtual Private Clouds)

**Location:** `/dashboard/networking/vpcs`
**Purpose:** Create isolated network environments

#### Features
- **Create VPC:** Define a private network with CIDR block
- **VPC Peering:** Connect multiple VPCs together
- **Internet Gateway:** Enable outbound internet access

#### How to Create a VPC
1. Click **"+ Create VPC"**
2. Enter name and CIDR block (e.g., 10.0.0.0/16)
3. Select region
4. Click Create

### 3.4.2 Subnets

**Location:** `/dashboard/networking/subnets`
**Purpose:** Divide VPCs into smaller network segments

#### Features
- **Create Subnet:** Define subnet within a VPC
- **Public/Private:** Configure internet accessibility
- **Route Tables:** Associate routing rules

### 3.4.3 Security Groups

**Location:** `/dashboard/networking/security-groups`
**Purpose:** Virtual firewalls for network access control

#### Features
- **Inbound Rules:** Control incoming traffic
- **Outbound Rules:** Control outgoing traffic
- **Apply to Resources:** Attach to VMs, databases, etc.

#### Example Rules
| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| SSH | TCP | 22 | 10.0.0.0/8 | Allow SSH from VPC |
| HTTP | TCP | 80 | 0.0.0.0/0 | Allow web traffic |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Allow secure web traffic |

### 3.4.4 Load Balancers

**Location:** `/dashboard/networking/load-balancers`
**Purpose:** Distribute traffic across multiple VMs

#### Features
- **Create LB:** Set up HTTP/HTTPS or TCP load balancer
- **Backend Pools:** Add VMs as targets
- **Health Checks:** Configure health monitoring
- **SSL Certificates:** Add HTTPS certificates

### 3.4.5 Public IPs

**Location:** `/dashboard/networking/public-ips`
**Purpose:** Manage public IP addresses

#### Features
- **Allocate:** Reserve a new public IP
- **Associate:** Attach to VM or load balancer
- **Release:** Return unused IPs

### 3.4.6 DNS

**Location:** `/dashboard/networking/dns`
**Purpose:** Manage DNS zones and records

#### Features
- **Create Zone:** Add a domain for DNS management
- **Records:** Create A, AAAA, CNAME, MX, TXT records
- **TTL:** Configure time-to-live for caching

---

## 3.5 Storage

**Icon:** Hard Drive
**Purpose:** Manage persistent storage resources

### 3.5.1 Block Volumes

**Location:** `/dashboard/storage/volumes`
**Purpose:** Attach additional disk storage to VMs

#### Features
- **Create Volume:** Provision SSD or HDD storage
- **Attach/Detach:** Connect volumes to VMs
- **Resize:** Increase volume size (cannot decrease)
- **Snapshots:** Create point-in-time copies

### 3.5.2 Object Storage

**Location:** `/dashboard/storage/buckets`
**Purpose:** S3-compatible object storage for files

#### Features
- **Create Bucket:** Make a new storage container
- **Upload/Download:** Manage files via UI or API
- **Access Policies:** Configure public/private access
- **Versioning:** Enable file version history

### 3.5.3 File Storage

**Location:** `/dashboard/storage/file-shares`
**Purpose:** Network file shares (NFS/SMB)

#### Features
- **Create Share:** Provision file share
- **Mount:** Get mount commands for VMs
- **Quotas:** Set storage limits

### 3.5.4 Backups

**Location:** `/dashboard/storage/backups`
**Purpose:** Automated backup management

#### Features
- **Backup Policies:** Schedule automatic backups
- **Retention:** Configure how long to keep backups
- **Restore:** Recover from backup

---

## 3.6 Databases

**Icon:** Database
**Purpose:** Managed database services

### 3.6.1 PostgreSQL

**Location:** `/dashboard/databases/postgresql`
**Purpose:** Managed PostgreSQL database instances

#### Features
- **Create Instance:** Launch new PostgreSQL database
- **Connection Strings:** Get credentials and connection info
- **Scaling:** Resize CPU/memory
- **Replication:** Configure read replicas

### 3.6.2 MySQL

**Location:** `/dashboard/databases/mysql`
**Purpose:** Managed MySQL database instances

#### Features
- Same as PostgreSQL but for MySQL databases

### 3.6.3 Database Backups

**Location:** `/dashboard/databases/backups`
**Purpose:** Manage database backups

#### Features
- **Automated Backups:** Daily automatic backups
- **Manual Backups:** Create on-demand snapshots
- **Point-in-Time Recovery:** Restore to specific time

---

## 3.7 Observability

**Icon:** Bar Chart
**Purpose:** Monitor and troubleshoot your environment

### 3.7.1 Metrics

**Location:** `/dashboard/observability/metrics`
**Purpose:** View performance metrics and graphs

#### Features
- **Resource Metrics:** CPU, memory, disk, network per resource
- **Custom Dashboards:** Build your own metric views
- **Time Range:** Select historical data periods

### 3.7.2 Logs

**Location:** `/dashboard/observability/logs`
**Purpose:** Centralized log aggregation

#### Features
- **Search:** Find logs across all resources
- **Filter:** By resource, severity, time range
- **Live Tail:** Real-time log streaming

### 3.7.3 Alerts

**Location:** `/dashboard/observability/alerts`
**Purpose:** Set up notifications for issues

#### Features
- **Create Alert:** Define threshold conditions
- **Notification Channels:** Email, Slack, webhook
- **Alert History:** View past triggered alerts

---

## 3.8 Billing

**Icon:** Credit Card
**Purpose:** Manage costs and payments

### 3.8.1 Usage

**Location:** `/dashboard/billing/usage`
**Purpose:** View current resource consumption

#### Features
- **Cost Breakdown:** Spending by service type
- **Usage Trends:** Historical cost graphs
- **Forecasting:** Projected monthly spend
- **Export:** Download usage reports

### 3.8.2 Invoices

**Location:** `/dashboard/billing/invoices`
**Purpose:** View and download invoices

#### Features
- **Invoice List:** All past and current invoices
- **Download PDF:** Get invoice documents
- **Payment Status:** Paid, pending, overdue

### 3.8.3 Payment Methods

**Location:** `/dashboard/billing/payment`
**Purpose:** Manage payment information

#### Features
- **Add Card:** Enter credit/debit card details
- **Default Method:** Set primary payment source
- **Billing Address:** Update invoice address

---

## 3.9 Settings

**Icon:** Settings
**Purpose:** Configure organization and account settings

### 3.9.1 Organization

**Location:** `/dashboard/settings/organization`
**Purpose:** Manage organization profile

#### Features
- **Name & Slug:** Update organization identity
- **Contact Info:** Primary contact details
- **Plan:** View current subscription plan

### 3.9.2 Users & Teams

**Location:** `/dashboard/settings/users`
**Purpose:** Manage team members and access

#### Features
- **Invite User:** Add new team members
- **Roles:** Assign Admin, Operator, or User roles
- **Remove User:** Revoke access
- **Teams:** Group users for easier permission management

### 3.9.3 API Keys

**Location:** `/dashboard/settings/api-keys`
**Purpose:** Manage programmatic access

#### Features
- **Create Key:** Generate new API key
- **Scopes:** Limit key permissions
- **Revoke:** Disable compromised keys

### 3.9.4 Audit Log

**Location:** `/dashboard/settings/audit-log`
**Purpose:** Review all actions in your organization

#### Features
- **Activity Feed:** All user actions with timestamps
- **Filter:** By user, action type, resource
- **Export:** Download audit data for compliance

---

# 4. MicroDataCluster Integration

The platform integrates with MicroDataCluster (MDC) for infrastructure management. This section covers how to use MDC features.

---

## 4.1 Overview

MicroDataCluster provides:
- **Workspaces** - Virtual environments with VMs and networks
- **Sites** - Physical datacenter locations with compute nodes
- **Remote Networks** - Overlay networks for secure connectivity
- **Organizations** - Multi-tenant organization management

### Dashboard Display

The User Dashboard shows real-time MDC data:
- Workspace count with total VMs
- Site nodes (online/offline status)
- Remote network members
- Organization count

### Authentication

MDC uses Microsoft Entra ID (Azure AD) for authentication:
1. Click "Sign in with Microsoft" on the login page
2. Authenticate with your Microsoft account
3. MDC data loads automatically on the dashboard

---

## 4.2 Viewing Workspaces

**Location:** Dashboard → MicroDataCluster Infrastructure section

### What You'll See
- Workspace name
- VM count within workspace
- Network count
- Creation/update dates

### Workspace Details
Each workspace contains:
- **Virtual Machines** - Compute instances
- **Virtual Networks** - Internal networking
- **Bastion** - Jump host for secure access
- **Remote Network** - VPN connectivity

---

## 4.3 Viewing Sites

Sites represent physical datacenter locations.

### Site Information
- Site name and description
- Node list with status (online/offline)
- CPU information per node
- Available VM templates

### Node Status Indicators
| Color | Status | Meaning |
|-------|--------|---------|
| Green | Online | Node is operational |
| Red | Offline | Node is unreachable |
| Gray | Unknown | Status cannot be determined |

---

## 4.4 Remote Networks

Remote networks enable secure VPN connectivity.

### What You'll See
- Network name
- Member count (online/total)
- IP assignment pools
- Managed routes

### Member Information
- Member ID and name
- IP addresses assigned
- Online/offline status
- Last seen timestamp
- Client version

---

## 4.5 Current Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| View Workspaces | ✅ Available | Dashboard display |
| View Sites | ✅ Available | With node status |
| View Networks | ✅ Available | With member info |
| Create Workspace | ⚠️ API Only | No UI form yet |
| Update Workspace | ⚠️ API Only | No UI form yet |
| Delete Workspace | ❌ Not Available | API doesn't support |

### Creating Workspaces (For Developers)

Workspaces can be created programmatically using the API:

```typescript
// Requires developer access
import { useAddWorkspaceToSite } from '@/lib/mdc/hooks';

const addWorkspace = useAddWorkspaceToSite();
addWorkspace.mutate({
  siteId: 'site-uuid',
  descriptor: {
    name: 'My Workspace',
    organizationId: 'org-uuid',
    // Additional configuration...
  }
});
```

**Note:** A UI for workspace creation is planned for future releases.

---

# 5. Admin Console Guide

The Admin Console is for platform operators to manage infrastructure and tenants. Access it at `/admin`.

---

## 4.1 Overview

**Location:** `/admin`
**Icon:** Layout Dashboard
**Purpose:** Platform-wide dashboard for administrators

### What You'll See
- **Platform Metrics:** Total tenants, VMs, storage, revenue
- **Health Status:** Infrastructure component health
- **Recent Events:** Important platform events
- **Alerts:** Active issues requiring attention

---

## 4.2 Tenants

**Icon:** Users
**Purpose:** Manage customer organizations

### 4.2.1 All Tenants

**Location:** `/admin/tenants`
**Purpose:** View and manage all customer accounts

#### Features
- **Tenant List:** All organizations with status, plan, usage
- **Search/Filter:** Find tenants by name, email, status
- **Actions:**
  - **View Details:** See full tenant information
  - **Edit Quotas:** Adjust resource limits
  - **Change Plan:** Upgrade/downgrade subscription
  - **Suspend:** Temporarily disable access
  - **Contact:** Send email to tenant

#### How to Create a New Tenant
1. Click **"+ Onboard Tenant"**
2. Enter organization name
3. Enter admin email
4. Select initial plan
5. Click Create

### 4.2.2 Onboarding

**Location:** `/admin/tenants/onboarding`
**Purpose:** Process new tenant applications

#### Features
- **Application Queue:** Pending requests from prospects
- **Review Details:** Company info, use case, estimated spend
- **Actions:**
  - **Assign to Me:** Take ownership of application
  - **Approve:** Accept and provision tenant
  - **Reject:** Decline with reason
  - **Contact:** Request more information

#### Onboarding Workflow
```
Application Submitted
       ↓
Pending Review → Assigned → In Progress
       ↓
   Review Use Case & Requirements
       ↓
   ┌────────┴────────┐
Approve           Reject
   ↓                 ↓
Provision      End (with reason)
   ↓
Active Tenant
```

### 4.2.3 Plans & Quotas

**Location:** `/admin/tenants/plans`
**Purpose:** Configure subscription plans and resource limits

#### Features
- **Plan Management:** Create/edit subscription plans
- **Default Quotas:** Set resource limits per plan
- **Pricing:** Configure plan pricing

---

## 4.3 Infrastructure

**Icon:** Building
**Purpose:** Manage physical and virtual infrastructure

### 4.3.1 Datacenters

**Location:** `/admin/infrastructure/datacenters`
**Purpose:** Manage physical datacenter locations

#### Features
- **List Datacenters:** All locations with status
- **Capacity:** View available resources per DC
- **Add Datacenter:** Register new location

### 4.3.2 Proxmox Clusters

**Location:** `/admin/infrastructure/clusters`
**Purpose:** Manage Proxmox virtualization clusters

#### Features
- **Cluster Status:** Health, quorum status
- **Node List:** All nodes in cluster
- **Resource Usage:** CPU, memory, storage across cluster
- **Add Cluster:** Register new Proxmox cluster

### 4.3.3 Nodes

**Location:** `/admin/infrastructure/nodes`
**Purpose:** Manage individual hypervisor nodes

#### Features
- **Node Status:** Online/offline, resource usage
- **Maintenance Mode:** Enable for updates
- **VM Migration:** Move VMs to other nodes
- **Specs:** View hardware specifications

---

## 4.4 Network Fabric

**Icon:** Globe
**Purpose:** Manage platform-wide networking

### 4.4.1 Topology

**Location:** `/admin/network/topology`
**Purpose:** Visualize network architecture

#### Features
- **Network Map:** Visual diagram of network connections
- **Connectivity Status:** Link health indicators
- **Traffic Flow:** See bandwidth usage

### 4.4.2 ZeroTier Networks

**Location:** `/admin/network/zerotier`
**Purpose:** Manage software-defined overlay networks

#### Features
- **Network List:** All ZeroTier networks
- **Member Management:** Authorize/remove nodes
- **IP Assignment:** Configure addressing
- **Create Network:** Set up new overlay network

### 4.4.3 Traffic Control

**Location:** `/admin/network/traffic`
**Purpose:** Manage bandwidth and routing policies

#### Features
- **Traffic Shaping:** Set bandwidth limits
- **QoS Policies:** Prioritize traffic types
- **Routing Rules:** Configure traffic paths

---

## 4.5 Storage

**Icon:** Boxes
**Purpose:** Manage distributed storage infrastructure

### 4.5.1 Ceph Clusters

**Location:** `/admin/storage/ceph`
**Purpose:** Manage Ceph storage clusters

#### Features
- **Cluster Health:** HEALTH_OK, WARN, ERR status
- **OSD Status:** Disk health and usage
- **Monitor Status:** Quorum status
- **Capacity:** Total/used/available space

### 4.5.2 Storage Pools

**Location:** `/admin/storage/pools`
**Purpose:** Manage logical storage pools

#### Features
- **Pool List:** All storage pools with capacity
- **Create Pool:** Add new storage pool
- **Quotas:** Set pool size limits
- **Placement Groups:** Configure PG count

### 4.5.3 Replication

**Location:** `/admin/storage/replication`
**Purpose:** Configure data replication policies

#### Features
- **Replication Rules:** Cross-datacenter replication
- **Sync Status:** Replication lag monitoring
- **Failover:** Configure automatic failover

---

## 4.6 Security

**Icon:** Shield
**Purpose:** Manage platform security

### 4.6.1 IAM Policies

**Location:** `/admin/security/iam`
**Purpose:** Configure identity and access management

#### Features
- **Policies:** Define permission policies
- **Roles:** Create and manage roles
- **Role Assignments:** Assign roles to users

### 4.6.2 Certificates

**Location:** `/admin/security/certificates`
**Purpose:** Manage SSL/TLS certificates

#### Features
- **Certificate List:** All certificates with expiry
- **Upload Certificate:** Add new certificates
- **Auto-Renewal:** Configure Let's Encrypt
- **Expiry Alerts:** Notifications before expiry

### 4.6.3 Audit Logs

**Location:** `/admin/security/audit`
**Purpose:** Platform-wide audit trail

#### Features
- **All Activities:** Every action across platform
- **Search/Filter:** By user, tenant, action type
- **Export:** Download for compliance/analysis
- **Retention:** Configure log retention period

---

## 4.7 Operations

**Icon:** Activity
**Purpose:** Day-to-day platform operations

### 4.7.1 Control Plane

**Location:** `/admin/operations/control-plane`
**Purpose:** Monitor core platform services

#### Features
- **Service Status:** API, scheduler, controllers
- **Restart Services:** Bounce unhealthy services
- **Configuration:** Adjust service parameters
- **Logs:** View control plane logs

### 4.7.2 Service Health

**Location:** `/admin/operations/health`
**Purpose:** Overall platform health monitoring

#### Features
- **Health Dashboard:** All services at a glance
- **Dependency Map:** Service dependencies
- **Incident History:** Past outages and resolutions
- **SLA Metrics:** Uptime percentages

### 4.7.3 Maintenance

**Location:** `/admin/operations/maintenance`
**Purpose:** Perform platform maintenance

#### Features
- **Scheduled Maintenance:** Plan downtime windows
- **Node Updates:** Patch hypervisor nodes
- **Database Maintenance:** Vacuum, analyze
- **Notifications:** Alert tenants of maintenance

---

## 4.8 Financials

**Icon:** Wallet
**Purpose:** Platform revenue and analytics

### 4.8.1 Revenue

**Location:** `/admin/financials/revenue`
**Purpose:** Track platform revenue

#### Features
- **Revenue Dashboard:** MRR, ARR, growth trends
- **By Plan:** Revenue breakdown by subscription tier
- **By Tenant:** Top revenue contributors
- **Projections:** Forecasted revenue

### 4.8.2 Usage Analytics

**Location:** `/admin/financials/usage`
**Purpose:** Analyze resource consumption patterns

#### Features
- **Usage Trends:** Platform-wide resource usage
- **By Service:** Compute, storage, network breakdown
- **Capacity Planning:** Predict future needs
- **Cost Attribution:** Resource cost analysis

### 4.8.3 Pricing

**Location:** `/admin/financials/pricing`
**Purpose:** Manage service pricing

#### Features
- **Price List:** All service prices
- **Update Prices:** Modify pricing
- **Discounts:** Configure volume discounts
- **Price History:** Track price changes

---

# 6. Quick Reference

## 6.1 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open search |
| `Ctrl/Cmd + /` | Show keyboard shortcuts |
| `Esc` | Close modal/dialog |

## 6.2 Status Indicators

| Color | Meaning |
|-------|---------|
| Green | Healthy/Running/Active |
| Yellow | Warning/Pending |
| Red | Error/Stopped/Critical |
| Gray | Unknown/Disabled |

## 6.3 Common Actions

| Task | Location | Steps |
|------|----------|-------|
| Create VM | Dashboard → Compute → VMs | Click "+ Create VM" |
| Create VPC | Dashboard → Networking → VPCs | Click "+ Create VPC" |
| Add User | Dashboard → Settings → Users | Click "Invite User" |
| View Billing | Dashboard → Billing → Usage | View cost breakdown |
| Onboard Tenant | Admin → Tenants | Click "+ Onboard Tenant" |
| Suspend Tenant | Admin → Tenants → [Tenant] | Actions → Suspend |

## 6.4 Getting Help

- **Documentation:** DEVELOPERS.md for technical details
- **Support:** Contact your platform administrator
- **Issues:** Report bugs via GitHub Issues

---

*End of User Manual*
