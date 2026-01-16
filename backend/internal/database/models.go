package database

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// ==================== IAM Models ====================

// Organization represents a tenant organization
type Organization struct {
	BaseModel
	Name      string    `gorm:"size:255;not null" json:"name"`
	Slug      string    `gorm:"size:100;uniqueIndex;not null" json:"slug"`
	Plan      string    `gorm:"size:50;default:'starter'" json:"plan"`
	Status    string    `gorm:"size:20;default:'active'" json:"status"`
	Settings  JSON      `gorm:"type:jsonb;default:'{}'" json:"settings"`
	DeletedAt sql.NullTime `gorm:"index" json:"-"`

	// Relations
	Users    []User    `gorm:"foreignKey:OrganizationID" json:"users,omitempty"`
	Projects []Project `gorm:"foreignKey:OrganizationID" json:"projects,omitempty"`
}

// User represents a platform user
type User struct {
	BaseModel
	Email          string       `gorm:"size:255;uniqueIndex;not null" json:"email"`
	Name           string       `gorm:"size:255;not null" json:"name"`
	PasswordHash   string       `gorm:"size:255" json:"-"`
	Avatar         string       `gorm:"size:500" json:"avatar,omitempty"`
	OrganizationID string       `gorm:"type:uuid;not null;index" json:"organizationId"`
	EmailVerified  bool         `gorm:"default:false" json:"emailVerified"`
	Status         string       `gorm:"size:20;default:'active'" json:"status"`
	LastLoginAt    sql.NullTime `json:"lastLoginAt,omitempty"`
	DeletedAt      sql.NullTime `gorm:"index" json:"-"`
	// SSO fields
	EntraIDOID     string       `gorm:"size:255;index" json:"entraIdOid,omitempty"` // Microsoft Entra ID Object ID
	AuthProvider   string       `gorm:"size:50;default:'local'" json:"authProvider"` // local, entra_id, etc.

	// Relations
	Organization Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Roles        []Role       `gorm:"many2many:user_roles" json:"roles,omitempty"`
	APIKeys      []APIKey     `gorm:"foreignKey:UserID" json:"apiKeys,omitempty"`
}

// Role represents a user role
type Role struct {
	BaseModel
	Name           string `gorm:"size:100;uniqueIndex;not null" json:"name"`
	DisplayName    string `gorm:"size:255" json:"displayName"`
	Description    string `gorm:"size:500" json:"description,omitempty"`
	IsSystem       bool   `gorm:"default:false" json:"isSystem"`
	OrganizationID string `gorm:"type:uuid;index" json:"organizationId,omitempty"`

	// Relations
	Permissions []Permission `gorm:"many2many:role_permissions" json:"permissions,omitempty"`
	Users       []User       `gorm:"many2many:user_roles" json:"users,omitempty"`
}

// Permission represents a permission
type Permission struct {
	BaseModel
	Name        string `gorm:"size:100;uniqueIndex;not null" json:"name"`
	Resource    string `gorm:"size:100;index" json:"resource"`
	Action      string `gorm:"size:50" json:"action"`
	Description string `gorm:"size:500" json:"description,omitempty"`

	// Relations
	Roles []Role `gorm:"many2many:role_permissions" json:"roles,omitempty"`
}

// RolePermission is the join table for roles and permissions
type RolePermission struct {
	RoleID       string    `gorm:"type:uuid;primaryKey" json:"roleId"`
	PermissionID string    `gorm:"type:uuid;primaryKey" json:"permissionId"`
	CreatedAt    time.Time `json:"createdAt"`
}

// UserRole is the join table for users and roles
type UserRole struct {
	UserID    string    `gorm:"type:uuid;primaryKey" json:"userId"`
	RoleID    string    `gorm:"type:uuid;primaryKey" json:"roleId"`
	CreatedAt time.Time `json:"createdAt"`
}

