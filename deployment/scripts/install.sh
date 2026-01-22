#!/bin/bash
set -e

echo "================================="
echo "IDM System Installation Script"
echo "Oracle Linux 9.5"
echo "================================="
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}[1/8] Updating system...${NC}"
dnf update -y

echo -e "${GREEN}[2/8] Installing Python 3.11...${NC}"
dnf install python3.11 python3.11-pip python3.11-devel -y

echo -e "${GREEN}[3/8] Installing PostgreSQL 15...${NC}"
dnf install postgresql15-server postgresql15-contrib -y
if [ ! -d "/var/lib/pgsql/15/data/base" ]; then
    postgresql-setup --initdb
fi
systemctl enable --now postgresql

echo -e "${GREEN}[4/8] Installing Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install nodejs -y
fi

echo -e "${GREEN}[5/8] Installing Nginx...${NC}"
dnf install nginx -y
systemctl enable nginx

echo -e "${GREEN}[6/8] Installing build tools...${NC}"
dnf groupinstall "Development Tools" -y
dnf install gcc libpq-devel git -y

echo -e "${GREEN}[7/8] Creating idm user...${NC}"
if ! id "idm" &>/dev/null; then
    useradd -r -s /bin/false idm
    echo "User 'idm' created"
fi

echo -e "${GREEN}[8/8] Creating directories...${NC}"
mkdir -p /opt/idm-system
mkdir -p /var/log/idm
chown -R idm:idm /opt/idm-system /var/log/idm

echo
echo -e "${GREEN}✓ Dependencies installed successfully!${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy project files to /opt/idm-system"
echo "2. Run: sudo -u idm /opt/idm-system/deployment/scripts/setup.sh"
echo "3. Configure PostgreSQL database"
echo "4. Start services"
