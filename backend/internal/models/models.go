package models

import "time"

// User represents a platform user
type User struct {
	ID             string    `json:"id"`
	Email          string    `json:"email"`
	Name           string    `json:"name"`
	Role           string    `json:"role"`
	OrganizationID string    `json:"organizationId"`
	Avatar         string    `json:"avatar,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

// Organization represents a tenant organization
type Organization struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Plan      string    `json:"plan"`
	CreatedAt time.Time `json:"createdAt"`
}

// Project represents a project within an organization
type Project struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	OrganizationID string    `json:"organizationId"`
	Description    string    `json:"description,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

// VM represents a virtual machine
type VM struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	ProjectID string    `json:"projectId"`
	VCPUs     int       `json:"vcpus"`
	Memory    int       `json:"memory"`
	Disk      int       `json:"disk"`
	OS        string    `json:"os"`
	PublicIP  string    `json:"publicIp,omitempty"`
	PrivateIP string    `json:"privateIp"`
	Region    string    `json:"region"`
	Zone      string    `json:"zone"`
	CreatedAt time.Time `json:"createdAt"`
	Tags      []string  `json:"tags"`
}

// KubernetesCluster represents a managed K8s cluster
type KubernetesCluster struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	ProjectID string     `json:"projectId"`
	Status    string     `json:"status"`
	Version   string     `json:"version"`
	Region    string     `json:"region"`
	NodeCount int        `json:"nodeCount"`
	NodePools []NodePool `json:"nodePools"`
	Endpoint  string     `json:"endpoint,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
}

// NodePool represents a K8s node pool
type NodePool struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	NodeCount   int    `json:"nodeCount"`
	MinNodes    int    `json:"minNodes"`
	MaxNodes    int    `json:"maxNodes"`
	MachineType string `json:"machineType"`
	Status      string `json:"status"`
}

// VPC represents a virtual private cloud
type VPC struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	ProjectID string    `json:"projectId"`
	CIDR      string    `json:"cidr"`
	Subnets   []Subnet  `json:"subnets"`
	Region    string    `json:"region"`
	CreatedAt time.Time `json:"createdAt"`
}

// Subnet represents a network subnet
type Subnet struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	CIDR     string `json:"cidr"`
	Zone     string `json:"zone"`
	IsPublic bool   `json:"isPublic"`
}

// Volume represents a block storage volume
type Volume struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	ProjectID  string    `json:"projectId"`
	Size       int       `json:"size"`
	Type       string    `json:"type"`
	Status     string    `json:"status"`
	AttachedTo string    `json:"attachedTo,omitempty"`
	Region     string    `json:"region"`
	CreatedAt  time.Time `json:"createdAt"`
}

// Database represents a managed database
type Database struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	ProjectID string    `json:"projectId"`
	Engine    string    `json:"engine"`
	Version   string    `json:"version"`
	Status    string    `json:"status"`
	VCPUs     int       `json:"vcpus"`
	Memory    int       `json:"memory"`
	Storage   int       `json:"storage"`
	Endpoint  string    `json:"endpoint,omitempty"`
	Region    string    `json:"region"`
	CreatedAt time.Time `json:"createdAt"`
}

// Datacenter represents a physical datacenter (admin)
type Datacenter struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Location     string  `json:"location"`
	Region       string  `json:"region"`
	Status       string  `json:"status"`
	TotalNodes   int     `json:"totalNodes"`
	TotalVMs     int     `json:"totalVMs"`
	CPUUsage     float64 `json:"cpuUsage"`
	MemoryUsage  float64 `json:"memoryUsage"`
	StorageUsage float64 `json:"storageUsage"`
}

// Tenant represents a customer organization (admin view)
type Tenant struct {
	ID            string       `json:"id"`
	Name          string       `json:"name"`
	Email         string       `json:"email"`
	Organization  Organization `json:"organization"`
	Status        string       `json:"status"`
	ResourceUsage struct {
		VMs     int `json:"vms"`
		VCPUs   int `json:"vcpus"`
		Memory  int `json:"memory"`
		Storage int `json:"storage"`
	} `json:"resourceUsage"`
	MonthlySpend float64   `json:"monthlySpend"`
	CreatedAt    time.Time `json:"createdAt"`
}

// BillingData represents billing information
type BillingData struct {
	CurrentMonthTotal float64         `json:"currentMonthTotal"`
	LastMonthTotal    float64         `json:"lastMonthTotal"`
	Forecast          float64         `json:"forecast"`
	Breakdown         []UsageBreakdown `json:"breakdown"`
}

// UsageBreakdown represents a billing line item
type UsageBreakdown struct {
	Resource string  `json:"resource"`
	Usage    float64 `json:"usage"`
	Unit     string  `json:"unit"`
	Cost     float64 `json:"cost"`
}
