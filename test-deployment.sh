#!/bin/bash
# Comprehensive test script for PDF Sign SDK deployment methods
# Tests Node.js server, bash script, and Docker deployment

set -e  # Exit on error

echo "═══════════════════════════════════════════════════"
echo "🧪 Testing PDF Sign SDK Deployment Methods"
echo "═══════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

test_url() {
    local url=$1
    local expected=$2
    local description=$3
    
    echo -n "Testing $description... "
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "$expected" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected HTTP $expected, got $response)"
        FAILED=$((FAILED + 1))
    fi
}

# Test 1: Node.js server
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Node.js Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PORT=9100 node server.js &
NODE_PID=$!
sleep 2

test_url "http://localhost:9100/example.html" "200" "example.html"
test_url "http://localhost:9100/pdf-sign-sdk.js" "200" "pdf-sign-sdk.js"
test_url "http://localhost:9100/dummy.pdf" "200" "dummy.pdf"
test_url "http://localhost:9100/nonexistent.html" "404" "404 for missing file"
test_url "http://localhost:9100/../../../etc/passwd" "404" "directory traversal protection"

kill $NODE_PID 2>/dev/null || true
sleep 1
echo ""

# Test 2: npm start
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: npm start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PORT=9101 npm start &
NPM_PID=$!
sleep 3

test_url "http://localhost:9101/example.html" "200" "example.html via npm"

kill $NPM_PID 2>/dev/null || true
sleep 1
echo ""

# Test 3: Docker (if available)
if command -v docker &> /dev/null; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test 3: Docker Container"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    docker build -t pdf-sign-sdk-test . > /dev/null 2>&1
    docker run -d -p 9102:8000 --name pdf-sign-sdk-test-run pdf-sign-sdk-test > /dev/null 2>&1
    sleep 5
    
    test_url "http://localhost:9102/example.html" "200" "Docker: example.html"
    test_url "http://localhost:9102/pdf-sign-sdk.js" "200" "Docker: pdf-sign-sdk.js"
    
    docker stop pdf-sign-sdk-test-run > /dev/null 2>&1
    docker rm pdf-sign-sdk-test-run > /dev/null 2>&1
    echo ""
else
    echo "Docker not available, skipping Docker tests"
    echo ""
fi

# Summary
echo "═══════════════════════════════════════════════════"
echo "📊 Test Summary"
echo "═══════════════════════════════════════════════════"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed!${NC}"
    exit 1
fi
