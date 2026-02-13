#!/bin/bash
# =============================================================================
# ZT Bridge VM - Status Script
# =============================================================================
# This script displays the status of all ZT Bridge services
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=============================================="
echo "       ZT Bridge VM Status Report"
echo "=============================================="
echo ""

# Check Docker services
echo "=== Docker Services ==="
cd "$PROJECT_DIR"
docker-compose ps 2>/dev/null || echo "Docker Compose services not running"
echo ""

# Check ZeroTier status
echo "=== ZeroTier Status ==="
if docker exec zt-bridge-zerotier zerotier-cli status 2>/dev/null; then
    echo ""
    echo "Node ID:"
    docker exec zt-bridge-zerotier zerotier-cli info 2>/dev/null | awk '{print "  " $3}'
    echo ""
    echo "Networks:"
    docker exec zt-bridge-zerotier zerotier-cli listnetworks 2>/dev/null | tail -n +2 | while read line; do
        echo "  $line"
    done
else
    echo "  ZeroTier container not running"
fi
echo ""

# Check PostgreSQL
echo "=== PostgreSQL Status ==="
if docker exec zt-bridge-postgres pg_isready -U ztbridge 2>/dev/null; then
    echo "  Database: Running"
    echo "  Databases:"
    docker exec zt-bridge-postgres psql -U ztbridge -c "SELECT datname FROM pg_database WHERE datistemplate = false;" 2>/dev/null | grep -E "^\s+\w" | while read line; do
        echo "    $line"
    done
else
    echo "  Database: Not running"
fi
echo ""

# Check Guacamole
echo "=== Guacamole Status ==="
if curl -s -o /dev/null -w "%{http_code}" http://localhost/guacamole/ 2>/dev/null | grep -q "200\|302"; then
    echo "  Web App: Running"
    echo "  URL: http://localhost/guacamole/"

    # Count connections
    CONN_COUNT=$(docker exec zt-bridge-postgres psql -U ztbridge -d guacamole -t -c "SELECT COUNT(*) FROM guacamole_connection;" 2>/dev/null | tr -d ' ')
    echo "  Connections configured: $CONN_COUNT"
else
    echo "  Web App: Not accessible"
fi

if docker exec zt-bridge-guacd nc -z localhost 4822 2>/dev/null; then
    echo "  Daemon (guacd): Running"
else
    echo "  Daemon (guacd): Not running"
fi
echo ""

# Check Zero-UI
echo "=== Zero-UI Status ==="
ZERO_UI_PORT=$(grep ZERO_UI_PORT "$PROJECT_DIR/.env" 2>/dev/null | cut -d= -f2 || echo "4000")
ZERO_UI_PORT="${ZERO_UI_PORT:-4000}"
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$ZERO_UI_PORT" 2>/dev/null | grep -q "200\|302"; then
    echo "  Status: Running"
    echo "  URL: http://localhost:$ZERO_UI_PORT/"
else
    echo "  Status: Not accessible"
fi
echo ""

# Check Nginx
echo "=== Nginx Proxy Status ==="
if curl -s http://localhost/health 2>/dev/null | grep -q "OK"; then
    echo "  Status: Running"
    echo "  Health check: OK"
    echo "  URLs:"
    echo "    - http://localhost/ (main)"
    echo "    - http://localhost/guacamole/ (console)"
    echo "    - http://localhost/zero-ui/ (ZeroTier UI)"
    echo "    - http://localhost/pve/{node}/api2/json/ (PVE API)"
else
    echo "  Status: Not accessible"
fi
echo ""

# Network info
echo "=== Network Interfaces ==="
echo "  ZeroTier interfaces:"
ip addr show 2>/dev/null | grep -A2 "^[0-9]*: zt" | head -10 || echo "  No ZeroTier interfaces found on host"
echo ""

echo "=============================================="
echo "       End of Status Report"
echo "=============================================="
