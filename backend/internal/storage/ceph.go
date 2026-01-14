package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/cloudplatform/backend/internal/config"
	"github.com/cloudplatform/backend/pkg/errors"
)

// CephClient handles communication with Ceph cluster via REST API
// Note: This uses the Ceph MGR REST API module
type CephClient struct {
	baseURL    string
	httpClient *http.Client
	username   string
	password   string
}

// NewCephClient creates a new Ceph API client
func NewCephClient(cfg *config.CephConfig, apiURL, username, password string) *CephClient {
	return &CephClient{
		baseURL:  apiURL,
		username: username,
		password: password,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// doRequest performs an authenticated API request
func (c *CephClient) doRequest(ctx context.Context, method, endpoint string, body interface{}) ([]byte, error) {
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

	req.SetBasicAuth(c.username, c.password)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

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
		return nil, fmt.Errorf("ceph API error: %d - %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// ClusterStatus represents Ceph cluster status
type ClusterStatus struct {
	FSID          string        `json:"fsid"`
	Health        ClusterHealth `json:"health"`
	ElectionEpoch int           `json:"election_epoch"`
	Quorum        []int         `json:"quorum"`
	QuorumNames   []string      `json:"quorum_names"`
	MonMap        MonMap        `json:"monmap"`
	OSDMap        OSDMap        `json:"osdmap"`
	PGMap         PGMap         `json:"pgmap"`
}

// ClusterHealth represents cluster health status
type ClusterHealth struct {
	Status string                 `json:"status"`
	Checks map[string]HealthCheck `json:"checks"`
}

// HealthCheck represents a health check
type HealthCheck struct {
	Severity string `json:"severity"`
	Summary  struct {
		Message string `json:"message"`
	} `json:"summary"`
}

// MonMap represents monitor map
type MonMap struct {
	Epoch    int      `json:"epoch"`
	FSID     string   `json:"fsid"`
	Modified string   `json:"modified"`
	Created  string   `json:"created"`
	Mons     []Monitor `json:"mons"`
}

// Monitor represents a Ceph monitor
type Monitor struct {
	Rank       int    `json:"rank"`
	Name       string `json:"name"`
	PublicAddr string `json:"public_addr"`
	Addr       string `json:"addr"`
}

// OSDMap represents OSD map
type OSDMap struct {
	Epoch          int `json:"epoch"`
	NumOSDs        int `json:"num_osds"`
	NumUpOSDs      int `json:"num_up_osds"`
	NumInOSDs      int `json:"num_in_osds"`
	Full           bool `json:"full"`
	NearFull       bool `json:"nearfull"`
	NumRemappedPGs int `json:"num_remapped_pgs"`
}

// PGMap represents placement group map
type PGMap struct {
	Version           int     `json:"version"`
	NumPGs            int     `json:"num_pgs"`
	DataBytes         int64   `json:"data_bytes"`
	BytesUsed         int64   `json:"bytes_used"`
	BytesAvail        int64   `json:"bytes_avail"`
	BytesTotal        int64   `json:"bytes_total"`
	ReadBytesSec      int64   `json:"read_bytes_sec"`
	WriteBytesSec     int64   `json:"write_bytes_sec"`
	ReadOpPerSec      int64   `json:"read_op_per_sec"`
	WriteOpPerSec     int64   `json:"write_op_per_sec"`
}

// Pool represents a Ceph pool
type Pool struct {
	PoolID             int    `json:"pool_id"`
	PoolName           string `json:"pool_name"`
	Type               string `json:"type"`
	Size               int    `json:"size"`
	MinSize            int    `json:"min_size"`
	PGNum              int    `json:"pg_num"`
	PGPlacementNum     int    `json:"pg_placement_num"`
	CrushRule          int    `json:"crush_rule"`
	Quota              PoolQuota `json:"quota"`
}

// PoolQuota represents pool quota settings
type PoolQuota struct {
	MaxBytes   int64 `json:"max_bytes"`
	MaxObjects int64 `json:"max_objects"`
}

// PoolStats represents pool statistics
type PoolStats struct {
	PoolID          int   `json:"pool_id"`
	PoolName        string `json:"pool_name"`
	NumBytes        int64 `json:"num_bytes"`
	NumKBYtes       int64 `json:"num_kb"`
	NumObjects      int64 `json:"num_objects"`
	NumObjectClones int64 `json:"num_object_clones"`
	NumObjectCopies int64 `json:"num_object_copies"`
	NumRD           int64 `json:"num_rd"`
	NumRDKB         int64 `json:"num_rd_kb"`
	NumWR           int64 `json:"num_wr"`
	NumWRKB         int64 `json:"num_wr_kb"`
}

// RBDImage represents a RADOS Block Device image
type RBDImage struct {
	Name     string   `json:"name"`
	Size     int64    `json:"size"`
	Pool     string   `json:"pool"`
	Features []string `json:"features"`
}

// GetClusterStatus returns the cluster status
func (c *CephClient) GetClusterStatus(ctx context.Context) (*ClusterStatus, error) {
	body, err := c.doRequest(ctx, "GET", "/api/cluster", nil)
	if err != nil {
		return nil, errors.CephError(err, "get cluster status")
	}

	var status ClusterStatus
	if err := json.Unmarshal(body, &status); err != nil {
		return nil, err
	}

	return &status, nil
}

// GetPools returns all pools
func (c *CephClient) GetPools(ctx context.Context) ([]Pool, error) {
	body, err := c.doRequest(ctx, "GET", "/api/pool", nil)
	if err != nil {
		return nil, errors.CephError(err, "get pools")
	}

	var pools []Pool
	if err := json.Unmarshal(body, &pools); err != nil {
		return nil, err
	}

	return pools, nil
}

// GetPool returns a specific pool
func (c *CephClient) GetPool(ctx context.Context, poolName string) (*Pool, error) {
	body, err := c.doRequest(ctx, "GET", fmt.Sprintf("/api/pool/%s", poolName), nil)
	if err != nil {
		return nil, errors.CephError(err, "get pool")
	}

	var pool Pool
	if err := json.Unmarshal(body, &pool); err != nil {
		return nil, err
	}

	return &pool, nil
}

// CreatePoolRequest represents a request to create a pool
type CreatePoolRequest struct {
	Name   string `json:"pool"`
	PGNum  int    `json:"pg_num"`
	PoolType string `json:"pool_type"` // replicated or erasure
	Size   int    `json:"size,omitempty"`
}

// CreatePool creates a new pool
func (c *CephClient) CreatePool(ctx context.Context, req CreatePoolRequest) error {
	_, err := c.doRequest(ctx, "POST", "/api/pool", req)
	if err != nil {
		return errors.CephError(err, "create pool")
	}
	return nil
}

// DeletePool deletes a pool
func (c *CephClient) DeletePool(ctx context.Context, poolName string) error {
	_, err := c.doRequest(ctx, "DELETE", fmt.Sprintf("/api/pool/%s", poolName), nil)
	if err != nil {
		return errors.CephError(err, "delete pool")
	}
	return nil
}

// ListRBDImages returns all RBD images in a pool
func (c *CephClient) ListRBDImages(ctx context.Context, poolName string) ([]RBDImage, error) {
	body, err := c.doRequest(ctx, "GET", fmt.Sprintf("/api/block/image?pool_name=%s", poolName), nil)
	if err != nil {
		return nil, errors.CephError(err, "list RBD images")
	}

	var images []RBDImage
	if err := json.Unmarshal(body, &images); err != nil {
		return nil, err
	}

	return images, nil
}

// GetRBDImage returns a specific RBD image
func (c *CephClient) GetRBDImage(ctx context.Context, poolName, imageName string) (*RBDImage, error) {
	body, err := c.doRequest(ctx, "GET", fmt.Sprintf("/api/block/image/%s/%s", poolName, imageName), nil)
	if err != nil {
		return nil, errors.CephError(err, "get RBD image")
	}

	var image RBDImage
	if err := json.Unmarshal(body, &image); err != nil {
		return nil, err
	}

	return &image, nil
}

// CreateRBDImageRequest represents a request to create an RBD image
type CreateRBDImageRequest struct {
	Name     string   `json:"name"`
	PoolName string   `json:"pool_name"`
	Size     int64    `json:"size"` // in bytes
	Features []string `json:"features,omitempty"`
}

// CreateRBDImage creates a new RBD image
func (c *CephClient) CreateRBDImage(ctx context.Context, req CreateRBDImageRequest) error {
	_, err := c.doRequest(ctx, "POST", "/api/block/image", req)
	if err != nil {
		return errors.CephError(err, "create RBD image")
	}
	return nil
}

// ResizeRBDImage resizes an RBD image
func (c *CephClient) ResizeRBDImage(ctx context.Context, poolName, imageName string, newSize int64) error {
	data := map[string]interface{}{
		"size": newSize,
	}
	_, err := c.doRequest(ctx, "PUT", fmt.Sprintf("/api/block/image/%s/%s", poolName, imageName), data)
	if err != nil {
		return errors.CephError(err, "resize RBD image")
	}
	return nil
}

// DeleteRBDImage deletes an RBD image
func (c *CephClient) DeleteRBDImage(ctx context.Context, poolName, imageName string) error {
	_, err := c.doRequest(ctx, "DELETE", fmt.Sprintf("/api/block/image/%s/%s", poolName, imageName), nil)
	if err != nil {
		return errors.CephError(err, "delete RBD image")
	}
	return nil
}

// CreateRBDSnapshot creates a snapshot of an RBD image
func (c *CephClient) CreateRBDSnapshot(ctx context.Context, poolName, imageName, snapshotName string) error {
	data := map[string]interface{}{
		"snapshot_name": snapshotName,
	}
	_, err := c.doRequest(ctx, "POST", fmt.Sprintf("/api/block/image/%s/%s/snap", poolName, imageName), data)
	if err != nil {
		return errors.CephError(err, "create RBD snapshot")
	}
	return nil
}

// DeleteRBDSnapshot deletes a snapshot of an RBD image
func (c *CephClient) DeleteRBDSnapshot(ctx context.Context, poolName, imageName, snapshotName string) error {
	_, err := c.doRequest(ctx, "DELETE", fmt.Sprintf("/api/block/image/%s/%s/snap/%s", poolName, imageName, snapshotName), nil)
	if err != nil {
		return errors.CephError(err, "delete RBD snapshot")
	}
	return nil
}

// CloneRBDImage clones an RBD image from a snapshot
func (c *CephClient) CloneRBDImage(ctx context.Context, poolName, imageName, snapshotName, cloneName, clonePool string) error {
	data := map[string]interface{}{
		"child_pool_name":  clonePool,
		"child_image_name": cloneName,
	}
	_, err := c.doRequest(ctx, "POST", fmt.Sprintf("/api/block/image/%s/%s/snap/%s/clone", poolName, imageName, snapshotName), data)
	if err != nil {
		return errors.CephError(err, "clone RBD image")
	}
	return nil
}

// GetOSDs returns all OSDs
func (c *CephClient) GetOSDs(ctx context.Context) ([]map[string]interface{}, error) {
	body, err := c.doRequest(ctx, "GET", "/api/osd", nil)
	if err != nil {
		return nil, errors.CephError(err, "get OSDs")
	}

	var osds []map[string]interface{}
	if err := json.Unmarshal(body, &osds); err != nil {
		return nil, err
	}

	return osds, nil
}

// GetHealthFull returns full health information
func (c *CephClient) GetHealthFull(ctx context.Context) (map[string]interface{}, error) {
	body, err := c.doRequest(ctx, "GET", "/api/health/full", nil)
	if err != nil {
		return nil, errors.CephError(err, "get health full")
	}

	var health map[string]interface{}
	if err := json.Unmarshal(body, &health); err != nil {
		return nil, err
	}

	return health, nil
}

// GetPoolStats returns pool statistics
func (c *CephClient) GetPoolStats(ctx context.Context, poolName string) (*PoolStats, error) {
	body, err := c.doRequest(ctx, "GET", fmt.Sprintf("/api/pool/%s/stats", poolName), nil)
	if err != nil {
		return nil, errors.CephError(err, "get pool stats")
	}

	var stats PoolStats
	if err := json.Unmarshal(body, &stats); err != nil {
		return nil, err
	}

	return &stats, nil
}
