#!/bin/bash
set -e

echo "================================="
echo "IDM System Setup Script"
echo "================================="
echo

cd /opt/idm-system

# Backend setup
echo "[1/4] Setting up backend..."
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# Frontend setup
echo "[2/4] Setting up frontend..."
cd frontend
npm install
npm run build
cd ..

echo "[3/4] Configuring environment..."
if [ ! -f backend/.env ]; then
    cat > backend/.env << EOF
DATABASE_URL=postgresql://idm_user:CHANGE_PASSWORD@localhost:5432/idm_db
SECRET_KEY=$(openssl rand -hex 32)
DEBUG=False
EOF
    echo "⚠️  Edit backend/.env and set database password!"
fi

echo "[4/4] Initializing database..."
cd backend
python init_db.py

echo
echo "✓ Setup complete!"
echo
echo "Next steps:"
echo "1. Configure PostgreSQL (see README.md)"
echo "2. Copy nginx config: sudo cp deployment/nginx/idm.conf /etc/nginx/conf.d/"
echo "3. Copy systemd service: sudo cp deployment/systemd/idm-backend.service /etc/systemd/system/"
echo "4. Start services: sudo systemctl start idm-backend nginx"
