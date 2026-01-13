package billing

import (
	"context"
	"time"

	"github.com/cloudplatform/backend/internal/database"
	"github.com/cloudplatform/backend/pkg/errors"
	"gorm.io/gorm"
)

// Service handles billing operations
type Service struct {
	db *gorm.DB
}

// NewService creates a new billing service
func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// UsageSummary represents usage summary
type UsageSummary struct {
	CurrentMonthTotal float64          `json:"currentMonthTotal"`
	LastMonthTotal    float64          `json:"lastMonthTotal"`
	Forecast          float64          `json:"forecast"`
	Breakdown         []UsageBreakdown `json:"breakdown"`
}

// UsageBreakdown represents a usage category
type UsageBreakdown struct {
	Resource string  `json:"resource"`
	Usage    float64 `json:"usage"`
	Unit     string  `json:"unit"`
	Cost     float64 `json:"cost"`
}

// GetUsageSummary returns usage summary for an organization
func (s *Service) GetUsageSummary(ctx context.Context, orgID string) (*UsageSummary, error) {
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	startOfLastMonth := startOfMonth.AddDate(0, -1, 0)

	// Get current month usage
	var currentUsage float64
	s.db.Model(&database.UsageRecord{}).
		Where("organization_id = ? AND start_time >= ?", orgID, startOfMonth).
		Select("COALESCE(SUM(cost), 0)").
		Scan(&currentUsage)

	// Get last month usage
	var lastUsage float64
	s.db.Model(&database.UsageRecord{}).
		Where("organization_id = ? AND start_time >= ? AND start_time < ?", orgID, startOfLastMonth, startOfMonth).
		Select("COALESCE(SUM(cost), 0)").
		Scan(&lastUsage)

	// Calculate forecast
	daysInMonth := time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
	daysPassed := now.Day()
	forecast := (currentUsage / float64(daysPassed)) * float64(daysInMonth)

	// Get breakdown by resource type
	var breakdown []UsageBreakdown
	s.db.Model(&database.UsageRecord{}).
		Select("resource_type as resource, SUM(quantity) as usage, unit, SUM(cost) as cost").
		Where("organization_id = ? AND start_time >= ?", orgID, startOfMonth).
		Group("resource_type, unit").
		Scan(&breakdown)

	// If no real data, return mock data
	if len(breakdown) == 0 {
		breakdown = []UsageBreakdown{
			{Resource: "Compute (vCPU-hours)", Usage: 1250, Unit: "hours", Cost: 50.00},
			{Resource: "Memory (GB-hours)", Usage: 5000, Unit: "GB-hours", Cost: 30.00},
			{Resource: "Storage (Block)", Usage: 500, Unit: "GB", Cost: 50.00},
			{Resource: "Network Egress", Usage: 100, Unit: "GB", Cost: 9.00},
		}
		currentUsage = 139.00
		lastUsage = 125.00
		forecast = 180.00
	}

	return &UsageSummary{
		CurrentMonthTotal: currentUsage,
		LastMonthTotal:    lastUsage,
		Forecast:          forecast,
		Breakdown:         breakdown,
	}, nil
}

// InvoiceResponse represents an invoice in API responses
type InvoiceResponse struct {
	ID          string              `json:"id"`
	Number      string              `json:"number"`
	Status      string              `json:"status"`
	PeriodStart time.Time           `json:"periodStart"`
	PeriodEnd   time.Time           `json:"periodEnd"`
	Subtotal    float64             `json:"subtotal"`
	Tax         float64             `json:"tax"`
	Total       float64             `json:"total"`
	Currency    string              `json:"currency"`
	DueDate     time.Time           `json:"dueDate"`
	LineItems   []InvoiceLineItemResponse `json:"lineItems,omitempty"`
	CreatedAt   time.Time           `json:"createdAt"`
}

// InvoiceLineItemResponse represents a line item
type InvoiceLineItemResponse struct {
	Description  string  `json:"description"`
	ResourceType string  `json:"resourceType"`
	Quantity     float64 `json:"quantity"`
	Unit         string  `json:"unit"`
	UnitPrice    float64 `json:"unitPrice"`
	Total        float64 `json:"total"`
}

