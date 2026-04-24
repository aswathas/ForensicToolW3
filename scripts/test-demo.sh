#!/bin/bash

echo "Running demo validation tests"
echo ""

# Check setup
echo "Checking setup..."
if [ ! -d "frontend/node_modules" ]; then
  echo "[FAIL] Frontend dependencies not installed"
  echo "Run: cd frontend && npm install"
  exit 1
fi

if [ ! -d "backend/node_modules" ]; then
  echo "[FAIL] Backend dependencies not installed"
  echo "Run: cd backend && npm install"
  exit 1
fi

echo "[OK] Dependencies installed"
echo ""

# Check TypeScript
echo "Type checking..."
cd frontend
npm run type-check 2>/dev/null && echo "[OK] Frontend types OK" || echo "[WARN] Frontend type issues"
cd ../backend
npm run type-check 2>/dev/null && echo "[OK] Backend types OK" || echo "[WARN] Backend type issues"
cd ..
echo ""

# Check simulation exists
echo "Checking simulation runs..."
if [ -d "runs" ] && [ "$(ls -A runs)" ]; then
  RUN_COUNT=$(ls -d runs/run_* 2>/dev/null | wc -l)
  echo "[OK] Found $RUN_COUNT forensic runs"
else
  echo "[WARN] No forensic runs found"
  echo "Run simulation first: npm run sim:quick"
fi

echo ""
echo "Demo validation complete"
echo ""
echo "Next step: npm run demo"
