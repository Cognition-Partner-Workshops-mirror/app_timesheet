#!/bin/bash
# CareAI - AWS EC2 Setup Script
# Run this script on a fresh Ubuntu 22.04+ EC2 instance to deploy the platform.
# Prerequisites: EC2 instance with at least t3.medium (2 vCPU, 4GB RAM)
# Security Group: Open ports 80, 443, 8000, 9001

set -e

echo "🏥 CareAI Platform - EC2 Deployment Setup"
echo "==========================================="

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add current user to docker group (no sudo needed for docker commands)
sudo usermod -aG docker $USER

# Install Docker Compose standalone
echo "📋 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone the repository (replace with your repo URL)
echo "📥 Cloning CareAI repository..."
# git clone https://github.com/your-username/careai.git /home/ubuntu/careai
# cd /home/ubuntu/careai

# Create environment file from example
echo "⚙️ Creating environment configuration..."
if [ ! -f ./backend/.env ]; then
    cp ./backend/.env.example ./backend/.env
    echo "📝 Please edit ./backend/.env with your production settings"
fi

# Build and start all services
echo "🚀 Building and starting CareAI services..."
docker-compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 15

# Check service status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "==========================================="
echo "🎉 CareAI Platform Deployed Successfully!"
echo "==========================================="
echo ""
echo "🌐 Access Points:"
echo "  - API:          http://$(curl -s ifconfig.me):8000"
echo "  - API Docs:     http://$(curl -s ifconfig.me):8000/docs"
echo "  - Admin Panel:  http://$(curl -s ifconfig.me):3000"
echo "  - MinIO Console: http://$(curl -s ifconfig.me):9001"
echo ""
echo "📱 Default Accounts:"
echo "  - Patient: patient@careai.com / patient123"
echo "  - Doctor:  dr.sharma@careai.com / doctor123"
echo "  - Admin:   admin@careai.com / admin123"
echo ""
echo "⚠️  Important next steps:"
echo "  1. Edit ./backend/.env with production secrets"
echo "  2. Configure AWS S3 credentials (or use MinIO)"
echo "  3. Set up SSL/TLS with Let's Encrypt (certbot)"
echo "  4. Configure your domain DNS to point to this EC2 IP"
echo "  5. Set up CloudWatch monitoring"
echo ""
