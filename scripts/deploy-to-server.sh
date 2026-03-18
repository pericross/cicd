#!/bin/bash
# Deploy Manus Project to Remote Server
# Usage: ./deploy-to-server.sh <server-host> <project-name> [environment]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

# Check arguments
if [ $# -lt 2 ]; then
    print_error "Usage: $0 <server-host> <project-name> [environment]"
    echo ""
    echo "Examples:"
    echo "  $0 example.com my-project staging"
    echo "  $0 192.168.1.100 my-project production"
    exit 1
fi

SERVER_HOST=$1
PROJECT_NAME=$2
ENVIRONMENT=${3:-production}
DEPLOY_USER="manus-deploy"
DEPLOY_PATH="/var/www/manus-projects/$PROJECT_NAME"

print_info "Deployment Configuration:"
echo "  Server: $SERVER_HOST"
echo "  Project: $PROJECT_NAME"
echo "  Environment: $ENVIRONMENT"
echo ""

# Check if SSH key exists
SSH_KEY="$HOME/.ssh/id_rsa"
if [ ! -f "$SSH_KEY" ]; then
    print_warning "SSH key not found at $SSH_KEY"
    print_info "Attempting to use default SSH authentication..."
fi

# Test SSH connection
print_info "Testing SSH connection..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes $DEPLOY_USER@$SERVER_HOST exit 2>/dev/null; then
    print_success "SSH connection successful"
else
    print_error "Cannot connect to server. Please check:"
    echo "  1. Server is accessible"
    echo "  2. SSH key is added to server"
    echo "  3. User '$DEPLOY_USER' exists on server"
    exit 1
fi

# Check if project directory exists locally
if [ ! -f ".manus-project.json" ]; then
    print_error "Not a Manus project directory"
    exit 1
fi

# Build project
print_info "Building project..."
if [ -f "package.json" ]; then
    pnpm install --frozen-lockfile
    pnpm run build
    print_success "Build completed"
else
    print_warning "No package.json found, skipping build"
fi

# Create deployment archive
print_info "Creating deployment archive..."
ARCHIVE_NAME="${PROJECT_NAME}-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).tar.gz"

if [ -d "dist" ]; then
    tar -czf $ARCHIVE_NAME dist/ package.json pnpm-lock.yaml .manus-project.json 2>/dev/null || true
elif [ -d ".next" ]; then
    tar -czf $ARCHIVE_NAME .next/ package.json pnpm-lock.yaml public/ .manus-project.json 2>/dev/null || true
else
    print_error "No build output found (dist/ or .next/)"
    exit 1
fi

print_success "Archive created: $ARCHIVE_NAME"

# Create deployment directory on server
print_info "Preparing server..."
ssh $DEPLOY_USER@$SERVER_HOST << EOF
    mkdir -p $DEPLOY_PATH
    mkdir -p $DEPLOY_PATH/releases
    mkdir -p $DEPLOY_PATH/backups
EOF

# Upload archive
print_info "Uploading to server..."
scp $ARCHIVE_NAME $DEPLOY_USER@$SERVER_HOST:$DEPLOY_PATH/releases/
print_success "Upload completed"

# Deploy on server
print_info "Deploying on server..."
ssh $DEPLOY_USER@$SERVER_HOST << EOF
    set -e
    cd $DEPLOY_PATH
    
    # Backup current deployment
    if [ -d "current" ]; then
        echo "Creating backup..."
        tar -czf backups/backup-\$(date +%Y%m%d-%H%M%S).tar.gz current/
        # Keep only last 5 backups
        ls -t backups/ | tail -n +6 | xargs -I {} rm backups/{}
    fi
    
    # Extract new release
    echo "Extracting release..."
    rm -rf current
    mkdir -p current
    tar -xzf releases/$ARCHIVE_NAME -C current/
    
    # Install dependencies
    cd current
    if [ -f "package.json" ]; then
        echo "Installing dependencies..."
        pnpm install --prod --frozen-lockfile
    fi
    
    # Restart application
    echo "Restarting application..."
    pm2 restart $PROJECT_NAME || pm2 start npm --name "$PROJECT_NAME" -- start
    pm2 save
    
    echo "✓ Deployment completed"
EOF

print_success "Deployment successful!"

# Cleanup local archive
rm $ARCHIVE_NAME
print_info "Cleaned up local archive"

# Show deployment info
echo ""
echo "=========================================="
print_success "Deployment Summary"
echo "=========================================="
echo "Project: $PROJECT_NAME"
echo "Environment: $ENVIRONMENT"
echo "Server: $SERVER_HOST"
echo "Path: $DEPLOY_PATH/current"
echo ""
print_info "To view logs: ssh $DEPLOY_USER@$SERVER_HOST 'pm2 logs $PROJECT_NAME'"
print_info "To check status: ssh $DEPLOY_USER@$SERVER_HOST 'pm2 status'"
echo ""

# Test deployment
print_info "Testing deployment..."
if ssh $DEPLOY_USER@$SERVER_HOST "pm2 list | grep -q $PROJECT_NAME"; then
    print_success "Application is running"
else
    print_warning "Application status unknown"
fi

echo ""
print_success "Deployment completed successfully!"
