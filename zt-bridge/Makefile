# =============================================================================
# ZT Bridge VM - Makefile
# =============================================================================
# Convenience commands for managing the ZT Bridge VM stack
# =============================================================================

.PHONY: help setup up down restart logs status ps clean \
        zerotier-status zerotier-join zerotier-leave \
        add-node add-connection nginx-reload \
        backup restore

# Default target
help:
	@echo "ZT Bridge VM Management Commands"
	@echo "================================="
	@echo ""
	@echo "Setup & Lifecycle:"
	@echo "  make setup          - Initialize environment (first-time setup)"
	@echo "  make up             - Start all services"
	@echo "  make down           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo "  make clean          - Stop services and remove volumes (DESTRUCTIVE)"
	@echo ""
	@echo "Monitoring:"
	@echo "  make status         - Show comprehensive status report"
	@echo "  make ps             - Show Docker Compose service status"
	@echo "  make logs           - Follow all service logs"
	@echo "  make logs-<service> - Follow specific service logs (postgres, nginx, guacd, guacamole, zero-ui, zerotier)"
	@echo ""
	@echo "ZeroTier:"
	@echo "  make zerotier-status        - Show ZeroTier status"
	@echo "  make zerotier-join ID=xxx   - Join a ZeroTier network"
	@echo "  make zerotier-leave ID=xxx  - Leave a ZeroTier network"
	@echo ""
	@echo "Configuration:"
	@echo "  make add-node NAME=xxx IP=xxx [PORT=8006]  - Add a Proxmox node"
	@echo "  make nginx-reload                          - Reload nginx configuration"
	@echo ""
	@echo "Database:"
	@echo "  make db-shell       - Open PostgreSQL shell"
	@echo "  make backup         - Backup databases"
	@echo "  make restore FILE=x - Restore from backup"
	@echo ""

# =============================================================================
# Setup & Lifecycle
# =============================================================================

setup:
	@./scripts/setup.sh

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart

clean:
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] && \
		docker-compose down -v --remove-orphans || echo "Cancelled"

# =============================================================================
# Monitoring
# =============================================================================

status:
	@./scripts/status.sh

ps:
	docker-compose ps

logs:
	docker-compose logs -f

logs-postgres:
	docker-compose logs -f postgres

logs-nginx:
	docker-compose logs -f nginx

logs-guacd:
	docker-compose logs -f guacd

logs-guacamole:
	docker-compose logs -f guacamole

logs-zero-ui:
	docker-compose logs -f zero-ui

logs-zerotier:
	docker-compose logs -f zerotier

# =============================================================================
# ZeroTier Management
# =============================================================================

zerotier-status:
	docker exec zt-bridge-zerotier zerotier-cli status
	@echo ""
	@echo "Node ID:"
	@docker exec zt-bridge-zerotier zerotier-cli info | awk '{print $$3}'
	@echo ""
	@echo "Networks:"
	@docker exec zt-bridge-zerotier zerotier-cli listnetworks

zerotier-join:
ifndef ID
	$(error ID is required. Usage: make zerotier-join ID=<network-id>)
endif
	@./scripts/join-network.sh $(ID)

zerotier-leave:
ifndef ID
	$(error ID is required. Usage: make zerotier-leave ID=<network-id>)
endif
	docker exec zt-bridge-zerotier zerotier-cli leave $(ID)

# =============================================================================
# Configuration
# =============================================================================

add-node:
ifndef NAME
	$(error NAME is required. Usage: make add-node NAME=<node-name> IP=<zerotier-ip> [PORT=8006])
endif
ifndef IP
	$(error IP is required. Usage: make add-node NAME=<node-name> IP=<zerotier-ip> [PORT=8006])
endif
	@./scripts/add-proxmox-node.sh $(NAME) $(IP) $(or $(PORT),8006)

nginx-reload:
	docker exec zt-bridge-nginx nginx -s reload
	@echo "Nginx configuration reloaded"

# =============================================================================
# Database
# =============================================================================

db-shell:
	docker exec -it zt-bridge-postgres psql -U ztbridge

backup:
	@mkdir -p backups
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	docker exec zt-bridge-postgres pg_dumpall -U ztbridge > backups/backup_$$TIMESTAMP.sql && \
	echo "Backup saved to backups/backup_$$TIMESTAMP.sql"

restore:
ifndef FILE
	$(error FILE is required. Usage: make restore FILE=<backup-file>)
endif
	@echo "Restoring from $(FILE)..."
	cat $(FILE) | docker exec -i zt-bridge-postgres psql -U ztbridge
	@echo "Restore complete"
