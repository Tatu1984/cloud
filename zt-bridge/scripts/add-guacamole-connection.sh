#!/bin/bash
# =============================================================================
# ZT Bridge VM - Add Guacamole Connection Script
# =============================================================================
# This script adds a new VM connection to Guacamole for console access
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
fi

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-ztbridge}"
POSTGRES_DB="guacamole"

usage() {
    echo "Usage: $0 <connection-name> <protocol> <hostname> [options]"
    echo ""
    echo "Arguments:"
    echo "  connection-name  - Display name for the connection"
    echo "  protocol         - Connection protocol (vnc, rdp, ssh, telnet)"
    echo "  hostname         - Target host IP or hostname"
    echo ""
    echo "Options:"
    echo "  --port <port>      - Target port (default: depends on protocol)"
    echo "  --username <user>  - Username for authentication"
    echo "  --password <pass>  - Password for authentication"
    echo "  --group <group>    - Connection group name"
    echo ""
    echo "Examples:"
    echo "  $0 'VM-Web-Server' vnc 10.147.17.100 --port 5901"
    echo "  $0 'VM-Database' ssh 10.147.17.101 --username root"
    echo "  $0 'Windows-Server' rdp 10.147.17.102 --username admin --password secret"
    exit 1
}

if [ $# -lt 3 ]; then
    usage
fi

CONNECTION_NAME="$1"
PROTOCOL="$2"
HOSTNAME="$3"
shift 3

# Default ports by protocol
case "$PROTOCOL" in
    vnc)    PORT=5900 ;;
    rdp)    PORT=3389 ;;
    ssh)    PORT=22 ;;
    telnet) PORT=23 ;;
    *)      echo "ERROR: Unknown protocol: $PROTOCOL"; exit 1 ;;
esac

USERNAME=""
PASSWORD=""
GROUP=""

# Parse optional arguments
while [ $# -gt 0 ]; do
    case "$1" in
        --port)
            PORT="$2"
            shift 2
            ;;
        --username)
            USERNAME="$2"
            shift 2
            ;;
        --password)
            PASSWORD="$2"
            shift 2
            ;;
        --group)
            GROUP="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

echo "=== Adding Guacamole Connection ==="
echo "Name: $CONNECTION_NAME"
echo "Protocol: $PROTOCOL"
echo "Hostname: $HOSTNAME"
echo "Port: $PORT"
echo ""

# Build SQL to insert connection
SQL=$(cat <<EOF
-- Insert connection
INSERT INTO guacamole_connection (connection_name, protocol)
VALUES ('$CONNECTION_NAME', '$PROTOCOL')
ON CONFLICT DO NOTHING
RETURNING connection_id;

-- Get connection ID
DO \$\$
DECLARE
    conn_id INTEGER;
BEGIN
    SELECT connection_id INTO conn_id FROM guacamole_connection WHERE connection_name = '$CONNECTION_NAME';

    -- Insert hostname parameter
    INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value)
    VALUES (conn_id, 'hostname', '$HOSTNAME')
    ON CONFLICT (connection_id, parameter_name) DO UPDATE SET parameter_value = '$HOSTNAME';

    -- Insert port parameter
    INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value)
    VALUES (conn_id, 'port', '$PORT')
    ON CONFLICT (connection_id, parameter_name) DO UPDATE SET parameter_value = '$PORT';
EOF
)

# Add username if provided
if [ -n "$USERNAME" ]; then
    SQL="$SQL
    -- Insert username parameter
    INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value)
    VALUES (conn_id, 'username', '$USERNAME')
    ON CONFLICT (connection_id, parameter_name) DO UPDATE SET parameter_value = '$USERNAME';"
fi

# Add password if provided
if [ -n "$PASSWORD" ]; then
    SQL="$SQL
    -- Insert password parameter
    INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value)
    VALUES (conn_id, 'password', '$PASSWORD')
    ON CONFLICT (connection_id, parameter_name) DO UPDATE SET parameter_value = '$PASSWORD';"
fi

# Close the DO block
SQL="$SQL

    -- Grant permission to guacadmin
    INSERT INTO guacamole_connection_permission (entity_id, connection_id, permission)
    SELECT entity_id, conn_id, 'READ'
    FROM guacamole_entity WHERE name = 'guacadmin'
    ON CONFLICT DO NOTHING;

    INSERT INTO guacamole_connection_permission (entity_id, connection_id, permission)
    SELECT entity_id, conn_id, 'UPDATE'
    FROM guacamole_entity WHERE name = 'guacadmin'
    ON CONFLICT DO NOTHING;

    INSERT INTO guacamole_connection_permission (entity_id, connection_id, permission)
    SELECT entity_id, conn_id, 'DELETE'
    FROM guacamole_entity WHERE name = 'guacadmin'
    ON CONFLICT DO NOTHING;

    INSERT INTO guacamole_connection_permission (entity_id, connection_id, permission)
    SELECT entity_id, conn_id, 'ADMINISTER'
    FROM guacamole_entity WHERE name = 'guacadmin'
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Connection added successfully with ID: %', conn_id;
END \$\$;
"

# Execute SQL via docker
echo "Adding connection to Guacamole database..."
docker exec -i zt-bridge-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<< "$SQL"

echo ""
echo "Connection added successfully!"
echo ""
echo "Access the connection at:"
echo "  http://localhost/guacamole/"
echo ""
