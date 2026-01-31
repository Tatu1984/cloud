-- Cloud Platform Demo Data Seed Migration
-- Version: 000002
-- Description: Seed demo users and sample data for testing

-- ==================== Demo Organizations ====================

INSERT INTO organizations (id, name, slug, plan, status, created_at, updated_at)
VALUES
    ('org-demo-001', 'Demo Organization', 'demo-org', 'professional', 'active', NOW(), NOW()),
    ('org-demo-002', 'Acme Corporation', 'acme-corp', 'enterprise', 'active', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ==================== Demo Users ====================
-- Password for all demo users: demo123
-- BCrypt hash of 'demo123' with cost 10

INSERT INTO users (id, email, name, password_hash, organization_id, email_verified, status, created_at, updated_at)
VALUES
    -- Regular demo user (user@demo.com / demo123)
    ('user-demo-001', 'user@demo.com', 'Demo User', '$2a$10$z.i0sAp4XqcYTPdctXvfruj26NDIa.OafccDhcigYNfJwIl.v73vy', 'org-demo-001', TRUE, 'active', NOW(), NOW()),
    -- Admin demo user (admin@demo.com / demo123)
    ('user-demo-002', 'admin@demo.com', 'Admin User', '$2a$10$z.i0sAp4XqcYTPdctXvfruj26NDIa.OafccDhcigYNfJwIl.v73vy', 'org-demo-001', TRUE, 'active', NOW(), NOW()),
    -- Secondary org user
    ('user-demo-003', 'demo@acme.com', 'Acme Admin', '$2a$10$z.i0sAp4XqcYTPdctXvfruj26NDIa.OafccDhcigYNfJwIl.v73vy', 'org-demo-002', TRUE, 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- ==================== Roles ====================

INSERT INTO roles (id, name, display_name, description, is_system, created_at, updated_at)
VALUES
    ('role-admin', 'admin', 'Administrator', 'Full system access', TRUE, NOW(), NOW()),
    ('role-operator', 'operator', 'Operator', 'Infrastructure management access', TRUE, NOW(), NOW()),
    ('role-user', 'user', 'User', 'Standard user access', TRUE, NOW(), NOW()),
    ('role-viewer', 'viewer', 'Viewer', 'Read-only access', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ==================== User Role Assignments ====================

INSERT INTO user_roles (user_id, role_id, created_at)
VALUES
    ('user-demo-001', 'role-user', NOW()),
    ('user-demo-002', 'role-admin', NOW()),
    ('user-demo-003', 'role-admin', NOW())
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ==================== Demo Projects ====================

INSERT INTO projects (id, name, description, organization_id, status, created_at, updated_at)
VALUES
    ('proj-demo-001', 'Production', 'Production environment', 'org-demo-001', 'active', NOW(), NOW()),
    ('proj-demo-002', 'Staging', 'Staging environment', 'org-demo-001', 'active', NOW(), NOW()),
    ('proj-demo-003', 'Development', 'Development sandbox', 'org-demo-001', 'active', NOW(), NOW()),
    ('proj-demo-004', 'Acme Production', 'Production environment', 'org-demo-002', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== Datacenters ====================

INSERT INTO datacenters (id, name, code, location, region, status, created_at, updated_at)
VALUES
    ('dc-001', 'US-East Primary', 'us-east-1', 'New York, NY', 'us-east-1', 'active', NOW(), NOW()),
    ('dc-002', 'US-West Primary', 'us-west-1', 'Los Angeles, CA', 'us-west-1', 'active', NOW(), NOW()),
    ('dc-003', 'EU-West Primary', 'eu-west-1', 'Amsterdam, NL', 'eu-west-1', 'active', NOW(), NOW()),
    ('dc-004', 'Asia-Pacific', 'ap-southeast-1', 'Singapore', 'ap-southeast-1', 'active', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ==================== VM Templates ====================

INSERT INTO vm_templates (id, name, description, os, os_family, default_vcpus, default_memory, default_disk, is_public, status, created_at, updated_at)
VALUES
    ('tpl-001', 'Ubuntu 22.04 LTS', 'Ubuntu 22.04 LTS (Jammy Jellyfish)', 'ubuntu-22.04', 'linux', 2, 2048, 20, TRUE, 'active', NOW(), NOW()),
    ('tpl-002', 'Ubuntu 24.04 LTS', 'Ubuntu 24.04 LTS (Noble Numbat)', 'ubuntu-24.04', 'linux', 2, 2048, 20, TRUE, 'active', NOW(), NOW()),
    ('tpl-003', 'Debian 12', 'Debian 12 (Bookworm)', 'debian-12', 'linux', 2, 2048, 20, TRUE, 'active', NOW(), NOW()),
    ('tpl-004', 'Rocky Linux 9', 'Rocky Linux 9 (Blue Onyx)', 'rocky-9', 'linux', 2, 2048, 20, TRUE, 'active', NOW(), NOW()),
    ('tpl-005', 'AlmaLinux 9', 'AlmaLinux 9 (Emerald Puma)', 'alma-9', 'linux', 2, 2048, 20, TRUE, 'active', NOW(), NOW()),
    ('tpl-006', 'Windows Server 2022', 'Windows Server 2022 Standard', 'windows-2022', 'windows', 4, 4096, 50, TRUE, 'active', NOW(), NOW()),
    ('tpl-007', 'Windows Server 2019', 'Windows Server 2019 Standard', 'windows-2019', 'windows', 4, 4096, 50, TRUE, 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== Demo VMs ====================

INSERT INTO vms (id, name, project_id, datacenter_id, status, vcpus, memory, disk_size, os, public_ip, private_ip, tags, created_at, updated_at)
VALUES
    ('vm-demo-001', 'web-server-prod-01', 'proj-demo-001', 'dc-001', 'running', 4, 8192, 100, 'Ubuntu 22.04 LTS', '203.0.113.10', '10.0.1.10', ARRAY['production', 'web'], NOW(), NOW()),
    ('vm-demo-002', 'api-server-prod-01', 'proj-demo-001', 'dc-001', 'running', 8, 16384, 200, 'Ubuntu 22.04 LTS', '203.0.113.11', '10.0.1.11', ARRAY['production', 'api'], NOW(), NOW()),
    ('vm-demo-003', 'db-primary-01', 'proj-demo-001', 'dc-001', 'running', 16, 65536, 500, 'Rocky Linux 9', NULL, '10.0.2.10', ARRAY['production', 'database'], NOW(), NOW()),
    ('vm-demo-004', 'cache-server-01', 'proj-demo-001', 'dc-001', 'running', 4, 32768, 50, 'Ubuntu 22.04 LTS', NULL, '10.0.1.20', ARRAY['production', 'cache'], NOW(), NOW()),
    ('vm-demo-005', 'worker-node-01', 'proj-demo-001', 'dc-001', 'stopped', 2, 4096, 40, 'Ubuntu 24.04 LTS', NULL, '10.0.1.30', ARRAY['batch', 'worker'], NOW(), NOW()),
    ('vm-demo-006', 'staging-web-01', 'proj-demo-002', 'dc-001', 'running', 2, 4096, 50, 'Ubuntu 22.04 LTS', '203.0.113.50', '10.1.1.10', ARRAY['staging'], NOW(), NOW()),
    ('vm-demo-007', 'dev-sandbox-01', 'proj-demo-003', 'dc-001', 'running', 2, 4096, 50, 'Ubuntu 24.04 LTS', NULL, '10.2.1.10', ARRAY['development'], NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== Demo VPCs ====================

INSERT INTO vpcs (id, name, project_id, cidr_block, description, status, created_at, updated_at)
VALUES
    ('vpc-demo-001', 'production-vpc', 'proj-demo-001', '10.0.0.0/16', 'Production network', 'active', NOW(), NOW()),
    ('vpc-demo-002', 'staging-vpc', 'proj-demo-002', '10.1.0.0/16', 'Staging network', 'active', NOW(), NOW()),
    ('vpc-demo-003', 'development-vpc', 'proj-demo-003', '10.2.0.0/16', 'Development network', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== Demo Subnets ====================

INSERT INTO subnets (id, name, vpc_id, cidr_block, availability_zone, is_public, status, created_at, updated_at)
VALUES
    ('sub-demo-001', 'public-subnet-1a', 'vpc-demo-001', '10.0.1.0/24', 'us-east-1a', TRUE, 'active', NOW(), NOW()),
    ('sub-demo-002', 'public-subnet-1b', 'vpc-demo-001', '10.0.2.0/24', 'us-east-1b', TRUE, 'active', NOW(), NOW()),
    ('sub-demo-003', 'private-subnet-1a', 'vpc-demo-001', '10.0.10.0/24', 'us-east-1a', FALSE, 'active', NOW(), NOW()),
    ('sub-demo-004', 'private-subnet-1b', 'vpc-demo-001', '10.0.11.0/24', 'us-east-1b', FALSE, 'active', NOW(), NOW()),
    ('sub-demo-005', 'staging-public', 'vpc-demo-002', '10.1.1.0/24', 'us-east-1a', TRUE, 'active', NOW(), NOW()),
    ('sub-demo-006', 'staging-private', 'vpc-demo-002', '10.1.10.0/24', 'us-east-1a', FALSE, 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== Demo Security Groups ====================

INSERT INTO security_groups (id, name, vpc_id, description, is_default, created_at, updated_at)
VALUES
    ('sg-demo-001', 'web-servers', 'vpc-demo-001', 'Security group for web servers', FALSE, NOW(), NOW()),
    ('sg-demo-002', 'database-servers', 'vpc-demo-001', 'Security group for database servers', FALSE, NOW(), NOW()),
    ('sg-demo-003', 'default', 'vpc-demo-001', 'Default security group', TRUE, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== Demo Security Group Rules ====================

INSERT INTO security_group_rules (id, security_group_id, direction, protocol, port_range_min, port_range_max, cidr_block, description, created_at, updated_at)
VALUES
    ('sgr-demo-001', 'sg-demo-001', 'inbound', 'tcp', 80, 80, '0.0.0.0/0', 'Allow HTTP', NOW(), NOW()),
    ('sgr-demo-002', 'sg-demo-001', 'inbound', 'tcp', 443, 443, '0.0.0.0/0', 'Allow HTTPS', NOW(), NOW()),
    ('sgr-demo-003', 'sg-demo-001', 'inbound', 'tcp', 22, 22, '10.0.0.0/16', 'Allow SSH from VPC', NOW(), NOW()),
    ('sgr-demo-004', 'sg-demo-001', 'outbound', 'all', 0, 65535, '0.0.0.0/0', 'Allow all outbound', NOW(), NOW()),
    ('sgr-demo-005', 'sg-demo-002', 'inbound', 'tcp', 5432, 5432, '10.0.0.0/16', 'Allow PostgreSQL from VPC', NOW(), NOW()),
    ('sgr-demo-006', 'sg-demo-002', 'inbound', 'tcp', 3306, 3306, '10.0.0.0/16', 'Allow MySQL from VPC', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== Demo Volumes ====================

INSERT INTO volumes (id, name, project_id, size, type, status, attached_vm_id, created_at, updated_at)
VALUES
    ('vol-demo-001', 'db-data-primary', 'proj-demo-001', 500, 'ssd', 'in-use', 'vm-demo-003', NOW(), NOW()),
    ('vol-demo-002', 'db-logs-primary', 'proj-demo-001', 100, 'ssd', 'in-use', 'vm-demo-003', NOW(), NOW()),
    ('vol-demo-003', 'backup-storage', 'proj-demo-001', 1000, 'hdd', 'available', NULL, NOW(), NOW()),
    ('vol-demo-004', 'media-files', 'proj-demo-001', 200, 'ssd', 'in-use', 'vm-demo-001', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== Demo Managed Databases ====================

INSERT INTO managed_databases (id, name, project_id, engine, version, status, vcpus, memory_mb, storage_gb, endpoint, created_at, updated_at)
VALUES
    ('db-demo-001', 'prod-primary', 'proj-demo-001', 'postgresql', '16.1', 'running', 8, 32768, 500, 'prod-primary.db.cloudplatform.io:5432', NOW(), NOW()),
    ('db-demo-002', 'prod-analytics', 'proj-demo-001', 'postgresql', '16.1', 'running', 16, 65536, 1000, 'prod-analytics.db.cloudplatform.io:5432', NOW(), NOW()),
    ('db-demo-003', 'app-mysql', 'proj-demo-001', 'mysql', '8.0', 'running', 4, 16384, 200, 'app-mysql.db.cloudplatform.io:3306', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== Demo Kubernetes Clusters ====================

INSERT INTO kubernetes_clusters (id, name, project_id, status, version, node_count, endpoint, created_at, updated_at)
VALUES
    ('k8s-demo-001', 'prod-cluster-main', 'proj-demo-001', 'running', '1.29.1', 6, 'https://k8s-prod.cloudplatform.io:6443', NOW(), NOW()),
    ('k8s-demo-002', 'staging-cluster', 'proj-demo-002', 'running', '1.29.1', 3, 'https://k8s-staging.cloudplatform.io:6443', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== Demo Node Pools ====================

INSERT INTO node_pools (id, name, cluster_id, node_count, min_nodes, max_nodes, machine_type, status, created_at, updated_at)
VALUES
    ('np-demo-001', 'default-pool', 'k8s-demo-001', 3, 2, 10, 'standard-4x8', 'active', NOW(), NOW()),
    ('np-demo-002', 'high-memory', 'k8s-demo-001', 3, 1, 5, 'highmem-8x32', 'active', NOW(), NOW()),
    ('np-demo-003', 'staging-pool', 'k8s-demo-002', 3, 1, 5, 'standard-2x4', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== Demo Billing Plans ====================

INSERT INTO billing_plans (id, name, display_name, description, price_monthly, max_vms, max_vcpus, max_memory_gb, max_storage_gb, max_projects, is_active, created_at, updated_at)
VALUES
    ('plan-starter', 'starter', 'Starter', 'Perfect for small projects', 0, 5, 10, 20, 100, 2, TRUE, NOW(), NOW()),
    ('plan-professional', 'professional', 'Professional', 'For growing businesses', 99, 25, 50, 100, 500, 10, TRUE, NOW(), NOW()),
    ('plan-enterprise', 'enterprise', 'Enterprise', 'Custom solutions for large organizations', 499, -1, -1, -1, -1, -1, TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ==================== Demo Permissions ====================

INSERT INTO permissions (id, name, resource, action, description, created_at, updated_at)
VALUES
    -- VM Permissions
    ('perm-vm-create', 'vm:create', 'vm', 'create', 'Create virtual machines', NOW(), NOW()),
    ('perm-vm-read', 'vm:read', 'vm', 'read', 'View virtual machines', NOW(), NOW()),
    ('perm-vm-update', 'vm:update', 'vm', 'update', 'Update virtual machines', NOW(), NOW()),
    ('perm-vm-delete', 'vm:delete', 'vm', 'delete', 'Delete virtual machines', NOW(), NOW()),
    ('perm-vm-start', 'vm:start', 'vm', 'start', 'Start virtual machines', NOW(), NOW()),
    ('perm-vm-stop', 'vm:stop', 'vm', 'stop', 'Stop virtual machines', NOW(), NOW()),
    -- Storage Permissions
    ('perm-storage-create', 'storage:create', 'storage', 'create', 'Create storage volumes', NOW(), NOW()),
    ('perm-storage-read', 'storage:read', 'storage', 'read', 'View storage volumes', NOW(), NOW()),
    ('perm-storage-delete', 'storage:delete', 'storage', 'delete', 'Delete storage volumes', NOW(), NOW()),
    -- Network Permissions
    ('perm-network-create', 'network:create', 'network', 'create', 'Create networks', NOW(), NOW()),
    ('perm-network-read', 'network:read', 'network', 'read', 'View networks', NOW(), NOW()),
    ('perm-network-delete', 'network:delete', 'network', 'delete', 'Delete networks', NOW(), NOW()),
    -- Database Permissions
    ('perm-database-create', 'database:create', 'database', 'create', 'Create databases', NOW(), NOW()),
    ('perm-database-read', 'database:read', 'database', 'read', 'View databases', NOW(), NOW()),
    ('perm-database-delete', 'database:delete', 'database', 'delete', 'Delete databases', NOW(), NOW()),
    -- Billing Permissions
    ('perm-billing-read', 'billing:read', 'billing', 'read', 'View billing information', NOW(), NOW()),
    ('perm-billing-manage', 'billing:manage', 'billing', 'manage', 'Manage billing settings', NOW(), NOW()),
    -- IAM Permissions
    ('perm-iam-users-read', 'iam:users:read', 'iam', 'users:read', 'View users', NOW(), NOW()),
    ('perm-iam-users-manage', 'iam:users:manage', 'iam', 'users:manage', 'Manage users', NOW(), NOW()),
    ('perm-iam-roles-read', 'iam:roles:read', 'iam', 'roles:read', 'View roles', NOW(), NOW()),
    ('perm-iam-roles-manage', 'iam:roles:manage', 'iam', 'roles:manage', 'Manage roles', NOW(), NOW()),
    -- Admin Permissions
    ('perm-admin-all', 'admin:*', 'admin', '*', 'Full admin access', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ==================== Role Permissions ====================

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 'role-admin', id, NOW() FROM permissions WHERE id LIKE 'perm-%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Operator gets infrastructure permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
VALUES
    ('role-operator', 'perm-vm-create', NOW()),
    ('role-operator', 'perm-vm-read', NOW()),
    ('role-operator', 'perm-vm-update', NOW()),
    ('role-operator', 'perm-vm-delete', NOW()),
    ('role-operator', 'perm-vm-start', NOW()),
    ('role-operator', 'perm-vm-stop', NOW()),
    ('role-operator', 'perm-storage-create', NOW()),
    ('role-operator', 'perm-storage-read', NOW()),
    ('role-operator', 'perm-storage-delete', NOW()),
    ('role-operator', 'perm-network-create', NOW()),
    ('role-operator', 'perm-network-read', NOW()),
    ('role-operator', 'perm-network-delete', NOW()),
    ('role-operator', 'perm-database-create', NOW()),
    ('role-operator', 'perm-database-read', NOW()),
    ('role-operator', 'perm-database-delete', NOW())
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User gets read + limited write permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
VALUES
    ('role-user', 'perm-vm-create', NOW()),
    ('role-user', 'perm-vm-read', NOW()),
    ('role-user', 'perm-vm-start', NOW()),
    ('role-user', 'perm-vm-stop', NOW()),
    ('role-user', 'perm-storage-read', NOW()),
    ('role-user', 'perm-network-read', NOW()),
    ('role-user', 'perm-database-read', NOW()),
    ('role-user', 'perm-billing-read', NOW())
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Viewer gets read-only permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
VALUES
    ('role-viewer', 'perm-vm-read', NOW()),
    ('role-viewer', 'perm-storage-read', NOW()),
    ('role-viewer', 'perm-network-read', NOW()),
    ('role-viewer', 'perm-database-read', NOW()),
    ('role-viewer', 'perm-billing-read', NOW())
ON CONFLICT (role_id, permission_id) DO NOTHING;
