#!/bin/bash

# Paint Index Server Setup Script
# This script helps automate the deployment of Paint Index on a self-hosted server

set -e

echo "======================================"
echo "Paint Index Server Setup Script"
echo "======================================"
echo ""

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "⚠️  This script is designed for Linux servers."
    echo "For Windows servers, refer to the README.md for manual setup steps."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "Please install Node.js v14 or higher before running this script."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed."
    echo "Would you like to install PostgreSQL now? (y/n)"
    read -r install_postgres

    if [[ "$install_postgres" =~ ^[Yy]$ ]]; then
        echo "Installing PostgreSQL..."
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
        echo "✓ PostgreSQL installed"
    else
        echo "Please install PostgreSQL manually before running this script."
        exit 1
    fi
fi

echo "✓ PostgreSQL is installed"
echo ""

# Start PostgreSQL if not running
echo "Checking PostgreSQL service..."
sudo systemctl start postgresql
sudo systemctl enable postgresql
echo "✓ PostgreSQL service is running"
echo ""

# Create database and user
echo "Creating PostgreSQL database and user..."
sudo -u postgres psql <<EOF
CREATE DATABASE IF NOT EXISTS paint_inventory;
CREATE USER IF NOT EXISTS paintapp WITH PASSWORD 'change_this_password';
ALTER ROLE paintapp SET client_encoding TO 'utf8';
ALTER ROLE paintapp SET default_transaction_isolation TO 'read committed';
ALTER ROLE paintapp SET default_transaction_deferrable TO on;
ALTER ROLE paintapp SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE paint_inventory TO paintapp;
EOF

echo "✓ PostgreSQL database 'paint_inventory' created"
echo "✓ PostgreSQL user 'paintapp' created"
echo ""

# Install npm dependencies
echo "Installing npm dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  .env file created. Please edit it and set:"
    echo "   - DATABASE_URL (update password to match above)"
    echo "   - PAINT_PASSPHRASE (set a secure passphrase)"
    echo ""
    echo "Edit .env file now? (y/n)"
    read -r edit_env

    if [[ "$edit_env" =~ ^[Yy]$ ]]; then
        nano .env
    fi
else
    echo "✓ .env file already exists"
fi

echo ""
echo "Checking .env configuration..."
if grep -q "DATABASE_URL" .env; then
    echo "✓ DATABASE_URL is set"
else
    echo "❌ DATABASE_URL is not set in .env file"
    exit 1
fi

echo ""
echo "Importing paint data..."
npm run import-data

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Install PM2 globally: npm install -g pm2"
echo "2. Start the app: pm2 start server.js --name 'paint-app'"
echo "3. Access the app at: http://localhost:3000"
echo ""
echo "To enable auto-start on server reboot:"
echo "  pm2 startup"
echo "  pm2 save"
echo ""
echo "View logs: pm2 logs paint-app"
echo ""
