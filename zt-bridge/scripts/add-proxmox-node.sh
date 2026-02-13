#!/bin/bash
# =============================================================================
# ZT Bridge VM - Add Proxmox Node Script
# =============================================================================
# This script adds a new Proxmox node to the nginx proxy configuration
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PVE_PROXY_CONF="$PROJECT_DIR/nginx/conf.d/pve-proxy.conf"

usage() {
    echo "Usage: $0 <node-name> <zerotier-ip> [port]"
    echo ""
    echo "Arguments:"
    echo "  node-name    - Name of the Proxmox node (e.g., pve1)"
    echo "  zerotier-ip  - ZeroTier IP address of the node (e.g., 10.147.17.10)"
    echo "  port         - Optional port number (default: 8006)"
    echo ""
    echo "Example:"
    echo "  $0 pve1 10.147.17.10"
    echo "  $0 pve2 10.147.17.11 8006"
    exit 1
}

if [ $# -lt 2 ]; then
    usage
fi

NODE_NAME="$1"
ZT_IP="$2"
PORT="${3:-8006}"

echo "=== Adding Proxmox Node ==="
echo "Node Name: $NODE_NAME"
echo "ZeroTier IP: $ZT_IP"
echo "Port: $PORT"
echo ""

# Validate IP address format
if ! [[ "$ZT_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "ERROR: Invalid IP address format: $ZT_IP"
    exit 1
fi

# Check if node already exists
if grep -q "^    $NODE_NAME " "$PVE_PROXY_CONF" 2>/dev/null; then
    echo "WARNING: Node '$NODE_NAME' already exists in configuration"
    echo "Updating existing entry..."
    sed -i.bak "s/^    $NODE_NAME .*$/    $NODE_NAME            $ZT_IP:$PORT;/" "$PVE_PROXY_CONF"
else
    # Add new node entry after the comment line
    echo "Adding new node entry..."
    sed -i.bak "/# Add more nodes as needed/i\\    $NODE_NAME            $ZT_IP:$PORT;" "$PVE_PROXY_CONF"
fi

echo ""
echo "Node added successfully!"
echo ""
echo "To apply changes, run:"
echo "  docker-compose exec nginx nginx -s reload"
echo ""
echo "Test the proxy with:"
echo "  curl -k http://localhost/pve/$NODE_NAME/api2/json/version"
echo ""
