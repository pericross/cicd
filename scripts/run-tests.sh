#!/bin/bash
# Pre-deployment Testing Script for Manus Projects
# Runs comprehensive tests before deployment

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

FAILED_TESTS=0

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "No package.json found"
    exit 1
fi

echo ""
echo "=========================================="
echo "  Manus Project Testing Suite"
echo "=========================================="
echo ""

# 1. Dependency Check
print_info "Checking dependencies..."
if pnpm install --frozen-lockfile; then
    print_success "Dependencies installed"
else
    print_error "Dependency installation failed"
    exit 1
fi

# 2. Linting
print_info "Running linting..."
if pnpm run lint 2>/dev/null; then
    print_success "Linting passed"
elif [ $? -eq 127 ]; then
    print_warning "No lint script found, skipping"
else
    print_error "Linting failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 3. Type Checking
print_info "Running type checking..."
if pnpm run type-check 2>/dev/null; then
    print_success "Type checking passed"
elif [ $? -eq 127 ]; then
    print_warning "No type-check script found, skipping"
else
    print_error "Type checking failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 4. Unit Tests
print_info "Running unit tests..."
if pnpm run test 2>/dev/null; then
    print_success "Unit tests passed"
elif [ $? -eq 127 ]; then
    print_warning "No test script found, skipping"
else
    print_error "Unit tests failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 5. Build Test
print_info "Testing build..."
if pnpm run build; then
    print_success "Build successful"
else
    print_error "Build failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 6. Security Audit
print_info "Running security audit..."
if pnpm audit --audit-level=high 2>/dev/null; then
    print_success "Security audit passed"
else
    print_warning "Security vulnerabilities found (check with: pnpm audit)"
fi

# 7. Bundle Size Check
print_info "Checking bundle size..."
if [ -d "dist" ] || [ -d ".next" ]; then
    BUILD_DIR=$([ -d "dist" ] && echo "dist" || echo ".next")
    TOTAL_SIZE=$(du -sh $BUILD_DIR | cut -f1)
    print_info "Build size: $TOTAL_SIZE"
    
    # Check if size is reasonable (< 50MB)
    SIZE_BYTES=$(du -sb $BUILD_DIR | cut -f1)
    MAX_SIZE=$((50 * 1024 * 1024))  # 50MB
    
    if [ $SIZE_BYTES -lt $MAX_SIZE ]; then
        print_success "Bundle size is acceptable"
    else
        print_warning "Bundle size is large (> 50MB)"
    fi
fi

# 8. Environment Variables Check
print_info "Checking environment variables..."
if [ -f ".env.example" ]; then
    print_success "Environment template found"
    
    # Check if all required vars are documented
    if [ -f ".env" ]; then
        print_success "Environment file exists"
    else
        print_warning "No .env file found (using defaults)"
    fi
else
    print_warning "No .env.example found"
fi

# Summary
echo ""
echo "=========================================="
if [ $FAILED_TESTS -eq 0 ]; then
    print_success "All tests passed!"
    echo "=========================================="
    echo ""
    print_info "Project is ready for deployment"
    exit 0
else
    print_error "$FAILED_TESTS test(s) failed"
    echo "=========================================="
    echo ""
    print_error "Please fix the issues before deploying"
    exit 1
fi
