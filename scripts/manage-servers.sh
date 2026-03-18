#!/bin/bash
# Server Management Script for Manus CI/CD
# Manage deployment servers and their configurations

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

CONFIG_DIR="$HOME/.manus-cicd"
SERVERS_FILE="$CONFIG_DIR/servers.json"

# Initialize config directory
mkdir -p $CONFIG_DIR

# Initialize servers file if it doesn't exist
if [ ! -f "$SERVERS_FILE" ]; then
    echo '{"servers": []}' > $SERVERS_FILE
fi

# Function to list servers
list_servers() {
    echo ""
    echo "=========================================="
    echo "  Registered Deployment Servers"
    echo "=========================================="
    echo ""
    
    if [ ! -f "$SERVERS_FILE" ]; then
        print_warning "No servers registered"
        return
    fi
    
    SERVER_COUNT=$(cat $SERVERS_FILE | python3 -c "import sys, json; print(len(json.load(sys.stdin)['servers']))")
    
    if [ "$SERVER_COUNT" -eq 0 ]; then
        print_warning "No servers registered"
        echo ""
        print_info "Use 'manage-servers.sh add' to register a server"
        return
    fi
    
    cat $SERVERS_FILE | python3 << 'EOF'
import sys, json
data = json.load(sys.stdin)
for i, server in enumerate(data['servers'], 1):
    print(f"{i}. {server['name']}")
    print(f"   Host: {server['host']}")
    print(f"   User: {server['user']}")
    print(f"   Region: {server['region']}")
    print(f"   Status: {'✓ Active' if server.get('active', True) else '✗ Inactive'}")
    print()
EOF
}