// APIKey represents an API key
type APIKey struct {
	BaseModel
	Name      string       `gorm:"size:255;not null" json:"name"`
	KeyHash   string       `gorm:"size:255;uniqueIndex;not null" json:"-"`
	KeyPrefix string       `gorm:"size:20" json:"keyPrefix"`
	UserID    string       `gorm:"type:uuid;not null;index" json:"userId"`
	Scopes    StringArray  `gorm:"type:text[]" json:"scopes"`
	ExpiresAt sql.NullTime `json:"expiresAt,omitempty"`
	LastUsed  sql.NullTime `json:"lastUsed,omitempty"`
	Status    string       `gorm:"size:20;default:'active'" json:"status"`

	// Relations
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// ServiceAccount represents a non-human identity for automation
type ServiceAccount struct {
	BaseModel
	Name           string       `gorm:"size:255;not null" json:"name"`
	Description    string       `gorm:"size:1000" json:"description,omitempty"`
	OrganizationID string       `gorm:"type:uuid;not null;index" json:"organizationId"`
	RoleID         string       `gorm:"type:uuid;index" json:"roleId,omitempty"`
	Status         string       `gorm:"size:20;default:'active'" json:"status"`
	KeyHash        string       `gorm:"size:255;uniqueIndex" json:"-"`
	KeyPrefix      string       `gorm:"size:20" json:"keyPrefix"`
	LastUsedAt     sql.NullTime `json:"lastUsedAt,omitempty"`
	ExpiresAt      sql.NullTime `json:"expiresAt,omitempty"`

	// Relations
	Organization Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Role         Role         `gorm:"foreignKey:RoleID" json:"role,omitempty"`
}

// Session represents a user session
type Session struct {
	BaseModel
	UserID       string    `gorm:"type:uuid;not null;index" json:"userId"`
	RefreshToken string    `gorm:"size:500;uniqueIndex" json:"-"`
	UserAgent    string    `gorm:"size:500" json:"userAgent,omitempty"`
	IPAddress    string    `gorm:"size:50" json:"ipAddress,omitempty"`
	ExpiresAt    time.Time `gorm:"not null" json:"expiresAt"`

	// Relations
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// AuditLog represents an audit log entry
type AuditLog struct {
	BaseModel
	UserID         string `gorm:"type:uuid;index" json:"userId,omitempty"`
	OrganizationID string `gorm:"type:uuid;index" json:"organizationId,omitempty"`
	Action         string `gorm:"size:100;not null;index" json:"action"`
	Resource       string `gorm:"size:100;index" json:"resource"`
	ResourceID     string `gorm:"type:uuid" json:"resourceId,omitempty"`
	Details        JSON   `gorm:"type:jsonb" json:"details,omitempty"`
	IPAddress      string `gorm:"size:50" json:"ipAddress,omitempty"`
	UserAgent      string `gorm:"size:500" json:"userAgent,omitempty"`
}

// ==================== Project Models ====================

// Project represents a project
type Project struct {
	BaseModel
	Name           string       `gorm:"size:255;not null" json:"name"`
	Description    string       `gorm:"size:1000" json:"description,omitempty"`
	OrganizationID string       `gorm:"type:uuid;not null;index" json:"organizationId"`
	Status         string       `gorm:"size:20;default:'active'" json:"status"`
	Settings       JSON         `gorm:"type:jsonb;default:'{}'" json:"settings"`
	DeletedAt      sql.NullTime `gorm:"index" json:"-"`

	// Relations
	Organization Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	VMs          []VM         `gorm:"foreignKey:ProjectID" json:"vms,omitempty"`
	VPCs         []VPC        `gorm:"foreignKey:ProjectID" json:"vpcs,omitempty"`
	Volumes      []Volume     `gorm:"foreignKey:ProjectID" json:"volumes,omitempty"`
}

// ==================== Compute Models ====================

// VM represents a virtual machine
type VM struct {
	BaseModel
	Name            string       `gorm:"size:255;not null" json:"name"`
	ProjectID       string       `gorm:"type:uuid;not null;index" json:"projectId"`
	DatacenterID    string       `gorm:"type:uuid;index" json:"datacenterId,omitempty"`
	ProxmoxClusterID string      `gorm:"type:uuid;index" json:"proxmoxClusterId,omitempty"`
	ProxmoxNodeID   string       `gorm:"type:uuid;index" json:"proxmoxNodeId,omitempty"`
	ProxmoxVMID     int          `gorm:"index" json:"proxmoxVmId,omitempty"`
	Status          string       `gorm:"size:30;default:'pending';index" json:"status"`
	VCPUs           int          `gorm:"not null" json:"vcpus"`
	Memory          int          `gorm:"not null" json:"memory"` // MB
	DiskSize        int          `gorm:"not null" json:"diskSize"` // GB
	OS              string       `gorm:"size:100" json:"os"`
	Template        string       `gorm:"size:100" json:"template,omitempty"`
	PublicIP        string       `gorm:"size:45" json:"publicIp,omitempty"`
	PrivateIP       string       `gorm:"size:45" json:"privateIp,omitempty"`
	SubnetID        string       `gorm:"type:uuid" json:"subnetId,omitempty"`
	Tags            StringArray  `gorm:"type:text[]" json:"tags"`
	Metadata        JSON         `gorm:"type:jsonb;default:'{}'" json:"metadata"`
	DeletedAt       sql.NullTime `gorm:"index" json:"-"`

	// Relations
	Project   Project    `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Snapshots []Snapshot `gorm:"foreignKey:VMID" json:"snapshots,omitempty"`
}

// VMTemplate represents a VM template
type VMTemplate struct {
	BaseModel
	Name           string `gorm:"size:255;not null" json:"name"`
	Description    string `gorm:"size:1000" json:"description,omitempty"`
	OS             string `gorm:"size:100" json:"os"`
	OSFamily       string `gorm:"size:50" json:"osFamily"`
	DefaultVCPUs   int    `json:"defaultVcpus"`
	DefaultMemory  int    `json:"defaultMemory"`
	DefaultDisk    int    `json:"defaultDisk"`
	ProxmoxTemplate string `gorm:"size:100" json:"proxmoxTemplate,omitempty"`
	ImageURL       string `gorm:"size:500" json:"imageUrl,omitempty"`
	IsPublic       bool   `gorm:"default:true" json:"isPublic"`
	Status         string `gorm:"size:20;default:'active'" json:"status"`
}

// Snapshot represents a VM snapshot
type Snapshot struct {
	BaseModel
	Name        string `gorm:"size:255;not null" json:"name"`
	Description string `gorm:"size:1000" json:"description,omitempty"`
	VMID        string `gorm:"type:uuid;not null;index" json:"vmId"`
	Size        int64  `json:"size"` // bytes
	Status      string `gorm:"size:20;default:'creating'" json:"status"`

	// Relations
	VM VM `gorm:"foreignKey:VMID" json:"vm,omitempty"`
}

// ==================== Kubernetes Models ====================

// KubernetesCluster represents a managed K8s cluster
type KubernetesCluster struct {
	BaseModel
	Name            string       `gorm:"size:255;not null" json:"name"`
	ProjectID       string       `gorm:"type:uuid;not null;index" json:"projectId"`
	DatacenterID    string       `gorm:"type:uuid" json:"datacenterId,omitempty"`
	Status          string       `gorm:"size:30;default:'provisioning'" json:"status"`
	Version         string       `gorm:"size:20" json:"version"`
	Endpoint        string       `gorm:"size:500" json:"endpoint,omitempty"`
	CACertificate   string       `gorm:"type:text" json:"-"`
	KubeConfig      string       `gorm:"type:text" json:"-"`
	NetworkCIDR     string       `gorm:"size:50" json:"networkCidr,omitempty"`
	ServiceCIDR     string       `gorm:"size:50" json:"serviceCidr,omitempty"`
	EnableHA        bool         `gorm:"default:false" json:"enableHa"`
	DeletedAt       sql.NullTime `gorm:"index" json:"-"`

	// Relations
	Project   Project    `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	NodePools []NodePool `gorm:"foreignKey:ClusterID" json:"nodePools,omitempty"`
}

// NodePool represents a K8s node pool
type NodePool struct {
	BaseModel
	Name        string `gorm:"size:255;not null" json:"name"`
	ClusterID   string `gorm:"type:uuid;not null;index" json:"clusterId"`
	Status      string `gorm:"size:30;default:'provisioning'" json:"status"`
	MachineType string `gorm:"size:50" json:"machineType"`
	NodeCount   int    `gorm:"not null" json:"nodeCount"`
	MinNodes    int    `gorm:"default:1" json:"minNodes"`
	MaxNodes    int    `gorm:"default:10" json:"maxNodes"`
	AutoScaling bool   `gorm:"default:false" json:"autoScaling"`
	DiskSize    int    `gorm:"default:50" json:"diskSize"` // GB
	Labels      JSON   `gorm:"type:jsonb;default:'{}'" json:"labels"`
	Taints      JSON   `gorm:"type:jsonb;default:'[]'" json:"taints"`

	// Relations
	Cluster KubernetesCluster `gorm:"foreignKey:ClusterID" json:"cluster,omitempty"`
}

// ==================== Networking Models ====================

// VPC represents a virtual private cloud
type VPC struct {
	BaseModel
	Name           string       `gorm:"size:255;not null" json:"name"`
	ProjectID      string       `gorm:"type:uuid;not null;index" json:"projectId"`
	CIDR           string       `gorm:"size:50;not null" json:"cidr"`
	Status         string       `gorm:"size:20;default:'active'" json:"status"`
	ZeroTierNetworkID string    `gorm:"size:50" json:"zerotierNetworkId,omitempty"`
	DeletedAt      sql.NullTime `gorm:"index" json:"-"`

	// Relations
	Project        Project         `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Subnets        []Subnet        `gorm:"foreignKey:VPCID" json:"subnets,omitempty"`
	SecurityGroups []SecurityGroup `gorm:"foreignKey:VPCID" json:"securityGroups,omitempty"`
}

// Subnet represents a network subnet
type Subnet struct {
	BaseModel
	Name         string `gorm:"size:255;not null" json:"name"`
	VPCID        string `gorm:"type:uuid;not null;index" json:"vpcId"`
	CIDR         string `gorm:"size:50;not null" json:"cidr"`
	Zone         string `gorm:"size:50" json:"zone,omitempty"`
	IsPublic     bool   `gorm:"default:false" json:"isPublic"`
	GatewayIP    string `gorm:"size:45" json:"gatewayIp,omitempty"`
	AvailableIPs int    `json:"availableIps"`

	// Relations
	VPC VPC `gorm:"foreignKey:VPCID" json:"vpc,omitempty"`
}

// SecurityGroup represents a security group
type SecurityGroup struct {
	BaseModel
	Name        string `gorm:"size:255;not null" json:"name"`
	Description string `gorm:"size:1000" json:"description,omitempty"`
	VPCID       string `gorm:"type:uuid;not null;index" json:"vpcId"`
	IsDefault   bool   `gorm:"default:false" json:"isDefault"`

	// Relations
	VPC   VPC                 `gorm:"foreignKey:VPCID" json:"vpc,omitempty"`
	Rules []SecurityGroupRule `gorm:"foreignKey:SecurityGroupID" json:"rules,omitempty"`
}

// SecurityGroupRule represents a firewall rule
type SecurityGroupRule struct {
	BaseModel
	SecurityGroupID string `gorm:"type:uuid;not null;index" json:"securityGroupId"`
	Direction       string `gorm:"size:20;not null" json:"direction"` // inbound, outbound
	Protocol        string `gorm:"size:20" json:"protocol"` // tcp, udp, icmp, all
	PortFrom        int    `json:"portFrom"`
	PortTo          int    `json:"portTo"`
	Source          string `gorm:"size:100" json:"source,omitempty"` // CIDR or security group ID
	Description     string `gorm:"size:500" json:"description,omitempty"`

	// Relations
	SecurityGroup SecurityGroup `gorm:"foreignKey:SecurityGroupID" json:"securityGroup,omitempty"`
}

// LoadBalancer represents a load balancer
type LoadBalancer struct {
	BaseModel
	Name        string `gorm:"size:255;not null" json:"name"`
	ProjectID   string `gorm:"type:uuid;not null;index" json:"projectId"`
	VPCID       string `gorm:"type:uuid;index" json:"vpcId,omitempty"`
	Type        string `gorm:"size:20;default:'layer4'" json:"type"` // layer4, layer7
	Status      string `gorm:"size:20;default:'provisioning'" json:"status"`
	PublicIP    string `gorm:"size:45" json:"publicIp,omitempty"`
	Algorithm   string `gorm:"size:30;default:'round_robin'" json:"algorithm"`
	Config      JSON   `gorm:"type:jsonb;default:'{}'" json:"config"`

	// Relations
	Project Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
}

// PublicIP represents an elastic/floating IP
type PublicIP struct {
	BaseModel
	Address    string       `gorm:"size:45;uniqueIndex;not null" json:"address"`
	ProjectID  string       `gorm:"type:uuid;not null;index" json:"projectId"`
	AttachedTo string       `gorm:"type:uuid" json:"attachedTo,omitempty"`
	AttachType string       `gorm:"size:30" json:"attachType,omitempty"` // vm, loadbalancer
	ReverseDNS string       `gorm:"size:255" json:"reverseDns,omitempty"`
	Status     string       `gorm:"size:20;default:'available'" json:"status"`
	DeletedAt  sql.NullTime `gorm:"index" json:"-"`

	// Relations
	Project Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
}

// DNSZone represents a DNS zone
type DNSZone struct {
	BaseModel
	Name        string `gorm:"size:255;uniqueIndex;not null" json:"name"`
	ProjectID   string `gorm:"type:uuid;not null;index" json:"projectId"`
	Type        string `gorm:"size:20;default:'public'" json:"type"` // public, private
	Status      string `gorm:"size:20;default:'active'" json:"status"`
	Nameservers JSON   `gorm:"type:jsonb;default:'[]'" json:"nameservers"`

	// Relations
	Project Project     `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Records []DNSRecord `gorm:"foreignKey:ZoneID" json:"records,omitempty"`
}

// DNSRecord represents a DNS record
type DNSRecord struct {
	BaseModel
	ZoneID  string `gorm:"type:uuid;not null;index" json:"zoneId"`
	Name    string `gorm:"size:255;not null" json:"name"`
	Type    string `gorm:"size:20;not null" json:"type"` // A, AAAA, CNAME, MX, TXT, etc.
	Value   string `gorm:"size:1000;not null" json:"value"`
	TTL     int    `gorm:"default:3600" json:"ttl"`
	Priority int   `json:"priority,omitempty"`

	// Relations
	Zone DNSZone `gorm:"foreignKey:ZoneID" json:"zone,omitempty"`
}

// ==================== Storage Models ====================

// Volume represents a block storage volume
type Volume struct {
	BaseModel
	Name         string       `gorm:"size:255;not null" json:"name"`
	ProjectID    string       `gorm:"type:uuid;not null;index" json:"projectId"`
	Size         int          `gorm:"not null" json:"size"` // GB
	Type         string       `gorm:"size:50;default:'ssd'" json:"type"`
	Status       string       `gorm:"size:20;default:'available'" json:"status"`
	AttachedToVM string       `gorm:"type:uuid" json:"attachedToVm,omitempty"`
	MountPath    string       `gorm:"size:255" json:"mountPath,omitempty"`
	CephImageID  string       `gorm:"size:100" json:"cephImageId,omitempty"`
	IOPS         int          `json:"iops,omitempty"`
	Throughput   int          `json:"throughput,omitempty"`
	Encrypted    bool         `gorm:"default:false" json:"encrypted"`
	DeletedAt    sql.NullTime `gorm:"index" json:"-"`

	// Relations
	Project Project  `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Backups []Backup `gorm:"foreignKey:VolumeID" json:"backups,omitempty"`
}

// ObjectBucket represents an S3-compatible bucket
type ObjectBucket struct {
	BaseModel
	Name         string `gorm:"size:255;uniqueIndex;not null" json:"name"`
	ProjectID    string `gorm:"type:uuid;not null;index" json:"projectId"`
	Status       string `gorm:"size:20;default:'active'" json:"status"`
	Versioning   bool   `gorm:"default:false" json:"versioning"`
	Encryption   bool   `gorm:"default:false" json:"encryption"`
	PublicAccess bool   `gorm:"default:false" json:"publicAccess"`
	SizeBytes    int64  `json:"sizeBytes"`
	ObjectCount  int64  `json:"objectCount"`

	// Relations
	Project Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
}

// FileShare represents an NFS/SMB file share
type FileShare struct {
	BaseModel
	Name       string `gorm:"size:255;not null" json:"name"`
	ProjectID  string `gorm:"type:uuid;not null;index" json:"projectId"`
	Size       int    `gorm:"not null" json:"size"` // GB
	Protocol   string `gorm:"size:20;default:'nfs'" json:"protocol"` // nfs, smb
	Status     string `gorm:"size:20;default:'available'" json:"status"`
	MountPoint string `gorm:"size:500" json:"mountPoint,omitempty"`

	// Relations
	Project Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
}

// Backup represents a backup
type Backup struct {
	BaseModel
	Name         string    `gorm:"size:255;not null" json:"name"`
	VolumeID     string    `gorm:"type:uuid;index" json:"volumeId,omitempty"`
	DatabaseID   string    `gorm:"type:uuid;index" json:"databaseId,omitempty"`
	Type         string    `gorm:"size:30" json:"type"` // volume, database
	Size         int64     `json:"size"` // bytes
	Status       string    `gorm:"size:20;default:'creating'" json:"status"`
	ScheduleID   string    `gorm:"type:uuid" json:"scheduleId,omitempty"`
	RetainUntil  time.Time `json:"retainUntil,omitempty"`
}

// ==================== Database Models ====================

// ManagedDatabase represents a managed database instance
type ManagedDatabase struct {
	BaseModel
	Name         string       `gorm:"size:255;not null" json:"name"`
	ProjectID    string       `gorm:"type:uuid;not null;index" json:"projectId"`
	Engine       string       `gorm:"size:50;not null" json:"engine"` // postgresql, mysql
	Version      string       `gorm:"size:20" json:"version"`
	Status       string       `gorm:"size:30;default:'provisioning'" json:"status"`
	VCPUs        int          `gorm:"not null" json:"vcpus"`
	Memory       int          `gorm:"not null" json:"memory"` // MB
	Storage      int          `gorm:"not null" json:"storage"` // GB
	Endpoint     string       `gorm:"size:500" json:"endpoint,omitempty"`
	Port         int          `json:"port,omitempty"`
	Username     string       `gorm:"size:100" json:"username"`
	PasswordHash string       `gorm:"size:255" json:"-"`
	VPCID        string       `gorm:"type:uuid" json:"vpcId,omitempty"`
	EnableHA     bool         `gorm:"default:false" json:"enableHa"`
	DeletedAt    sql.NullTime `gorm:"index" json:"-"`

	// Relations
	Project Project          `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Backups []DatabaseBackup `gorm:"foreignKey:DatabaseID" json:"backups,omitempty"`
}

// DatabaseBackup represents a database backup
type DatabaseBackup struct {
	BaseModel
	DatabaseID  string    `gorm:"type:uuid;not null;index" json:"databaseId"`
	Name        string    `gorm:"size:255;not null" json:"name"`
	Type        string    `gorm:"size:30" json:"type"` // full, incremental
	Size        int64     `json:"size"`
	Status      string    `gorm:"size:20;default:'creating'" json:"status"`
	RetainUntil time.Time `json:"retainUntil,omitempty"`

	// Relations
	Database ManagedDatabase `gorm:"foreignKey:DatabaseID" json:"database,omitempty"`
}

// ==================== Admin Models ====================

// Datacenter represents a physical datacenter
type Datacenter struct {
	BaseModel
	Name          string  `gorm:"size:255;not null" json:"name"`
	Code          string  `gorm:"size:20;uniqueIndex;not null" json:"code"`
	Location      string  `gorm:"size:255" json:"location"`
	Region        string  `gorm:"size:50" json:"region"`
	Status        string  `gorm:"size:20;default:'active'" json:"status"`
	Latitude      float64 `json:"latitude,omitempty"`
	Longitude     float64 `json:"longitude,omitempty"`
	TotalCapacity JSON    `gorm:"type:jsonb;default:'{}'" json:"totalCapacity"`

	// Relations
	Clusters []ProxmoxCluster `gorm:"foreignKey:DatacenterID" json:"clusters,omitempty"`
}

// ProxmoxCluster represents a Proxmox VE cluster
type ProxmoxCluster struct {
	BaseModel
	Name         string `gorm:"size:255;not null" json:"name"`
	DatacenterID string `gorm:"type:uuid;not null;index" json:"datacenterId"`
	APIEndpoint  string `gorm:"size:500;not null" json:"apiEndpoint"`
	Status       string `gorm:"size:20;default:'unknown'" json:"status"`
	Version      string `gorm:"size:50" json:"version,omitempty"`
	HasQuorum    bool   `gorm:"default:false" json:"hasQuorum"`
	TotalCPU     int    `json:"totalCpu"`
	UsedCPU      int    `json:"usedCpu"`
	TotalMemory  int64  `json:"totalMemory"` // bytes
	UsedMemory   int64  `json:"usedMemory"`
	TotalStorage int64  `json:"totalStorage"`
	UsedStorage  int64  `json:"usedStorage"`

	// Relations
	Datacenter Datacenter    `gorm:"foreignKey:DatacenterID" json:"datacenter,omitempty"`
	Nodes      []ProxmoxNode `gorm:"foreignKey:ClusterID" json:"nodes,omitempty"`
}

// ProxmoxNode represents a Proxmox node
type ProxmoxNode struct {
	BaseModel
	Name        string  `gorm:"size:255;not null" json:"name"`
	ClusterID   string  `gorm:"type:uuid;not null;index" json:"clusterId"`
	Status      string  `gorm:"size:20;default:'unknown'" json:"status"`
	IPAddress   string  `gorm:"size:45" json:"ipAddress"`
	CPUCount    int     `json:"cpuCount"`
	CPUUsage    float64 `json:"cpuUsage"`
	MemoryTotal int64   `json:"memoryTotal"`
	MemoryUsed  int64   `json:"memoryUsed"`
	Uptime      int64   `json:"uptime"` // seconds
	VMCount     int     `json:"vmCount"`

	// Relations
	Cluster ProxmoxCluster `gorm:"foreignKey:ClusterID" json:"cluster,omitempty"`
}

// ZeroTierNetwork represents a ZeroTier network
type ZeroTierNetwork struct {
	BaseModel
	NetworkID   string `gorm:"size:50;uniqueIndex;not null" json:"networkId"`
	Name        string `gorm:"size:255;not null" json:"name"`
	Description string `gorm:"size:1000" json:"description,omitempty"`
	Status      string `gorm:"size:20;default:'active'" json:"status"`
	CIDR        string `gorm:"size:50" json:"cidr,omitempty"`
	MemberCount int    `json:"memberCount"`
	Private     bool   `gorm:"default:true" json:"private"`
}

// CephCluster represents a Ceph storage cluster
type CephCluster struct {
	BaseModel
	Name           string `gorm:"size:255;not null" json:"name"`
	FSID           string `gorm:"size:50;uniqueIndex" json:"fsid"`
	Status         string `gorm:"size:20;default:'unknown'" json:"status"`
	Health         string `gorm:"size:50" json:"health"`
	MonCount       int    `json:"monCount"`
	OSDCount       int    `json:"osdCount"`
	TotalCapacity  int64  `json:"totalCapacity"`
	UsedCapacity   int64  `json:"usedCapacity"`
	AvailCapacity  int64  `json:"availCapacity"`

	// Relations
	Pools []StoragePool `gorm:"foreignKey:CephClusterID" json:"pools,omitempty"`
}

// StoragePool represents a Ceph storage pool
type StoragePool struct {
	BaseModel
	Name          string `gorm:"size:255;not null" json:"name"`
	CephClusterID string `gorm:"type:uuid;not null;index" json:"cephClusterId"`
	PoolID        int    `json:"poolId"`
	Type          string `gorm:"size:50" json:"type"` // replicated, erasure
	Size          int64  `json:"size"`
	UsedSize      int64  `json:"usedSize"`
	PGCount       int    `json:"pgCount"`

	// Relations
	CephCluster CephCluster `gorm:"foreignKey:CephClusterID" json:"cephCluster,omitempty"`
}

// ==================== Billing Models ====================

// BillingPlan represents a subscription plan
type BillingPlan struct {
	BaseModel
	Name         string  `gorm:"size:100;uniqueIndex;not null" json:"name"`
	DisplayName  string  `gorm:"size:255" json:"displayName"`
	Description  string  `gorm:"size:1000" json:"description,omitempty"`
	PriceMonthly float64 `json:"priceMonthly"`
	MaxVMs       int     `json:"maxVms"`
	MaxVCPUs     int     `json:"maxVcpus"`
	MaxMemoryGB  int     `json:"maxMemoryGb"`
	MaxStorageGB int     `json:"maxStorageGb"`
	MaxProjects  int     `json:"maxProjects"`
	Features     JSON    `gorm:"type:jsonb;default:'[]'" json:"features"`
	IsActive     bool    `gorm:"default:true" json:"isActive"`
}

// PricingRule represents pricing for a resource type
type PricingRule struct {
	BaseModel
	ResourceType string  `gorm:"size:50;not null" json:"resourceType"` // vcpu, memory, storage, etc.
	Unit         string  `gorm:"size:30" json:"unit"` // hour, GB, request, etc.
	PricePerUnit float64 `json:"pricePerUnit"`
	Currency     string  `gorm:"size:10;default:'USD'" json:"currency"`
	Region       string  `gorm:"size:50" json:"region,omitempty"`
	IsActive     bool    `gorm:"default:true" json:"isActive"`
}

// UsageRecord represents resource usage
type UsageRecord struct {
	BaseModel
	OrganizationID string    `gorm:"type:uuid;not null;index" json:"organizationId"`
	ProjectID      string    `gorm:"type:uuid;index" json:"projectId,omitempty"`
	ResourceType   string    `gorm:"size:50;not null;index" json:"resourceType"`
	ResourceID     string    `gorm:"type:uuid;index" json:"resourceId,omitempty"`
	Quantity       float64   `json:"quantity"`
	Unit           string    `gorm:"size:30" json:"unit"`
	StartTime      time.Time `gorm:"index" json:"startTime"`
	EndTime        time.Time `json:"endTime"`
	Cost           float64   `json:"cost"`
}

// Invoice represents a billing invoice
type Invoice struct {
	BaseModel
	OrganizationID string       `gorm:"type:uuid;not null;index" json:"organizationId"`
	Number         string       `gorm:"size:50;uniqueIndex;not null" json:"number"`
	Status         string       `gorm:"size:20;default:'draft'" json:"status"` // draft, pending, paid, overdue
	PeriodStart    time.Time    `json:"periodStart"`
	PeriodEnd      time.Time    `json:"periodEnd"`
	Subtotal       float64      `json:"subtotal"`
	Tax            float64      `json:"tax"`
	Total          float64      `json:"total"`
	Currency       string       `gorm:"size:10;default:'USD'" json:"currency"`
	DueDate        time.Time    `json:"dueDate"`
	PaidAt         sql.NullTime `json:"paidAt,omitempty"`

	// Relations
	Organization Organization       `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	LineItems    []InvoiceLineItem `gorm:"foreignKey:InvoiceID" json:"lineItems,omitempty"`
}

// InvoiceLineItem represents an invoice line item
type InvoiceLineItem struct {
	BaseModel
	InvoiceID    string  `gorm:"type:uuid;not null;index" json:"invoiceId"`
	Description  string  `gorm:"size:500" json:"description"`
	ResourceType string  `gorm:"size:50" json:"resourceType"`
	Quantity     float64 `json:"quantity"`
	Unit         string  `gorm:"size:30" json:"unit"`
	UnitPrice    float64 `json:"unitPrice"`
	Total        float64 `json:"total"`

	// Relations
	Invoice Invoice `gorm:"foreignKey:InvoiceID" json:"invoice,omitempty"`
}

// Payment represents a payment
type Payment struct {
	BaseModel
	OrganizationID string    `gorm:"type:uuid;not null;index" json:"organizationId"`
	InvoiceID      string    `gorm:"type:uuid;index" json:"invoiceId,omitempty"`
	Amount         float64   `json:"amount"`
	Currency       string    `gorm:"size:10;default:'USD'" json:"currency"`
	Method         string    `gorm:"size:50" json:"method"` // credit_card, bank_transfer, etc.
	Status         string    `gorm:"size:20;default:'pending'" json:"status"`
	TransactionID  string    `gorm:"size:100" json:"transactionId,omitempty"`
	ProcessedAt    time.Time `json:"processedAt,omitempty"`

	// Relations
	Organization Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Invoice      Invoice      `gorm:"foreignKey:InvoiceID" json:"invoice,omitempty"`
}

// ==================== Custom Types ====================

// JSON type for PostgreSQL JSONB
type JSON map[string]interface{}

// Scan implements sql.Scanner for JSON
func (j *JSON) Scan(value interface{}) error {
	if value == nil {
		*j = make(map[string]interface{})
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("failed to scan JSON: expected []byte or string, got %T", value)
	}

	if len(bytes) == 0 || string(bytes) == "{}" {
		*j = make(map[string]interface{})
		return nil
	}
	return json.Unmarshal(bytes, j)
}

// Value implements driver.Valuer for JSON
func (j JSON) Value() (driver.Value, error) {
	if j == nil {
		return "{}", nil
	}
	return json.Marshal(j)
}

// StringArray type for PostgreSQL text[]
type StringArray []string

// Scan implements sql.Scanner for StringArray
func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("failed to scan StringArray: expected []byte, got %T", value)
	}
	// PostgreSQL array format: {val1,val2,val3}
	str := string(bytes)
	if str == "{}" || str == "" {
		*s = []string{}
		return nil
	}
	// Remove braces and split
	str = str[1 : len(str)-1]
	*s = splitArrayString(str)
	return nil
}

// Value implements driver.Valuer for StringArray
func (s StringArray) Value() (driver.Value, error) {
	if s == nil || len(s) == 0 {
		return "{}", nil
	}
	return "{" + joinArrayString(s) + "}", nil
}

func splitArrayString(s string) []string {
	if s == "" {
		return []string{}
	}
	var result []string
	var current string
	inQuotes := false
	for _, c := range s {
		if c == '"' {
			inQuotes = !inQuotes
		} else if c == ',' && !inQuotes {
			result = append(result, current)
			current = ""
		} else {
			current += string(c)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}

func joinArrayString(arr []string) string {
	var result string
	for i, s := range arr {
		if i > 0 {
			result += ","
		}
		// Quote strings that contain special characters
		if containsSpecial(s) {
			result += "\"" + s + "\""
		} else {
			result += s
		}
	}
	return result
}

func containsSpecial(s string) bool {
	for _, c := range s {
		if c == ',' || c == '"' || c == '{' || c == '}' {
			return true
		}
	}
	return false
}
