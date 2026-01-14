package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/cloudplatform/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// Mock data
var mockVMs = []models.VM{
	{ID: "vm-001", Name: "web-server-prod-01", Status: "running", ProjectID: "proj-1", VCPUs: 4, Memory: 8, Disk: 100, OS: "Ubuntu 22.04 LTS", PublicIP: "203.0.113.10", PrivateIP: "10.0.1.10", Region: "us-east-1", Zone: "us-east-1a", CreatedAt: time.Now().AddDate(0, -1, 0), Tags: []string{"production", "web"}},
	{ID: "vm-002", Name: "api-server-prod-01", Status: "running", ProjectID: "proj-1", VCPUs: 8, Memory: 16, Disk: 200, OS: "Ubuntu 22.04 LTS", PublicIP: "203.0.113.11", PrivateIP: "10.0.1.11", Region: "us-east-1", Zone: "us-east-1a", CreatedAt: time.Now().AddDate(0, -1, 0), Tags: []string{"production", "api"}},
	{ID: "vm-003", Name: "db-primary-01", Status: "running", ProjectID: "proj-1", VCPUs: 16, Memory: 64, Disk: 500, OS: "Rocky Linux 9", PrivateIP: "10.0.2.10", Region: "us-east-1", Zone: "us-east-1b", CreatedAt: time.Now().AddDate(0, -2, 0), Tags: []string{"production", "database"}},
	{ID: "vm-004", Name: "cache-server-01", Status: "running", ProjectID: "proj-1", VCPUs: 4, Memory: 32, Disk: 50, OS: "Ubuntu 22.04 LTS", PrivateIP: "10.0.1.20", Region: "us-east-1", Zone: "us-east-1a", CreatedAt: time.Now().AddDate(0, 0, -15), Tags: []string{"production", "cache"}},
	{ID: "vm-005", Name: "worker-node-01", Status: "stopped", ProjectID: "proj-1", VCPUs: 2, Memory: 4, Disk: 40, OS: "Ubuntu 24.04 LTS", PrivateIP: "10.0.1.30", Region: "us-east-1", Zone: "us-east-1c", CreatedAt: time.Now().AddDate(0, 0, -5), Tags: []string{"batch", "worker"}},
}

var mockK8sClusters = []models.KubernetesCluster{
	{
		ID: "k8s-001", Name: "prod-cluster-main", ProjectID: "proj-1", Status: "running", Version: "1.29.1", Region: "us-east-1", NodeCount: 6,
		NodePools: []models.NodePool{
			{ID: "np-1", Name: "default-pool", NodeCount: 3, MinNodes: 2, MaxNodes: 10, MachineType: "standard-4x8", Status: "active"},
			{ID: "np-2", Name: "high-memory", NodeCount: 3, MinNodes: 1, MaxNodes: 5, MachineType: "highmem-8x32", Status: "active"},
		},
		Endpoint: "https://k8s-prod.cloudplatform.io:6443", CreatedAt: time.Now().AddDate(0, -2, 0),
	},
}

var mockVPCs = []models.VPC{
	{
		ID: "vpc-001", Name: "production-vpc", ProjectID: "proj-1", CIDR: "10.0.0.0/16", Region: "us-east-1",
		Subnets: []models.Subnet{
			{ID: "sub-1", Name: "public-subnet-1a", CIDR: "10.0.1.0/24", Zone: "us-east-1a", IsPublic: true},
			{ID: "sub-2", Name: "public-subnet-1b", CIDR: "10.0.2.0/24", Zone: "us-east-1b", IsPublic: true},
			{ID: "sub-3", Name: "private-subnet-1a", CIDR: "10.0.10.0/24", Zone: "us-east-1a", IsPublic: false},
		},
		CreatedAt: time.Now().AddDate(0, -3, 0),
	},
}

var mockDatacenters = []models.Datacenter{
	{ID: "dc-001", Name: "US-East Primary", Location: "New York, NY", Region: "us-east-1", Status: "online", TotalNodes: 48, TotalVMs: 342, CPUUsage: 67, MemoryUsage: 72, StorageUsage: 58},
	{ID: "dc-002", Name: "US-West Primary", Location: "Los Angeles, CA", Region: "us-west-1", Status: "online", TotalNodes: 36, TotalVMs: 256, CPUUsage: 54, MemoryUsage: 61, StorageUsage: 45},
	{ID: "dc-003", Name: "EU-West Primary", Location: "Amsterdam, NL", Region: "eu-west-1", Status: "online", TotalNodes: 24, TotalVMs: 189, CPUUsage: 48, MemoryUsage: 55, StorageUsage: 42},
	{ID: "dc-004", Name: "Asia-Pacific", Location: "Singapore", Region: "ap-southeast-1", Status: "maintenance", TotalNodes: 12, TotalVMs: 78, CPUUsage: 32, MemoryUsage: 38, StorageUsage: 28},
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// Health check
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "cloud-platform-api"})
}

