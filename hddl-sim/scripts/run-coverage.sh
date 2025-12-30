#!/usr/bin/env bash
# Run Playwright tests with coverage instrumentation and generate report

set -e

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
GRAY='\033[0;90m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

step() { echo -e "${CYAN}▶ $1${NC}"; }
success() { echo -e "${GREEN}✓ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; }
info() { echo -e "${GRAY}  $1${NC}"; }

cd "$(dirname "$0")/.."

echo -e "\n${YELLOW}=== HDDL Coverage Report Generator ===${NC}\n"

# Step 1: Clean old coverage data
step "Cleaning old coverage data..."
rm -rf .nyc_output coverage
success "Cleaned coverage directories"

# Step 2: Start dev server with coverage
step "Starting dev server with coverage instrumentation..."
export VITE_COVERAGE=true
npm run dev > /tmp/vite-server.log 2>&1 &
DEV_SERVER_PID=$!
info "Dev server PID: $DEV_SERVER_PID"

# Step 3: Wait for server to be ready
step "Waiting for dev server to be ready..."
for i in {1..30}; do
    if grep -q "ready in" /tmp/vite-server.log 2>/dev/null; then
        success "Dev server ready after ${i}s"
        grep "Local:" /tmp/vite-server.log | head -1
        break
    fi
    sleep 1
    if [ $i -eq 15 ]; then
        info "Still waiting... (${i}s elapsed)"
    fi
done

# Check if server started
if ! grep -q "ready in" /tmp/vite-server.log 2>/dev/null; then
    error "Dev server failed to start"
    cat /tmp/vite-server.log
    kill $DEV_SERVER_PID 2>/dev/null || true
    exit 1
fi

# Trap to ensure cleanup
cleanup() {
    step "Stopping dev server..."
    kill $DEV_SERVER_PID 2>/dev/null || true
    success "Dev server stopped"
}
trap cleanup EXIT

# Step 4: Run Playwright tests
step "Running Playwright tests with coverage..."
info "This will take 1-2 minutes..."

if npx playwright test --reporter=line | tee /tmp/test-output.log; then
    PASSED=$(grep -oP '\d+ passed' /tmp/test-output.log | grep -oP '\d+' || echo "0")
    success "$PASSED tests passed"
else
    info "Some tests may have failed (non-zero exit)"
fi

# Parse results
if grep -q "failed" /tmp/test-output.log; then
    FAILED=$(grep -oP '\d+ failed' /tmp/test-output.log | grep -oP '\d+' || echo "0")
    info "$FAILED tests failed"
fi

# Step 5: Check for coverage data
step "Checking coverage data..."
if [ ! -d .nyc_output ]; then
    error "No .nyc_output directory found!"
    info "Coverage instrumentation may not be working."
    exit 1
fi

COVERAGE_FILES=$(find .nyc_output -name "*.json" | wc -l)
if [ "$COVERAGE_FILES" -eq 0 ]; then
    error "No coverage files found in .nyc_output/"
    info "Tests ran but coverage was not collected."
    exit 1
fi

success "Found $COVERAGE_FILES coverage file(s)"

# Step 6: Generate coverage report
step "Generating coverage report..."
if npx nyc report --reporter=html --reporter=text; then
    success "Coverage report generated"
    
    echo -e "\n${YELLOW}--- Coverage Summary ---${NC}"
    npx nyc report --reporter=text | grep -A 5 "All files"
    
    # Step 7: Open report in browser
    step "Opening coverage report..."
    if command -v open > /dev/null; then
        open coverage/index.html
    elif command -v xdg-open > /dev/null; then
        xdg-open coverage/index.html
    else
        info "Report available at: coverage/index.html"
    fi
    
    echo -e "\n${GREEN}✓ Coverage report complete!${NC}\n"
else
    error "Failed to generate coverage report"
    exit 1
fi
