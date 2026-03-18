#!/bin/bash
# Server Setup Script for Manus Project Deployment
# This script prepares a remote server for hosting Manus projects

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_info "Starting server setup for Manus project deployment..."

# Update system
print_info "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
print_success "System updated"

# Install essential packages
print_info "Installing essential packages..."
apt-get install -y -qq \
    curl \
    wget \
    git \
    build-essential \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw
print_success "Essential packages installed"

# Install Node.js
print_info "Installing Node.js 22.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
    print_success "Node.js installed: $(node --version)"
else
    print_success "Node.js already installed: $(node --version)"
fi

# Install pnpm
print_info "Installing pnpm..."
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
    print_success "pnpm installed: $(pnpm --version)"
else
    print_success "pnpm already installed: $(pnpm --version)"
fi

# Install PM2
print_info "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

# Configure firewall
print_info "Configuring firewall..."
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
print_success "Firewall configured"

# Configure Nginx
print_info "Configuring Nginx..."
systemctl enable nginx
systemctl start nginx
print_success "Nginx configured and started"

# Create deployment directory
DEPLOY_DIR="/var/www/manus-projects"
print_info "Creating deployment directory: $DEPLOY_DIR"
mkdir -p $DEPLOY_DIR
chown -R $SUDO_USER:$SUDO_USER $DEPLOY_DIR
print_success "Deployment directory created"

# Create Nginx configuration template
cat > /etc/nginx/sites-available/manus-project-template << 'EOF'
server {
    listen 80;
    server_name DOMAIN_NAME;
    
    root /var/www/manus-projects/PROJECT_NAME;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
print_success "Nginx template created"

# Create deployment user
DEPLOY_USER="manus-deploy"
if ! id "$DEPLOY_USER" &>/dev/null; then
    print_info "Creating deployment user: $DEPLOY_USER"
    useradd -m -s /bin/bash $DEPLOY_USER
    usermod -aG www-data $DEPLOY_USER
    print_success "Deployment user created"
else
    print_success "Deployment user already exists"
fi

# Setup SSH for deployment
DEPLOY_HOME="/home/$DEPLOY_USER"
SSH_DIR="$DEPLOY_HOME/.ssh"
print_info "Setting up SSH for deployment..."
mkdir -p $SSH_DIR
touch $SSH_DIR/authorized_keys
chmod 700 $SSH_DIR
chmod 600 $SSH_DIR/authorized_keys
chown -R $DEPLOY_USER:$DEPLOY_USER $SSH_DIR
print_success "SSH configured for deployment"

# Install Docker (optional, for containerized deployments)
print_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $DEPLOY_USER
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
    print_success "Docker installed"
else
    print_success "Docker already installed"
fi

# Create deployment script
cat > /usr/local/bin/manus-deploy << 'EOF'
#!/bin/bash
# Deployment script for Manus projects

PROJECT_NAME=$1
DEPLOY_DIR="/var/www/manus-projects/$PROJECT_NAME"

if [ -z "$PROJECT_NAME" ]; then
    echo "Usage: manus-deploy <project-name>"
    exit 1
fi

echo "Deploying project: $PROJECT_NAME"

cd $DEPLOY_DIR

# Install dependencies
pnpm install --prod --frozen-lockfile

# Restart application with PM2
pm2 restart $PROJECT_NAME || pm2 start npm --name "$PROJECT_NAME" -- start

echo "✓ Deployment completed"
EOF

chmod +x /usr/local/bin/manus-deploy
print_success "Deployment script created"

# Print summary
echo ""
echo "=========================================="
print_success "Server setup completed!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Add your SSH public key to: $SSH_DIR/authorized_keys"
echo "2. Configure your domain DNS to point to this server"
echo "3. Create Nginx site configuration for your project"
echo "4. Obtain SSL certificate: sudo certbot --nginx -d your-domain.com"
echo "5. Deploy your project using GitHub Actions or manual deployment"
echo ""
echo "Deployment directory: $DEPLOY_DIR"
echo "Deployment user: $DEPLOY_USER"
echo ""
print_info "For manual deployment, use: manus-deploy <project-name>"
echo ""
