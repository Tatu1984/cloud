# ZT Bridge VM

The ZT Bridge VM is the central networking hub for the MDC (Micro Data Cluster) platform. It provides secure connectivity between the MDC Web Application and remote Proxmox VE sites via ZeroTier VPN.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ZT Bridge VM                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ postgres │  │  nginx   │  │  guacd   │  │ zero-ui  │        │
│  │ Database │  │  Proxy   │  │ Console  │  │ ZT Mgmt  │        │
│  └──────────┘  └────┬─────┘  └──────────┘  └──────────┘        │
│                     │                                           │
│              ┌──────┴──────┐                                    │
│              │   ztNic     │◄─── ZeroTier VPN Interface        │
│              └──────┬──────┘                                    │
└─────────────────────┼───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │MDC Site │   │MDC Site │   │MDC Site │
   │(ProxMox)│   │(ProxMox)│   │(ProxMox)│
   └─────────┘   └─────────┘   └─────────┘
```

## Components

| Component | Description | Port |
|-----------|-------------|------|
| **PostgreSQL** | Database for Guacamole and Zero-UI | 5432 (internal) |
| **nginx** | Reverse proxy for all services and PVE API | 80, 443 |
| **guacd** | Apache Guacamole daemon for remote console | 4822 (internal) |
| **Guacamole** | Web-based remote desktop gateway | 8080 (internal) |
| **Zero-UI** | ZeroTier network management UI | 4000 |
| **ZeroTier** | VPN client for site connectivity | host network |

## Quick Start

### 1. Initial Setup

```bash
# Clone the repository and navigate to zt-bridge
cd zt-bridge

# Run setup script
make setup

# Edit environment configuration
cp .env.example .env
nano .env  # Fill in required values
```

### 2. Start Services

```bash
# Start all services
make up

# Check status
make status
```

### 3. Join ZeroTier Network

```bash
# Join a ZeroTier network
make zerotier-join ID=<your-network-id>

# Check ZeroTier status
make zerotier-status
```

### 4. Add Proxmox Nodes

```bash
# Add a Proxmox node for API proxying
make add-node NAME=pve1 IP=10.147.17.10

# Reload nginx to apply changes
make nginx-reload
```

## Service URLs

After starting the services:

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Guacamole | http://localhost/guacamole/ | guacadmin / guacadmin |
| Zero-UI | http://localhost:4000/ | admin / (set in .env) |
| PVE API Proxy | http://localhost/pve/{node}/api2/json/ | - |
| Health Check | http://localhost/health | - |

## Configuration

### Environment Variables

See `.env.example` for all available configuration options:

- `POSTGRES_*` - Database credentials
- `ZEROTIER_*` - ZeroTier network configuration
- `ZERO_UI_*` - Zero-UI admin credentials
- `NGINX_*` - Web server ports
- `PROXMOX_*` - Proxmox API credentials

### Adding Proxmox Nodes

Edit `nginx/conf.d/pve-proxy.conf` to add your Proxmox nodes:

```nginx
map $pve_node $pve_upstream {
    default         "";
    pve1            10.147.17.10:8006;
    pve2            10.147.17.11:8006;
    pve3            10.147.17.12:8006;
}
```

Or use the helper script:

```bash
./scripts/add-proxmox-node.sh pve1 10.147.17.10
```

### Adding VM Console Connections

Use the helper script to add VMs to Guacamole:

```bash
# VNC connection
./scripts/add-guacamole-connection.sh "Web Server" vnc 10.147.17.100 --port 5901

# SSH connection
./scripts/add-guacamole-connection.sh "Database Server" ssh 10.147.17.101 --username root

# RDP connection (Windows)
./scripts/add-guacamole-connection.sh "Windows Server" rdp 10.147.17.102 --username admin
```

## Management Commands

```bash
# Lifecycle
make up              # Start all services
make down            # Stop all services
make restart         # Restart all services
make clean           # Remove all data (DESTRUCTIVE)

# Monitoring
make status          # Comprehensive status report
make ps              # Docker Compose status
make logs            # Follow all logs
make logs-nginx      # Follow nginx logs

# ZeroTier
make zerotier-status              # Show ZeroTier info
make zerotier-join ID=<network>   # Join network
make zerotier-leave ID=<network>  # Leave network

# Database
make db-shell        # PostgreSQL shell
make backup          # Backup databases
make restore FILE=x  # Restore from backup
```

## SSL/TLS Configuration

### Self-Signed Certificate (Development)

The setup script generates a self-signed certificate automatically.

### Let's Encrypt (Production)

1. Update `.env` with your domain and email
2. Uncomment HTTPS server block in `nginx/conf.d/default.conf`
3. Use certbot for certificate generation

## Troubleshooting

### ZeroTier not connecting

```bash
# Check ZeroTier status
docker exec zt-bridge-zerotier zerotier-cli status

# Check network membership
docker exec zt-bridge-zerotier zerotier-cli listnetworks

# Ensure the node is authorized in ZeroTier Central
```

### Cannot access Proxmox API

```bash
# Verify nginx configuration
docker exec zt-bridge-nginx nginx -t

# Check if Proxmox node is reachable via ZeroTier
docker exec zt-bridge-zerotier ping -c 3 <proxmox-zerotier-ip>

# Check nginx error logs
make logs-nginx
```

### Guacamole connection fails

```bash
# Check guacd status
docker exec zt-bridge-guacd nc -zv localhost 4822

# Verify database connectivity
docker exec zt-bridge-postgres pg_isready -U ztbridge -d guacamole

# Check Guacamole logs
docker logs zt-bridge-guacamole
```

## Security Considerations

1. **Change default passwords** immediately after first login
2. **Enable HTTPS** in production environments
3. **Restrict network access** using firewall rules
4. **Regular backups** of the PostgreSQL database
5. **Monitor access logs** for suspicious activity
6. **Keep images updated** for security patches

## Integration with MDC Web API

The ZT Bridge integrates with the main MDC Web API server:

1. **PVE API Proxy**: Routes API requests to Proxmox nodes through ZeroTier
2. **Console Access**: Provides browser-based VM console via Guacamole
3. **Network Management**: Zero-UI for ZeroTier network administration

The MDC Web API communicates with the ZT Bridge via the Azure VNET (nic1).

## License

This component is part of the MDC Platform.