// VMs
func ListVMs(w http.ResponseWriter, r *http.Request) {
	projectID := r.URL.Query().Get("projectId")
	var result []models.VM
	for _, vm := range mockVMs {
		if projectID == "" || vm.ProjectID == projectID {
			result = append(result, vm)
		}
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": result, "total": len(result)})
}

func GetVM(w http.ResponseWriter, r *http.Request) {
	vmID := chi.URLParam(r, "id")
	for _, vm := range mockVMs {
		if vm.ID == vmID {
			respondJSON(w, http.StatusOK, map[string]interface{}{"data": vm})
			return
		}
	}
	respondJSON(w, http.StatusNotFound, map[string]string{"error": "VM not found"})
}

func CreateVM(w http.ResponseWriter, r *http.Request) {
	var vm models.VM
	if err := json.NewDecoder(r.Body).Decode(&vm); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}
	vm.ID = "vm-" + time.Now().Format("20060102150405")
	vm.Status = "pending"
	vm.CreatedAt = time.Now()
	mockVMs = append(mockVMs, vm)
	respondJSON(w, http.StatusCreated, map[string]interface{}{"data": vm})
}

// Kubernetes Clusters
func ListK8sClusters(w http.ResponseWriter, r *http.Request) {
	projectID := r.URL.Query().Get("projectId")
	var result []models.KubernetesCluster
	for _, cluster := range mockK8sClusters {
		if projectID == "" || cluster.ProjectID == projectID {
			result = append(result, cluster)
		}
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": result, "total": len(result)})
}

// VPCs
func ListVPCs(w http.ResponseWriter, r *http.Request) {
	projectID := r.URL.Query().Get("projectId")
	var result []models.VPC
	for _, vpc := range mockVPCs {
		if projectID == "" || vpc.ProjectID == projectID {
			result = append(result, vpc)
		}
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": result, "total": len(result)})
}

// Admin: Datacenters
func ListDatacenters(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": mockDatacenters, "total": len(mockDatacenters)})
}

func GetDatacenter(w http.ResponseWriter, r *http.Request) {
	dcID := chi.URLParam(r, "id")
	for _, dc := range mockDatacenters {
		if dc.ID == dcID {
			respondJSON(w, http.StatusOK, map[string]interface{}{"data": dc})
			return
		}
	}
	respondJSON(w, http.StatusNotFound, map[string]string{"error": "Datacenter not found"})
}

// Billing
func GetBilling(w http.ResponseWriter, r *http.Request) {
	billing := models.BillingData{
		CurrentMonthTotal: 2847.52,
		LastMonthTotal:    2654.18,
		Forecast:          3120.00,
		Breakdown: []models.UsageBreakdown{
			{Resource: "Compute (VMs)", Usage: 1420, Unit: "hours", Cost: 1842.60},
			{Resource: "Block Storage", Usage: 1800, Unit: "GB", Cost: 324.00},
			{Resource: "Object Storage", Usage: 170, Unit: "GB", Cost: 25.50},
			{Resource: "Network Egress", Usage: 450, Unit: "GB", Cost: 40.50},
			{Resource: "Load Balancers", Usage: 744, Unit: "hours", Cost: 148.80},
			{Resource: "Kubernetes", Usage: 2, Unit: "clusters", Cost: 300.00},
			{Resource: "Managed Databases", Usage: 3, Unit: "instances", Cost: 166.12},
		},
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": billing})
}

// Platform Stats (Admin)
func GetPlatformStats(w http.ResponseWriter, r *http.Request) {
	stats := map[string]interface{}{
		"totalDatacenters": len(mockDatacenters),
		"totalNodes":       120,
		"totalVMs":         865,
		"totalTenants":     45,
		"activeTenants":    42,
		"monthlyRevenue":   68500,
		"avgCPUUsage":      52.4,
		"avgMemoryUsage":   58.2,
		"platformHealth":   "healthy",
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": stats})
}
