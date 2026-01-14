package network

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/cloudplatform/backend/internal/config"
	"github.com/cloudplatform/backend/pkg/errors"
)

// ZeroTierClient handles communication with ZeroTier Central API
type ZeroTierClient struct {
	baseURL    string
	apiToken   string
	httpClient *http.Client
}

// NewZeroTierClient creates a new ZeroTier API client
func NewZeroTierClient(cfg *config.ZeroTierConfig) *ZeroTierClient {
	return &ZeroTierClient{
		baseURL:  cfg.ControllerURL,
		apiToken: cfg.APIToken,
		httpClient: &http.Client{
			Timeout: cfg.Timeout,
		},
	}
}

// doRequest performs an authenticated API request
func (c *ZeroTierClient) doRequest(ctx context.Context, method, endpoint string, body interface{}) ([]byte, error) {
	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+endpoint, bodyReader)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "token "+c.apiToken)
	req.Header.Set("Content-Type", "application/json")

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
		return nil, fmt.Errorf("zerotier API error: %d - %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// Network represents a ZeroTier network
type ZTNetwork struct {
	ID                 string                 `json:"id"`
	NWConfig           ZTNetworkConfig        `json:"config"`
	Description        string                 `json:"description"`
	RulesSource        string                 `json:"rulesSource"`
	Permissions        map[string]interface{} `json:"permissions"`
	OnlineMemberCount  int                    `json:"onlineMemberCount"`
	AuthorizedMemberCount int                 `json:"authorizedMemberCount"`
	TotalMemberCount   int                    `json:"totalMemberCount"`
	CreationTime       int64                  `json:"creationTime"`
}

// ZTNetworkConfig represents network configuration
type ZTNetworkConfig struct {
	Name             string           `json:"name"`
	Private          bool             `json:"private"`
	Routes           []ZTRoute        `json:"routes"`
	IPAssignmentPools []ZTIPPool      `json:"ipAssignmentPools"`
	V4AssignMode     ZTAssignMode     `json:"v4AssignMode"`
	V6AssignMode     ZTAssignMode     `json:"v6AssignMode"`
	MTU              int              `json:"mtu"`
	MulticastLimit   int              `json:"multicastLimit"`
	EnableBroadcast  bool             `json:"enableBroadcast"`
	DNS              *ZTDNS           `json:"dns,omitempty"`
}

// ZTRoute represents a network route
type ZTRoute struct {
	Target string `json:"target"`
	Via    string `json:"via,omitempty"`
}

// ZTIPPool represents an IP assignment pool
type ZTIPPool struct {
	IPRangeStart string `json:"ipRangeStart"`
	IPRangeEnd   string `json:"ipRangeEnd"`
}

// ZTAssignMode represents IP assignment mode
type ZTAssignMode struct {
	ZT bool `json:"zt"`
}

// ZTDNS represents DNS configuration
type ZTDNS struct {
	Domain  string   `json:"domain,omitempty"`
	Servers []string `json:"servers,omitempty"`
}

// Member represents a ZeroTier network member
type ZTMember struct {
	ID                     string            `json:"id"`
	NetworkID              string            `json:"networkId"`
	NodeID                 string            `json:"nodeId"`
	Name                   string            `json:"name"`
	Description            string            `json:"description"`
	Hidden                 bool              `json:"hidden"`
	Authorized             bool              `json:"config.authorized"`
	IPAssignments          []string          `json:"config.ipAssignments"`
	NoAutoAssignIPs        bool              `json:"config.noAutoAssignIps"`
	Capabilities           []int             `json:"config.capabilities"`
	Tags                   [][]int           `json:"config.tags"`
	LastOnline             int64             `json:"lastOnline"`
	LastSeen               int64             `json:"lastSeen"`
	PhysicalAddress        string            `json:"physicalAddress"`
	ClientVersion          string            `json:"clientVersion"`
}

// CreateNetworkRequest represents a request to create a network
type CreateNetworkRequest struct {
	Config ZTNetworkConfig `json:"config"`
}

// GetNetworks returns all networks
func (c *ZeroTierClient) GetNetworks(ctx context.Context) ([]ZTNetwork, error) {
	body, err := c.doRequest(ctx, "GET", "/api/v1/network", nil)
	if err != nil {
		return nil, errors.ZeroTierError(err, "get networks")
	}

	var networks []ZTNetwork
	if err := json.Unmarshal(body, &networks); err != nil {
		return nil, err
	}

	return networks, nil
}

// GetNetwork returns a specific network
func (c *ZeroTierClient) GetNetwork(ctx context.Context, networkID string) (*ZTNetwork, error) {
	body, err := c.doRequest(ctx, "GET", fmt.Sprintf("/api/v1/network/%s", networkID), nil)
	if err != nil {
		return nil, errors.ZeroTierError(err, "get network")
	}

	var network ZTNetwork
	if err := json.Unmarshal(body, &network); err != nil {
		return nil, err
	}

	return &network, nil
}

// CreateNetwork creates a new network
func (c *ZeroTierClient) CreateNetwork(ctx context.Context, config ZTNetworkConfig) (*ZTNetwork, error) {
	req := CreateNetworkRequest{Config: config}
	body, err := c.doRequest(ctx, "POST", "/api/v1/network", req)
	if err != nil {
		return nil, errors.ZeroTierError(err, "create network")
	}

	var network ZTNetwork
	if err := json.Unmarshal(body, &network); err != nil {
		return nil, err
	}

	return &network, nil
}

// UpdateNetwork updates a network
func (c *ZeroTierClient) UpdateNetwork(ctx context.Context, networkID string, config ZTNetworkConfig) (*ZTNetwork, error) {
	req := CreateNetworkRequest{Config: config}
	body, err := c.doRequest(ctx, "POST", fmt.Sprintf("/api/v1/network/%s", networkID), req)
	if err != nil {
		return nil, errors.ZeroTierError(err, "update network")
	}

	var network ZTNetwork
	if err := json.Unmarshal(body, &network); err != nil {
		return nil, err
	}

	return &network, nil
}

// DeleteNetwork deletes a network
func (c *ZeroTierClient) DeleteNetwork(ctx context.Context, networkID string) error {
	_, err := c.doRequest(ctx, "DELETE", fmt.Sprintf("/api/v1/network/%s", networkID), nil)
	if err != nil {
		return errors.ZeroTierError(err, "delete network")
	}
	return nil
}

// GetMembers returns all members of a network
func (c *ZeroTierClient) GetMembers(ctx context.Context, networkID string) ([]ZTMember, error) {
	body, err := c.doRequest(ctx, "GET", fmt.Sprintf("/api/v1/network/%s/member", networkID), nil)
	if err != nil {
		return nil, errors.ZeroTierError(err, "get members")
	}

	var members []ZTMember
	if err := json.Unmarshal(body, &members); err != nil {
		return nil, err
	}

	return members, nil
}

// GetMember returns a specific member
func (c *ZeroTierClient) GetMember(ctx context.Context, networkID, memberID string) (*ZTMember, error) {
	body, err := c.doRequest(ctx, "GET", fmt.Sprintf("/api/v1/network/%s/member/%s", networkID, memberID), nil)
	if err != nil {
		return nil, errors.ZeroTierError(err, "get member")
	}

	var member ZTMember
	if err := json.Unmarshal(body, &member); err != nil {
		return nil, err
	}

	return &member, nil
}

// AuthorizeMember authorizes a member on a network
func (c *ZeroTierClient) AuthorizeMember(ctx context.Context, networkID, memberID string) (*ZTMember, error) {
	updateData := map[string]interface{}{
		"config": map[string]interface{}{
			"authorized": true,
		},
	}

	body, err := c.doRequest(ctx, "POST", fmt.Sprintf("/api/v1/network/%s/member/%s", networkID, memberID), updateData)
	if err != nil {
		return nil, errors.ZeroTierError(err, "authorize member")
	}

	var member ZTMember
	if err := json.Unmarshal(body, &member); err != nil {
		return nil, err
	}

	return &member, nil
}

// DeauthorizeMember deauthorizes a member from a network
func (c *ZeroTierClient) DeauthorizeMember(ctx context.Context, networkID, memberID string) (*ZTMember, error) {
	updateData := map[string]interface{}{
		"config": map[string]interface{}{
			"authorized": false,
		},
	}

	body, err := c.doRequest(ctx, "POST", fmt.Sprintf("/api/v1/network/%s/member/%s", networkID, memberID), updateData)
	if err != nil {
		return nil, errors.ZeroTierError(err, "deauthorize member")
	}

	var member ZTMember
	if err := json.Unmarshal(body, &member); err != nil {
		return nil, err
	}

	return &member, nil
}

// AssignIP assigns an IP address to a member
func (c *ZeroTierClient) AssignIP(ctx context.Context, networkID, memberID, ipAddress string) (*ZTMember, error) {
	// First get current member to preserve existing IPs
	member, err := c.GetMember(ctx, networkID, memberID)
	if err != nil {
		return nil, err
	}

	ips := append(member.IPAssignments, ipAddress)
	updateData := map[string]interface{}{
		"config": map[string]interface{}{
			"ipAssignments": ips,
		},
	}

	body, err := c.doRequest(ctx, "POST", fmt.Sprintf("/api/v1/network/%s/member/%s", networkID, memberID), updateData)
	if err != nil {
		return nil, errors.ZeroTierError(err, "assign IP")
	}

	if err := json.Unmarshal(body, &member); err != nil {
		return nil, err
	}

	return member, nil
}

// DeleteMember removes a member from a network
func (c *ZeroTierClient) DeleteMember(ctx context.Context, networkID, memberID string) error {
	_, err := c.doRequest(ctx, "DELETE", fmt.Sprintf("/api/v1/network/%s/member/%s", networkID, memberID), nil)
	if err != nil {
		return errors.ZeroTierError(err, "delete member")
	}
	return nil
}

// GetControllerStatus returns the controller status
func (c *ZeroTierClient) GetControllerStatus(ctx context.Context) (map[string]interface{}, error) {
	body, err := c.doRequest(ctx, "GET", "/status", nil)
	if err != nil {
		return nil, errors.ZeroTierError(err, "get controller status")
	}

	var status map[string]interface{}
	if err := json.Unmarshal(body, &status); err != nil {
		return nil, err
	}

	return status, nil
}
