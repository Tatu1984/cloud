package compute

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/cloudplatform/backend/internal/config"
	"github.com/cloudplatform/backend/pkg/errors"
)

// ProxmoxClient handles communication with Proxmox VE API
type ProxmoxClient struct {
	baseURL    string
	httpClient *http.Client
	authTicket string
	csrfToken  string
	tokenAuth  bool
	tokenID    string
	tokenSecret string
}

// NewProxmoxClient creates a new Proxmox API client
func NewProxmoxClient(cfg *config.ProxmoxConfig) *ProxmoxClient {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: !cfg.VerifySSL,
		},
	}

	client := &ProxmoxClient{
		baseURL: strings.TrimSuffix(cfg.APIUrl, "/"),
		httpClient: &http.Client{
			Transport: transport,
			Timeout:   cfg.Timeout,
		},
	}

	// Use token auth if provided
	if cfg.TokenID != "" && cfg.TokenSecret != "" {
		client.tokenAuth = true
		client.tokenID = cfg.TokenID
		client.tokenSecret = cfg.TokenSecret
	}

	return client
}

// Authenticate logs in to Proxmox and obtains auth ticket
func (c *ProxmoxClient) Authenticate(ctx context.Context, username, password string) error {
	if c.tokenAuth {
		return nil // Token auth doesn't need login
	}

	data := url.Values{}
	data.Set("username", username)
	data.Set("password", password)

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/access/ticket", strings.NewReader(data.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("authentication failed: %d", resp.StatusCode)
	}

	var result struct {
		Data struct {
			Ticket    string `json:"ticket"`
			CSRFToken string `json:"CSRFPreventionToken"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return err
	}

	c.authTicket = result.Data.Ticket
	c.csrfToken = result.Data.CSRFToken
	return nil
}

// doRequest performs an authenticated API request
func (c *ProxmoxClient) doRequest(ctx context.Context, method, endpoint string, body interface{}) ([]byte, error) {
	var bodyReader io.Reader
	if body != nil {
		switch v := body.(type) {
		case url.Values:
			bodyReader = strings.NewReader(v.Encode())
		default:
			jsonBody, err := json.Marshal(body)
			if err != nil {
				return nil, err
			}
			bodyReader = bytes.NewReader(jsonBody)
		}
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+endpoint, bodyReader)
	if err != nil {
		return nil, err
	}

	// Set auth headers
	if c.tokenAuth {
		req.Header.Set("Authorization", fmt.Sprintf("PVEAPIToken=%s!%s=%s", c.tokenID, c.tokenID, c.tokenSecret))
	} else {
		req.Header.Set("Cookie", "PVEAuthCookie="+c.authTicket)
		if method != "GET" {
			req.Header.Set("CSRFPreventionToken", c.csrfToken)
		}
	}

	if body != nil {
		if _, ok := body.(url.Values); ok {
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		} else {
			req.Header.Set("Content-Type", "application/json")
		}
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("proxmox API error: %d - %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// Node represents a Proxmox node
type ProxmoxNode struct {
	Node      string  `json:"node"`
	Status    string  `json:"status"`
	CPU       float64 `json:"cpu"`
	MaxCPU    int     `json:"maxcpu"`
	Mem       int64   `json:"mem"`
	MaxMem    int64   `json:"maxmem"`
	Disk      int64   `json:"disk"`
	MaxDisk   int64   `json:"maxdisk"`
	Uptime    int64   `json:"uptime"`
}

// GetNodes returns all nodes in the cluster
func (c *ProxmoxClient) GetNodes(ctx context.Context) ([]ProxmoxNode, error) {
	body, err := c.doRequest(ctx, "GET", "/nodes", nil)
	if err != nil {
		return nil, errors.ProxmoxError(err, "get nodes")
	}

	var result struct {
		Data []ProxmoxNode `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return result.Data, nil
}

// VM represents a Proxmox VM
type ProxmoxVM struct {
	VMID      int     `json:"vmid"`
	Name      string  `json:"name"`
	Status    string  `json:"status"`
	CPU       float64 `json:"cpu"`
	CPUs      int     `json:"cpus"`
	Mem       int64   `json:"mem"`
	MaxMem    int64   `json:"maxmem"`
	Disk      int64   `json:"disk"`
	MaxDisk   int64   `json:"maxdisk"`
	NetIn     int64   `json:"netin"`
	NetOut    int64   `json:"netout"`
	Uptime    int64   `json:"uptime"`
	Node      string  `json:"node"`
}

// GetVMs returns all VMs on a node
func (c *ProxmoxClient) GetVMs(ctx context.Context, node string) ([]ProxmoxVM, error) {
	body, err := c.doRequest(ctx, "GET", fmt.Sprintf("/nodes/%s/qemu", node), nil)
	if err != nil {
		return nil, errors.ProxmoxError(err, "get VMs")
	}

	var result struct {
		Data []ProxmoxVM `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	// Add node to each VM
	for i := range result.Data {
		result.Data[i].Node = node
	}

	return result.Data, nil
}

// GetVM returns details for a specific VM
func (c *ProxmoxClient) GetVM(ctx context.Context, node string, vmid int) (*ProxmoxVM, error) {
	body, err := c.doRequest(ctx, "GET", fmt.Sprintf("/nodes/%s/qemu/%d/status/current", node, vmid), nil)
	if err != nil {
		return nil, errors.ProxmoxError(err, "get VM")
	}

	var result struct {
		Data ProxmoxVM `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	result.Data.Node = node
	return &result.Data, nil
}

// VMCreateOptions represents options for creating a VM
type VMCreateOptions struct {
	VMID        int    `json:"vmid,omitempty"`
	Name        string `json:"name"`
	Memory      int    `json:"memory"`
	Cores       int    `json:"cores"`
	Sockets     int    `json:"sockets"`
	CPU         string `json:"cpu,omitempty"`
	OSType      string `json:"ostype,omitempty"`
	SCSI0       string `json:"scsi0,omitempty"`
	SCSIHw      string `json:"scsihw,omitempty"`
	Net0        string `json:"net0,omitempty"`
	IDE2        string `json:"ide2,omitempty"`
	Boot        string `json:"boot,omitempty"`
	Start       bool   `json:"start,omitempty"`
}

// CreateVM creates a new VM
func (c *ProxmoxClient) CreateVM(ctx context.Context, node string, opts VMCreateOptions) (int, error) {
	data := url.Values{}
	data.Set("name", opts.Name)
	data.Set("memory", fmt.Sprintf("%d", opts.Memory))
	data.Set("cores", fmt.Sprintf("%d", opts.Cores))
	data.Set("sockets", fmt.Sprintf("%d", opts.Sockets))

	if opts.VMID > 0 {
		data.Set("vmid", fmt.Sprintf("%d", opts.VMID))
	}
	if opts.CPU != "" {
		data.Set("cpu", opts.CPU)
	}
	if opts.OSType != "" {
		data.Set("ostype", opts.OSType)
	}
	if opts.SCSI0 != "" {
		data.Set("scsi0", opts.SCSI0)
	}
	if opts.SCSIHw != "" {
		data.Set("scsihw", opts.SCSIHw)
	}
	if opts.Net0 != "" {
		data.Set("net0", opts.Net0)
	}
	if opts.IDE2 != "" {
		data.Set("ide2", opts.IDE2)
	}
	if opts.Boot != "" {
		data.Set("boot", opts.Boot)
	}
	if opts.Start {
		data.Set("start", "1")
	}

	body, err := c.doRequest(ctx, "POST", fmt.Sprintf("/nodes/%s/qemu", node), data)
	if err != nil {
		return 0, errors.ProxmoxError(err, "create VM")
	}

	var result struct {
		Data string `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return 0, err
	}

	return opts.VMID, nil
}

// CloneVM clones a VM from a template
func (c *ProxmoxClient) CloneVM(ctx context.Context, node string, templateVMID, newVMID int, name string) (string, error) {
	data := url.Values{}
	data.Set("newid", fmt.Sprintf("%d", newVMID))
	data.Set("name", name)
	data.Set("full", "1")

	body, err := c.doRequest(ctx, "POST", fmt.Sprintf("/nodes/%s/qemu/%d/clone", node, templateVMID), data)
	if err != nil {
		return "", errors.ProxmoxError(err, "clone VM")
	}

	var result struct {
		Data string `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	return result.Data, nil
}

// StartVM starts a VM
func (c *ProxmoxClient) StartVM(ctx context.Context, node string, vmid int) (string, error) {
	body, err := c.doRequest(ctx, "POST", fmt.Sprintf("/nodes/%s/qemu/%d/status/start", node, vmid), nil)
	if err != nil {
		return "", errors.ProxmoxError(err, "start VM")
	}

	var result struct {
		Data string `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	return result.Data, nil
}

// StopVM stops a VM
func (c *ProxmoxClient) StopVM(ctx context.Context, node string, vmid int) (string, error) {
	body, err := c.doRequest(ctx, "POST", fmt.Sprintf("/nodes/%s/qemu/%d/status/stop", node, vmid), nil)
	if err != nil {
		return "", errors.ProxmoxError(err, "stop VM")
	}

	var result struct {
		Data string `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	return result.Data, nil
}

// ShutdownVM gracefully shuts down a VM
func (c *ProxmoxClient) ShutdownVM(ctx context.Context, node string, vmid int) (string, error) {
	body, err := c.doRequest(ctx, "POST", fmt.Sprintf("/nodes/%s/qemu/%d/status/shutdown", node, vmid), nil)
	if err != nil {
		return "", errors.ProxmoxError(err, "shutdown VM")
	}

	var result struct {
		Data string `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	return result.Data, nil
}

// RebootVM reboots a VM
func (c *ProxmoxClient) RebootVM(ctx context.Context, node string, vmid int) (string, error) {
	body, err := c.doRequest(ctx, "POST", fmt.Sprintf("/nodes/%s/qemu/%d/status/reboot", node, vmid), nil)
	if err != nil {
		return "", errors.ProxmoxError(err, "reboot VM")
	}

	var result struct {
		Data string `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	return result.Data, nil
}

// DeleteVM deletes a VM
func (c *ProxmoxClient) DeleteVM(ctx context.Context, node string, vmid int) (string, error) {
	body, err := c.doRequest(ctx, "DELETE", fmt.Sprintf("/nodes/%s/qemu/%d", node, vmid), nil)
	if err != nil {
		return "", errors.ProxmoxError(err, "delete VM")
	}

	var result struct {
		Data string `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	return result.Data, nil
}

// CreateSnapshot creates a VM snapshot
func (c *ProxmoxClient) CreateSnapshot(ctx context.Context, node string, vmid int, name, description string) (string, error) {
	data := url.Values{}
	data.Set("snapname", name)
	if description != "" {
		data.Set("description", description)
	}

	body, err := c.doRequest(ctx, "POST", fmt.Sprintf("/nodes/%s/qemu/%d/snapshot", node, vmid), data)
	if err != nil {
		return "", errors.ProxmoxError(err, "create snapshot")
	}

	var result struct {
		Data string `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	return result.Data, nil
}

// GetTaskStatus gets the status of a task
func (c *ProxmoxClient) GetTaskStatus(ctx context.Context, node, taskID string) (string, error) {
	body, err := c.doRequest(ctx, "GET", fmt.Sprintf("/nodes/%s/tasks/%s/status", node, taskID), nil)
	if err != nil {
		return "", errors.ProxmoxError(err, "get task status")
	}

	var result struct {
		Data struct {
			Status string `json:"status"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	return result.Data.Status, nil
}

// WaitForTask waits for a task to complete
func (c *ProxmoxClient) WaitForTask(ctx context.Context, node, taskID string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		status, err := c.GetTaskStatus(ctx, node, taskID)
		if err != nil {
			return err
		}
		if status == "stopped" {
			return nil
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
	return fmt.Errorf("timeout waiting for task %s", taskID)
}

// GetNextVMID gets the next available VMID in the cluster
func (c *ProxmoxClient) GetNextVMID(ctx context.Context) (int, error) {
	body, err := c.doRequest(ctx, "GET", "/cluster/nextid", nil)
	if err != nil {
		return 0, errors.ProxmoxError(err, "get next VMID")
	}

	var result struct {
		Data int `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return 0, err
	}

	return result.Data, nil
}

// GetClusterStatus returns cluster status
func (c *ProxmoxClient) GetClusterStatus(ctx context.Context) (map[string]interface{}, error) {
	body, err := c.doRequest(ctx, "GET", "/cluster/status", nil)
	if err != nil {
		return nil, errors.ProxmoxError(err, "get cluster status")
	}

	var result struct {
		Data []map[string]interface{} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	// Find cluster info
	for _, item := range result.Data {
		if item["type"] == "cluster" {
			return item, nil
		}
	}

	return nil, nil
}