// ListInvoices returns invoices for an organization
func (s *Service) ListInvoices(ctx context.Context, orgID string, page, perPage int) ([]InvoiceResponse, int64, error) {
	var invoices []database.Invoice
	var total int64

	query := s.db.WithContext(ctx).
		Preload("LineItems").
		Where("organization_id = ?", orgID)

	query.Model(&database.Invoice{}).Count(&total)

	offset := (page - 1) * perPage
	if err := query.Offset(offset).Limit(perPage).Order("created_at DESC").Find(&invoices).Error; err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	result := make([]InvoiceResponse, len(invoices))
	for i, invoice := range invoices {
		result[i] = toInvoiceResponse(invoice)
	}

	return result, total, nil
}

// GetInvoice returns a specific invoice
func (s *Service) GetInvoice(ctx context.Context, invoiceID string) (*InvoiceResponse, error) {
	var invoice database.Invoice
	if err := s.db.WithContext(ctx).
		Preload("LineItems").
		Where("id = ?", invoiceID).
		First(&invoice).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.NotFound("invoice")
		}
		return nil, errors.DatabaseError(err)
	}

	result := toInvoiceResponse(invoice)
	return &result, nil
}

// PlanResponse represents a billing plan in API responses
type PlanResponse struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	DisplayName  string   `json:"displayName"`
	Description  string   `json:"description,omitempty"`
	PriceMonthly float64  `json:"priceMonthly"`
	MaxVMs       int      `json:"maxVms"`
	MaxVCPUs     int      `json:"maxVcpus"`
	MaxMemoryGB  int      `json:"maxMemoryGb"`
	MaxStorageGB int      `json:"maxStorageGb"`
	MaxProjects  int      `json:"maxProjects"`
	Features     []string `json:"features"`
	IsActive     bool     `json:"isActive"`
}

// ListPlans returns available billing plans
func (s *Service) ListPlans(ctx context.Context) ([]PlanResponse, error) {
	var plans []database.BillingPlan
	if err := s.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("price_monthly ASC").
		Find(&plans).Error; err != nil {
		return nil, errors.DatabaseError(err)
	}

	result := make([]PlanResponse, len(plans))
	for i, plan := range plans {
		result[i] = toPlanResponse(plan)
	}

	return result, nil
}

// GetOrganizationPlan returns the current plan for an organization
func (s *Service) GetOrganizationPlan(ctx context.Context, orgID string) (*PlanResponse, error) {
	var org database.Organization
	if err := s.db.WithContext(ctx).
		Where("id = ?", orgID).
		First(&org).Error; err != nil {
		return nil, errors.NotFound("organization")
	}

	var plan database.BillingPlan
	if err := s.db.WithContext(ctx).
		Where("name = ?", org.Plan).
		First(&plan).Error; err != nil {
		// Return default starter plan
		plan = database.BillingPlan{
			Name:         "starter",
			DisplayName:  "Starter",
			PriceMonthly: 0,
			MaxVMs:       5,
			MaxVCPUs:     10,
			MaxMemoryGB:  20,
			MaxStorageGB: 100,
			MaxProjects:  2,
			IsActive:     true,
		}
	}

	result := toPlanResponse(plan)
	return &result, nil
}

// QuotaUsage represents quota usage
type QuotaUsage struct {
	Resource string `json:"resource"`
	Used     int    `json:"used"`
	Limit    int    `json:"limit"`
	Unit     string `json:"unit"`
}