# Function to add a server
add_server() {
    echo ""
    echo "=========================================="
    echo "  Add Deployment Server"
    echo "=========================================="
    echo ""
    
    read -p "Server name: " NAME
    read -p "Server host (IP or domain): " HOST
    read -p "SSH user: " USER
    read -p "Region (international/china): " REGION
    read -p "SSH key path (default: ~/.ssh/id_rsa): " SSH_KEY
    SSH_KEY=${SSH_KEY:-~/.ssh/id_rsa}
    
    # Expand tilde
    SSH_KEY="${SSH_KEY/#\~/$HOME}"
    
    # Validate SSH key
    if [ ! -f "$SSH_KEY" ]; then
        print_error "SSH key not found: $SSH_KEY"
        return 1
    fi
    
    # Test connection
    print_info "Testing SSH connection..."
    if ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o BatchMode=yes $USER@$HOST exit 2>/dev/null; then
        print_success "SSH connection successful"
    else
        print_error "Cannot connect to server"
        print_info "Please ensure:"
        echo "  1. Server is accessible"
        echo "  2. SSH key is correct"
        echo "  3. User has access"
        read -p "Add anyway? (y/N): " FORCE
        if [[ ! $FORCE =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    
    # Add to servers file
    cat $SERVERS_FILE | python3 << EOF > $SERVERS_FILE.tmp
import sys, json
data = json.load(sys.stdin)
data['servers'].append({
    'name': '$NAME',
    'host': '$HOST',
    'user': '$USER',
    'region': '$REGION',
    'ssh_key': '$SSH_KEY',
    'active': True
})
print(json.dumps(data, indent=2))
EOF
    
    mv $SERVERS_FILE.tmp $SERVERS_FILE
    print_success "Server '$NAME' added successfully"
}

# Function to remove a server
remove_server() {
    list_servers
    
    if [ $(cat $SERVERS_FILE | python3 -c "import sys, json; print(len(json.load(sys.stdin)['servers']))") -eq 0 ]; then
        return
    fi
    
    read -p "Enter server number to remove: " NUM
    
    cat $SERVERS_FILE | python3 << EOF > $SERVERS_FILE.tmp
import sys, json
data = json.load(sys.stdin)
try:
    idx = int('$NUM') - 1
    if 0 <= idx < len(data['servers']):
        removed = data['servers'].pop(idx)
        print(f"Removed: {removed['name']}", file=sys.stderr)
    else:
        print("Invalid server number", file=sys.stderr)
        sys.exit(1)
except:
    print("Invalid input", file=sys.stderr)
    sys.exit(1)
print(json.dumps(data, indent=2))
EOF
    
    if [ $? -eq 0 ]; then
        mv $SERVERS_FILE.tmp $SERVERS_FILE
        print_success "Server removed"
    else
        rm -f $SERVERS_FILE.tmp
        print_error "Failed to remove server"
    fi
}

# Function to test server connection
test_server() {
    list_servers
    
    if [ $(cat $SERVERS_FILE | python3 -c "import sys, json; print(len(json.load(sys.stdin)['servers']))") -eq 0 ]; then
        return
    fi
    
    read -p "Enter server number to test: " NUM
    
    SERVER_INFO=$(cat $SERVERS_FILE | python3 << EOF
import sys, json
data = json.load(sys.stdin)
try:
    idx = int('$NUM') - 1
    if 0 <= idx < len(data['servers']):
        server = data['servers'][idx]
        print(f"{server['host']} {server['user']} {server['ssh_key']}")
    else:
        sys.exit(1)
except:
    sys.exit(1)
EOF
)
    
    if [ $? -ne 0 ]; then
        print_error "Invalid server number"
        return 1
    fi
    
    read HOST USER SSH_KEY <<< "$SERVER_INFO"
    
    echo ""
    print_info "Testing connection to $HOST..."
    
    # Test SSH
    if ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o BatchMode=yes $USER@$HOST exit 2>/dev/null; then
        print_success "SSH connection successful"
    else
        print_error "SSH connection failed"
        return 1
    fi
    
    # Get server info
    print_info "Retrieving server information..."
    ssh -i "$SSH_KEY" $USER@$HOST << 'REMOTE_EOF'
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '"')"
echo "Uptime: $(uptime -p)"
echo "Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
echo "PM2: $(pm2 --version 2>/dev/null || echo 'Not installed')"
echo "Nginx: $(nginx -v 2>&1 | cut -d/ -f2 || echo 'Not installed')"
REMOTE_EOF
    
    print_success "Server test completed"
}

# Function to setup a server
setup_server() {
    list_servers
    
    if [ $(cat $SERVERS_FILE | python3 -c "import sys, json; print(len(json.load(sys.stdin)['servers']))") -eq 0 ]; then
        return
    fi
    
    read -p "Enter server number to setup: " NUM
    
    SERVER_INFO=$(cat $SERVERS_FILE | python3 << EOF
import sys, json
data = json.load(sys.stdin)
try:
    idx = int('$NUM') - 1
    if 0 <= idx < len(data['servers']):
        server = data['servers'][idx]
        print(f"{server['host']} {server['user']} {server['ssh_key']}")
    else:
        sys.exit(1)
except:
    sys.exit(1)
EOF
)
    
    if [ $? -ne 0 ]; then
        print_error "Invalid server number"
        return 1
    fi
    
    read HOST USER SSH_KEY <<< "$SERVER_INFO"
    
    print_info "Setting up server: $HOST"
    
    # Copy setup script to server
    SETUP_SCRIPT="/home/ubuntu/manus-cicd/scripts/setup-server.sh"
    
    if [ ! -f "$SETUP_SCRIPT" ]; then
        print_error "Setup script not found: $SETUP_SCRIPT"
        return 1
    fi
    
    print_info "Uploading setup script..."
    scp -i "$SSH_KEY" $SETUP_SCRIPT $USER@$HOST:/tmp/setup-server.sh
    
    print_info "Running setup script on server..."
    ssh -i "$SSH_KEY" $USER@$HOST "sudo bash /tmp/setup-server.sh && rm /tmp/setup-server.sh"
    
    print_success "Server setup completed"
}

# Main menu
case "${1:-}" in
    list|ls)
        list_servers
        ;;
    add)
        add_server
        ;;
    remove|rm)
        remove_server
        ;;
    test)
        test_server
        ;;
    setup)
        setup_server
        ;;
    *)
        echo "Manus CI/CD Server Management"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  list, ls     List all registered servers"
        echo "  add          Add a new server"
        echo "  remove, rm   Remove a server"
        echo "  test         Test server connection"
        echo "  setup        Setup a server for deployment"
        echo ""
        ;;
esac
