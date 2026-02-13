#!/bin/bash
# =============================================================================
# ZT Bridge VM - ZeroTier Entrypoint Script
# =============================================================================
# This script initializes the ZeroTier client and joins configured networks
# =============================================================================

set -e

echo "=== ZeroTier Client Initialization ==="

# Start ZeroTier daemon
echo "Starting ZeroTier daemon..."
zerotier-one &

# Wait for ZeroTier to initialize
echo "Waiting for ZeroTier to initialize..."
sleep 5

# Wait for ZeroTier to be ready
max_attempts=30
attempt=0
while ! zerotier-cli status >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "ERROR: ZeroTier failed to start after $max_attempts attempts"
        exit 1
    fi
    echo "Waiting for ZeroTier daemon... (attempt $attempt/$max_attempts)"
    sleep 2
done

# Display ZeroTier status
echo "ZeroTier daemon started successfully!"
zerotier-cli status

# Get the node ID
NODE_ID=$(zerotier-cli info | awk '{print $3}')
echo "ZeroTier Node ID: $NODE_ID"

# Join networks if ZEROTIER_NETWORK_IDS is set
if [ -n "$ZEROTIER_NETWORK_IDS" ]; then
    echo "Joining ZeroTier networks..."
    IFS=',' read -ra NETWORKS <<< "$ZEROTIER_NETWORK_IDS"
    for network in "${NETWORKS[@]}"; do
        network=$(echo "$network" | tr -d ' ')
        if [ -n "$network" ]; then
            echo "Joining network: $network"
            zerotier-cli join "$network" || echo "Warning: Failed to join network $network"
        fi
    done
fi

# List joined networks
echo ""
echo "=== Joined Networks ==="
zerotier-cli listnetworks

# Display network interfaces
echo ""
echo "=== Network Interfaces ==="
ip addr show | grep -E "^[0-9]+:|inet " || true

# Create a file to indicate ZeroTier is ready
touch /var/lib/zerotier-one/.ready

echo ""
echo "=== ZeroTier Initialization Complete ==="
echo "Node ID: $NODE_ID"
echo ""

# Keep the container running
exec tail -f /dev/null