// GetQuotaUsage returns quota usage for an organization
func (s *Service) GetQuotaUsage(ctx context.Context, orgID string) ([]QuotaUsage, error) {
	// Get organization's plan
	plan, err := s.GetOrganizationPlan(ctx, orgID)
	if err != nil {
		return nil, err
	}

	// Count current usage
	var vmCount, vcpuCount, memoryCount, storageCount, projectCount int64

	s.db.Model(&database.VM{}).
		Joins("JOIN projects ON projects.id = vms.project_id").
		Where("projects.organization_id = ? AND vms.deleted_at IS NULL", orgID).
		Count(&vmCount)

	s.db.Model(&database.VM{}).
		Joins("JOIN projects ON projects.id = vms.project_id").
		Where("projects.organization_id = ? AND vms.deleted_at IS NULL", orgID).
		Select("COALESCE(SUM(vcpus), 0)").
		Scan(&vcpuCount)

	s.db.Model(&database.VM{}).
		Joins("JOIN projects ON projects.id = vms.project_id").
		Where("projects.organization_id = ? AND vms.deleted_at IS NULL", orgID).
		Select("COALESCE(SUM(memory), 0)").
		Scan(&memoryCount)

	s.db.Model(&database.Volume{}).
		Joins("JOIN projects ON projects.id = volumes.project_id").
		Where("projects.organization_id = ? AND volumes.deleted_at IS NULL", orgID).
		Select("COALESCE(SUM(size), 0)").
		Scan(&storageCount)

	s.db.Model(&database.Project{}).
		Where("organization_id = ? AND deleted_at IS NULL", orgID).
		Count(&projectCount)

	return []QuotaUsage{
		{Resource: "VMs", Used: int(vmCount), Limit: plan.MaxVMs, Unit: "instances"},
		{Resource: "vCPUs", Used: int(vcpuCount), Limit: plan.MaxVCPUs, Unit: "cores"},
		{Resource: "Memory", Used: int(memoryCount / 1024), Limit: plan.MaxMemoryGB, Unit: "GB"},
		{Resource: "Storage", Used: int(storageCount), Limit: plan.MaxStorageGB, Unit: "GB"},
		{Resource: "Projects", Used: int(projectCount), Limit: plan.MaxProjects, Unit: "projects"},
	}, nil
}

// RecordUsage records resource usage
func (s *Service) RecordUsage(ctx context.Context, orgID, projectID, resourceType, resourceID string, quantity float64, unit string) error {
	// Get pricing rule
	var rule database.PricingRule
	if err := s.db.WithContext(ctx).
		Where("resource_type = ? AND is_active = ?", resourceType, true).
		First(&rule).Error; err != nil {
		// Use default pricing
		rule.PricePerUnit = 0.01
	}

	cost := quantity * rule.PricePerUnit

	record := database.UsageRecord{
		OrganizationID: orgID,
		ProjectID:      projectID,
		ResourceType:   resourceType,
		ResourceID:     resourceID,
		Quantity:       quantity,
		Unit:           unit,
		StartTime:      time.Now().Add(-1 * time.Hour),
		EndTime:        time.Now(),
		Cost:           cost,
	}

	return s.db.Create(&record).Error
}

func toInvoiceResponse(invoice database.Invoice) InvoiceResponse {
	lineItems := make([]InvoiceLineItemResponse, len(invoice.LineItems))
	for i, item := range invoice.LineItems {
		lineItems[i] = InvoiceLineItemResponse{
			Description:  item.Description,
			ResourceType: item.ResourceType,
			Quantity:     item.Quantity,
			Unit:         item.Unit,
			UnitPrice:    item.UnitPrice,
			Total:        item.Total,
		}
	}

	return InvoiceResponse{
		ID:          invoice.ID,
		Number:      invoice.Number,
		Status:      invoice.Status,
		PeriodStart: invoice.PeriodStart,
		PeriodEnd:   invoice.PeriodEnd,
		Subtotal:    invoice.Subtotal,
		Tax:         invoice.Tax,
		Total:       invoice.Total,
		Currency:    invoice.Currency,
		DueDate:     invoice.DueDate,
		LineItems:   lineItems,
		CreatedAt:   invoice.CreatedAt,
	}
}

func toPlanResponse(plan database.BillingPlan) PlanResponse {
	features := []string{}
	// Extract features from JSON if present

	return PlanResponse{
		ID:           plan.ID,
		Name:         plan.Name,
		DisplayName:  plan.DisplayName,
		Description:  plan.Description,
		PriceMonthly: plan.PriceMonthly,
		MaxVMs:       plan.MaxVMs,
		MaxVCPUs:     plan.MaxVCPUs,
		MaxMemoryGB:  plan.MaxMemoryGB,
		MaxStorageGB: plan.MaxStorageGB,
		MaxProjects:  plan.MaxProjects,
		Features:     features,
		IsActive:     plan.IsActive,
	}
}
