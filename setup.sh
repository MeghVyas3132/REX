#!/bin/bash

# REX Repository Setup Script
# This script initializes the monorepo workspace

set -e

echo "=================================="
echo "  REX Monorepo Setup"
echo "=================================="
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js 18 or higher is required"
    echo "Current version: $(node -v)"
    exit 1
fi

echo "✓ Node.js version check passed"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed"
    exit 1
fi

echo "✓ npm is available"

# Install root dependencies
echo ""
echo "Installing root dependencies..."
npm install

# Install workspace dependencies
echo ""
echo "Installing workspace dependencies..."

# Shared package (must be first - no dependencies)
if [ -d "shared" ] && [ -f "shared/package.json" ]; then
    echo "  Installing @rex/shared..."
    cd shared && npm install && cd ..
fi

# Engine package (depends on shared)
if [ -d "engine" ] && [ -f "engine/package.json" ]; then
    echo "  Installing @rex/engine..."
    cd engine && npm install && cd ..
fi

# Nodes package (depends on shared)
if [ -d "nodes" ] && [ -f "nodes/package.json" ]; then
    echo "  Installing @rex/nodes..."
    cd nodes && npm install && cd ..
fi

# SDK package (depends on shared)
if [ -d "sdk" ] && [ -f "sdk/package.json" ]; then
    echo "  Installing @rex/sdk..."
    cd sdk && npm install && cd ..
fi

# DB package
if [ -d "db" ] && [ -f "db/package.json" ]; then
    echo "  Installing @rex/db..."
    cd db && npm install && cd ..
fi

# Backend
if [ -d "backend" ] && [ -f "backend/package.json" ]; then
    echo "  Installing backend..."
    cd backend && npm install && cd ..
fi

# Frontend
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    echo "  Installing frontend..."
    cd frontend && npm install && cd ..
fi

# Build shared types first
echo ""
echo "Building shared packages..."
if [ -d "shared" ] && [ -f "shared/package.json" ]; then
    cd shared && npm run build 2>/dev/null || echo "  Skipped (may need source files)" && cd ..
fi

echo ""
echo "=================================="
echo "  Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "  1. Copy environment files:"
echo "     cp backend/env.example backend/.env"
echo "     cp frontend/env.local.example frontend/.env.local"
echo ""
echo "  2. Start PostgreSQL and Redis:"
echo "     docker compose -f backend/docker-compose.yml up -d"
echo ""
echo "  3. Run database migrations:"
echo "     cd backend && npx prisma migrate dev"
echo ""
echo "  4. Start development servers:"
echo "     npm run dev:backend   # In one terminal"
echo "     npm run dev:frontend  # In another terminal"
echo ""
echo "Or use Docker for everything:"
echo "     npm run docker:dev"
echo ""
