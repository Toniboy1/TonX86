#!/bin/bash
# Quick verification script to test that all packages build correctly

echo "🏗️  TonX86 Foundation Build Verification"
echo "========================================"
echo ""

cd "$(dirname "$0")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check node_modules
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules found"
else
    echo -e "${RED}✗${NC} node_modules not found - run 'npm install'"
    exit 1
fi

# Test 2: Build all packages
echo ""
echo "🔨 Building packages..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All packages compiled successfully"
else
    echo -e "${RED}✗${NC} Build failed"
    exit 1
fi

# Test 3: Check build outputs
echo ""
echo "✅ Checking build outputs..."

packages=(
    "packages/extension/out/extension.js"
    "packages/debug-adapter/out/debugAdapter.js"
    "packages/language-server/out/server.js"
    "packages/simcore/out/simulator.js"
)

all_exist=true
for pkg in "${packages[@]}"; do
    if [ -f "$pkg" ]; then
        echo -e "${GREEN}✓${NC} $pkg"
    else
        echo -e "${RED}✗${NC} $pkg not found"
        all_exist=false
    fi
done

echo ""
if [ "$all_exist" = true ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Foundation build verified!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Next steps:"
    echo "  • npm run watch   - Watch mode for development"
    echo "  • npm run lint    - Run code linter"
    echo "  • See README.md for usage instructions"
else
    echo -e "${RED}Build verification failed${NC}"
    exit 1
fi
