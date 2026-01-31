-- Rollback demo data seed migration
-- Version: 000002

-- Delete role permissions for demo roles
DELETE FROM role_permissions WHERE role_id IN ('role-admin', 'role-operator', 'role-user', 'role-viewer');

-- Delete demo permissions
DELETE FROM permissions WHERE id LIKE 'perm-%';

-- Delete node pools
DELETE FROM node_pools WHERE id LIKE 'np-demo-%';

-- Delete kubernetes clusters
DELETE FROM kubernetes_clusters WHERE id LIKE 'k8s-demo-%';

-- Delete managed databases
DELETE FROM managed_databases WHERE id LIKE 'db-demo-%';

-- Delete volumes
DELETE FROM volumes WHERE id LIKE 'vol-demo-%';

-- Delete security group rules
DELETE FROM security_group_rules WHERE id LIKE 'sgr-demo-%';

-- Delete security groups
DELETE FROM security_groups WHERE id LIKE 'sg-demo-%';

-- Delete subnets
DELETE FROM subnets WHERE id LIKE 'sub-demo-%';

-- Delete VPCs
DELETE FROM vpcs WHERE id LIKE 'vpc-demo-%';

-- Delete VMs
DELETE FROM vms WHERE id LIKE 'vm-demo-%';

-- Delete VM templates
DELETE FROM vm_templates WHERE id LIKE 'tpl-%';

-- Delete datacenters
DELETE FROM datacenters WHERE id LIKE 'dc-%';

-- Delete projects
DELETE FROM projects WHERE id LIKE 'proj-demo-%';

-- Delete user roles
DELETE FROM user_roles WHERE user_id LIKE 'user-demo-%';

-- Delete roles
DELETE FROM roles WHERE id IN ('role-admin', 'role-operator', 'role-user', 'role-viewer');

-- Delete users
DELETE FROM users WHERE id LIKE 'user-demo-%';

-- Delete organizations
DELETE FROM organizations WHERE id LIKE 'org-demo-%';

-- Delete billing plans
DELETE FROM billing_plans WHERE id LIKE 'plan-%';
