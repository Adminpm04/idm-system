#!/bin/bash

# IDM System Project Setup
echo "Setting up IDM System..."

# Create backend structure
mkdir -p backend/{app/{api/endpoints,core,models,schemas,services,crud,db},alembic/versions,tests}

# Create frontend structure
mkdir -p frontend/{src/{components/{common,admin,requests,dashboard},pages,services,store,utils,assets},public}

# Create deployment structure
mkdir -p deployment/{nginx,systemd,scripts}

# Create docs
mkdir -p docs

echo "Project structure created successfully!"
tree -L 3 -I '__pycache__|node_modules|.git'
