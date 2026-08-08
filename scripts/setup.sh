#!/bin/bash
# ==============================================================
# AI Job Hunter - Linux/macOS Setup Script
# ==============================================================

set -e

echo "🎯 Setting up AI Job Hunter..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env from .env.example"
fi

mkdir -p data/cv/base data/cv/customized data/jobs/sample data/applications logs

echo "✓ Directories created"

if command -v docker &> /dev/null; then
    echo "Starting Docker services..."
    docker compose up -d
    echo "✓ Docker services started!"
else
    echo "⚠️ Docker is not installed or not in PATH. Please install Docker and run: docker compose up -d"
fi

echo ""
echo "Setup complete! Open http://localhost:3000 for the Dashboard and http://localhost:5678 for n8n."
