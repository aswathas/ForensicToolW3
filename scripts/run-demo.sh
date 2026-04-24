#!/bin/bash

set -e

echo "🚀 Starting EVM Forensics Demo Pipeline"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kill any existing processes on cleanup
cleanup() {
  echo -e "${YELLOW}Cleaning up...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  exit 0
}

trap cleanup EXIT INT TERM

# Step 1: Run simulation
echo -e "${YELLOW}Step 1: Running blockchain simulation...${NC}"
npm run sim:quick || npm run sim
echo -e "${GREEN}✓ Simulation complete${NC}"
echo ""

# Step 2: Get latest run directory
RUN_DIR=$(ls -td runs/run_* 2>/dev/null | head -1)
if [ -z "$RUN_DIR" ]; then
  echo -e "${RED}✗ No simulation runs found${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Using run: $RUN_DIR${NC}"
echo ""

# Step 3: Start backend API
echo -e "${YELLOW}Step 2: Starting backend API on port 3001...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in {1..10}; do
  if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✓ Backend ready${NC}"
    break
  fi
  sleep 1
done
echo ""

# Step 4: Start frontend dev server
echo -e "${YELLOW}Step 3: Starting frontend on port 3000...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Waiting for frontend to start..."
sleep 3

echo ""
echo -e "${GREEN}✓ Demo pipeline complete!${NC}"
echo ""
echo -e "${YELLOW}Opening dashboard...${NC}"
open "http://localhost:3000/dashboard" 2>/dev/null || xdg-open "http://localhost:3000/dashboard" 2>/dev/null || echo "Open http://localhost:3000/dashboard in your browser"

echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for child processes
wait
