#!/bin/bash
# =============================================================================
# ZT Bridge VM - Join ZeroTier Network Script
# =============================================================================
# This script joins a ZeroTier network
# =============================================================================

set -e

usage() {
    echo "Usage: $0 <network-id>"
    echo ""
    echo "Arguments:"
    echo "  network-id  - 16-character ZeroTier network ID"
    echo ""
    echo "Example:"
    echo "  $0 8056c2e21c000001"
    exit 1
}

if [ $# -lt 1 ]; then
    usage
fi

NETWORK_ID="$1"

# Validate network ID format (16 hex characters)
if ! [[ "$NETWORK_ID" =~ ^[0-9a-fA-F]{16}$ ]]; then
    echo "ERROR: Invalid network ID format. Must be 16 hexadecimal characters."
    exit 1
fi

echo "=== Joining ZeroTier Network ==="
echo "Network ID: $NETWORK_ID"
echo ""

# Check if running inside Docker or on host
if [ -f /.dockerenv ]; then
    # Inside Docker container
    zerotier-cli join "$NETWORK_ID"
else
    # On host - use docker exec
    echo "Executing via Docker container..."
    docker exec zt-bridge-zerotier zerotier-cli join "$NETWORK_ID"
fi

echo ""
echo "Network join request sent!"
echo ""
echo "IMPORTANT: You may need to authorize this node in the ZeroTier controller"
echo ""
echo "To check network status:"
echo "  docker exec zt-bridge-zerotier zerotier-cli listnetworks"
echo ""
echo "To get the node ID:"
echo "  docker exec zt-bridge-zerotier zerotier-cli info"
echo ""
