#!/bin/bash

# EVM Forensics UI - Push to GitHub
# Run this after all 10 tasks complete

set -e

echo "🚀 Pushing EVM Forensics UI to GitHub"
echo ""

# Check git status
echo "Checking git status..."
git status

echo ""
echo "Staging all changes..."
git add frontend/ backend/ scripts/ docs/

echo ""
echo "Creating final commit..."
git commit -m "feat: complete forensics UI implementation - all 10 tasks finished

- Task 1: Project setup (frontend + backend scaffold, npm install, configs)
- Task 2: Frontend types & API client (ForensicRun, Transaction, Signal, Entity, FundFlow interfaces, Axios client)
- Task 3: Backend API server (Express endpoints, forensics service, Ollama integration)
- Task 4: Layout components (Navbar, Sidebar, Footer, Layout, Button, Card)
- Task 5: Investigation dashboard (3-panel layout with timeline, fund-flow graph, evidence panel)
- Task 6: AI chat copilot (Chat component with Ollama integration)
- Task 7: Additional pages (Landing, Dashboard, Signals Catalog, Entity Profile, Report Builder)
- Task 8: Demo orchestration (run-demo.sh for full pipeline automation)
- Task 9: Testing & validation (checklist, test script, demo notes)
- Task 10: Final integration (globals.css, README, BUILD_STATUS)

Ready for investor/professor demo:
  npm run demo  # One-command pipeline: simulation → forensics → backend → frontend UI

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>" || true

echo ""
echo "✅ Commit created"
echo ""

# Get remote info
REMOTE=$(git remote get-url origin 2>/dev/null || echo "not configured")
echo "Remote: $REMOTE"
echo ""

if [ "$REMOTE" = "not configured" ]; then
  echo "⚠️  No git remote configured yet."
  echo ""
  echo "To push to GitHub, first set up a remote:"
  echo ""
  echo "  Option 1 - New repo:"
  echo "    gh repo create ForensicToolW3 --public --source=. --remote=origin --push"
  echo ""
  echo "  Option 2 - Existing repo:"
  echo "    git remote add origin https://github.com/YOUR_USERNAME/ForensicToolW3.git"
  echo "    git branch -M main"
  echo "    git push -u origin main"
  echo ""
  exit 0
fi

echo "Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Push complete!"
echo ""
git log --oneline -5
