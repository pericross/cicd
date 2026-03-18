#!/bin/bash
# Health Check Script for Deployed Manus Projects
# Validates that a deployment is working correctly

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
if [ $# -lt 1 ]; then
    print_error "Usage: $0 <url> [expected-status-code]"
    echo ""
    echo "Examples:"
    echo "  $0 https://example.com"
    echo "  $0 https://api.example.com/health 200"
    exit 1
fi

URL=$1
EXPECTED_STATUS=${2:-200}
TIMEOUT=10

echo ""
echo "=========================================="
echo "  Deployment Health Check"
echo "=========================================="
echo ""
print_info "Target: $URL"
print_info "Expected Status: $EXPECTED_STATUS"
echo ""

# 1. DNS Resolution
print_info "Checking DNS resolution..."
DOMAIN=$(echo $URL | sed -e 's|^[^/]*//||' -e 's|/.*$||')
if host $DOMAIN > /dev/null 2>&1; then
    IP=$(host $DOMAIN | grep "has address" | head -1 | awk '{print $4}')
    print_success "DNS resolved: $DOMAIN -> $IP"
else
    print_error "DNS resolution failed for $DOMAIN"
    exit 1
fi

# 2. HTTP Status Check
print_info "Checking HTTP status..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT $URL)

if [ "$HTTP_STATUS" = "$EXPECTED_STATUS" ]; then
    print_success "HTTP status: $HTTP_STATUS (expected: $EXPECTED_STATUS)"
else
    print_error "HTTP status: $HTTP_STATUS (expected: $EXPECTED_STATUS)"
    exit 1
fi

# 3. Response Time Check
print_info "Checking response time..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time $TIMEOUT $URL)
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc)

print_info "Response time: ${RESPONSE_MS}ms"

if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
    print_success "Response time is good (< 2s)"
elif (( $(echo "$RESPONSE_TIME < 5.0" | bc -l) )); then
    print_warning "Response time is acceptable (< 5s)"
else
    print_warning "Response time is slow (> 5s)"
fi

# 4. SSL Certificate Check (if HTTPS)
if [[ $URL == https://* ]]; then
    print_info "Checking SSL certificate..."
    
    SSL_EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    
    if [ -n "$SSL_EXPIRY" ]; then
        EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s)
        CURRENT_EPOCH=$(date +%s)
        DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))
        
        if [ $DAYS_UNTIL_EXPIRY -gt 30 ]; then
            print_success "SSL certificate valid (expires in $DAYS_UNTIL_EXPIRY days)"
        elif [ $DAYS_UNTIL_EXPIRY -gt 0 ]; then
            print_warning "SSL certificate expires soon ($DAYS_UNTIL_EXPIRY days)"
        else
            print_error "SSL certificate has expired"
            exit 1
        fi
    else
        print_warning "Could not check SSL certificate"
    fi
fi

# 5. Content Check
print_info "Checking content delivery..."
CONTENT_LENGTH=$(curl -s -w "%{size_download}" -o /dev/null --max-time $TIMEOUT $URL)

if [ $CONTENT_LENGTH -gt 0 ]; then
    print_success "Content delivered: $CONTENT_LENGTH bytes"
else
    print_error "No content delivered"
    exit 1
fi

# 6. Security Headers Check
print_info "Checking security headers..."
HEADERS=$(curl -s -I --max-time $TIMEOUT $URL)

check_header() {
    HEADER_NAME=$1
    if echo "$HEADERS" | grep -qi "$HEADER_NAME"; then
        print_success "$HEADER_NAME header present"
        return 0
    else
        print_warning "$HEADER_NAME header missing"
        return 1
    fi
}

check_header "X-Content-Type-Options"
check_header "X-Frame-Options"
check_header "Content-Security-Policy" || print_info "  (CSP is optional but recommended)"

# 7. Compression Check
print_info "Checking compression..."
if echo "$HEADERS" | grep -qi "Content-Encoding: gzip"; then
    print_success "Gzip compression enabled"
elif echo "$HEADERS" | grep -qi "Content-Encoding: br"; then
    print_success "Brotli compression enabled"
else
    print_warning "No compression detected"
fi

# Summary
echo ""
echo "=========================================="
print_success "Health check completed"
echo "=========================================="
echo ""
print_info "Summary:"
echo "  URL: $URL"
echo "  Status: $HTTP_STATUS"
echo "  Response Time: ${RESPONSE_MS}ms"
echo "  Content Size: $CONTENT_LENGTH bytes"
echo ""
print_success "Deployment is healthy and operational"
echo ""
