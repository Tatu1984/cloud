#!/bin/bash
# =============================================================================
# ZT Bridge VM - Setup Script
# =============================================================================
# This script initializes the ZT Bridge VM environment
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== ZT Bridge VM Setup ==="
echo "Project directory: $PROJECT_DIR"
echo ""

# Check for required commands
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "ERROR: $1 is not installed"
        exit 1
    fi
}

echo "Checking required commands..."
check_command docker
check_command docker-compose

# Check Docker daemon
if ! docker info &> /dev/null; then
    echo "ERROR: Docker daemon is not running"
    exit 1
fi

echo "Docker is available and running"
echo ""

# Create .env file if it doesn't exist
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "Creating .env file from template..."
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    echo "IMPORTANT: Please edit $PROJECT_DIR/.env and fill in the required values"
    echo ""
fi

# Create required directories
echo "Creating required directories..."
mkdir -p "$PROJECT_DIR/nginx/ssl"
mkdir -p "$PROJECT_DIR/nginx/conf.d/stream"
mkdir -p "$PROJECT_DIR/guacamole/extensions"
mkdir -p "$PROJECT_DIR/guacamole/guacamole-home"

# Make scripts executable
echo "Setting script permissions..."
chmod +x "$PROJECT_DIR/zerotier/entrypoint.sh"
chmod +x "$PROJECT_DIR/scripts/"*.sh

# Create empty stream config if it doesn't exist
if [ ! -f "$PROJECT_DIR/nginx/conf.d/stream/vnc.conf" ]; then
    echo "# VNC Stream Proxy Configuration" > "$PROJECT_DIR/nginx/conf.d/stream/vnc.conf"
    echo "# Add VNC proxy entries here as needed" >> "$PROJECT_DIR/nginx/conf.d/stream/vnc.conf"
fi

# Generate self-signed SSL certificate if none exists
if [ ! -f "$PROJECT_DIR/nginx/ssl/fullchain.pem" ]; then
    echo "Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$PROJECT_DIR/nginx/ssl/privkey.pem" \
        -out "$PROJECT_DIR/nginx/ssl/fullchain.pem" \
        -subj "/CN=zt-bridge.local" \
        2>/dev/null || echo "Warning: Could not generate SSL certificate (openssl not available)"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Add your Proxmox nodes to nginx/conf.d/pve-proxy.conf"
echo "3. Run: docker-compose up -d"
echo "4. Access services:"
echo "   - Guacamole: http://localhost/guacamole/ (default: guacadmin/guacadmin)"
echo "   - Zero-UI: http://localhost:4000/ or http://localhost/zero-ui/"
echo "   - PVE API: http://localhost/pve/{node-name}/api2/json/"
echo ""
