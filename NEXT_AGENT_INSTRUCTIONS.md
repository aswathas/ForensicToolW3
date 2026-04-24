# Instructions for Next Claude AI Agent

**Session Continuation Mode**: Previous session ran out of token context  
**Current Token Status**: ~91k remaining  
**Work Status**: 10-task implementation in progress with subagents

## What Happened Before

1. **Planning**: Comprehensive 10-task implementation plan created
2. **Brainstorming**: User confirmed need for minimalistic multi-page UI for investor/professor demo
3. **Design System**: Dark mode Tailwind CSS design finalized
4. **Team Setup**: Created team "forensics-ui-build" with task tracking
5. **Agent Dispatch**: Deployed 10 parallel subagents to execute tasks

## Current Task Status (as of context handoff)

✅ **Completed**:
- Task 3: Backend API Server
- Task 4: Layout Components
- Task 5: Investigation Dashboard (3-Panel)

🔄 **In Progress**:
- Task 1: Project Setup & Dependencies
- Task 6: AI Chat Copilot
- Task 7: Additional Pages
- Task 8: Demo Orchestration Script
- Task 9: Testing & Demo Validation
- Task 10: Final Integration & Demo Ready

⏳ **Pending** (waiting for dependencies):
- Task 2: Frontend Types & API Client

## Your Immediate Actions

### Step 1: Monitor Subagent Completion (5 min)
```bash
# Check task list
TaskList  # view status of all 10 tasks

# Look for completed tasks with results
```

### Step 2: Verify Completed Tasks (10 min)
If Tasks 3, 4, 5 show completed, verify files exist:
```bash
# Backend files (Task 3)
ls -la backend/src/index.ts
ls -la backend/src/services/

# Layout components (Task 4)
ls -la frontend/src/components/Layout/

# Investigation dashboard (Task 5)
ls -la frontend/src/pages/Investigation.tsx
```

### Step 3: Check In-Progress Tasks (10 min)
For tasks showing "in_progress" or "completed", review agent output:
```bash
TaskGet <task_id>  # get detailed task info
```

Focus on:
- Did Task 1 complete? (blocking Tasks 2-5)
- Did Task 2 complete? (blocking Task 6)
- Did Tasks 6-8 complete? (blocking Task 9)

### Step 4: Installation & Validation (15 min)

If all tasks complete, validate the build:

```bash
# Install dependencies if not done
cd frontend && npm install && npm run type-check
cd ../backend && npm install && npm run type-check
cd ..

# Quick validation
bash scripts/test-demo.sh

# If test passes, try the full demo
npm run demo
```

### Step 5: Document Results (5 min)

Update this file with completion status:
```bash
# If all tasks succeeded
echo "✅ All 10 tasks completed successfully - ready for demo" >> BUILD_PROGRESS.md

# If any tasks failed
echo "❌ Tasks X, Y failed - need debugging" >> BUILD_PROGRESS.md
```

## If Subagents Are Still Running

1. **Do NOT kill them** - let them finish naturally
2. **Wait patiently** - Task 1 takes ~3-5 min, tasks 2-10 depend on it
3. **Check back in 5 minutes** - Most tasks should be done by then
4. **If stuck for >15 min**: Check agent error logs via TaskGet

## If You Hit Errors

### "npm install failed"
- Check Node.js version: `node --version` (needs 18+)
- Check npm version: `npm --version`
- Delete `node_modules/` and try again

### "TypeScript compilation errors"
- Likely missing dependencies - re-run `npm install`
- Check tsconfig.json syntax

### "Backend/Frontend won't start"
- Check ports: `lsof -i :3000` and `lsof -i :3001`
- Kill conflicting processes if needed

### "Demo runs but no data appears"
- Check if simulation ran: `ls -la runs/`
- Check backend can load: `curl http://localhost:3001/api/forensics/runs`
- Check frontend console for API errors

## Key Files to Understand

**Implementation Plan** (detailed task specs):
```
docs/superpowers/plans/2024-04-24-forensics-ui-implementation.md
```

**Progress Tracking**:
```
BUILD_PROGRESS.md (updated by this agent - progress summary)
NEXT_AGENT_INSTRUCTIONS.md (this file - handoff notes)
```

**Team & Tasks**:
```
~/.claude/teams/forensics-ui-build/config.json (team members)
~/.claude/tasks/forensics-ui-build/ (task list with status)
```

## Architecture Overview

```
Simulation (npm run sim:quick)
    ↓
Forensics Engine (runs forensics analysis)
    ↓
JSON Output (in runs/run_*/forensic_bundle/)
    ↓
Backend API (port 3001: GET /api/forensics/:runId, POST /api/chat)
    ↓
React Frontend (port 3000: Investigation page with 3 panels)
    ↓
Optional: Ollama AI Copilot (if ollama serve running)
```

## Design System (Tailwind Dark Mode)

Colors used throughout:
- `bg-primary` (#0F172A) - Main background
- `bg-secondary` (#1E293B) - Cards, modals
- `text-primary` (#F1F5F9) - Main text
- `accent-primary` (#3B82F6) - Buttons, highlights
- `accent-danger` (#EF4444) - Alerts, critical

All components built with these colors via Tailwind utilities.

## The 6-Page App

1. **Landing** (`/`) - Hero page with features
2. **Dashboard** (`/dashboard`) - List of forensic runs
3. **Investigation** (`/investigation/:runId`) - Hero page: 3-panel dashboard
   - Left: Transaction timeline
   - Center: Fund flow visualization
   - Right: Evidence panel with signals
4. **Signals Catalog** (`/signals`) - All 28 detection rules
5. **Entity Profile** (`/entity-profile`) - Address/contract details
6. **Report Builder** (`/report`) - PDF/JSON export

## Success Checklist

- [ ] All 10 tasks show "completed" status
- [ ] `npm install` succeeds in both frontend/ and backend/
- [ ] `npm run type-check` passes
- [ ] `npm run demo` runs without errors
- [ ] Frontend loads at http://localhost:3000
- [ ] Dashboard shows forensic runs list
- [ ] Investigation page loads with 3 panels
- [ ] Chat interface appears (Ollama optional)
- [ ] All navigation links work

## When Complete

Once all tasks verify:

1. **Commit to git** (if not already done by agents):
   ```bash
   git add frontend/ backend/ scripts/
   git commit -m "feat: complete forensics UI implementation - 10 tasks done"
   ```

2. **Demo is ready**:
   ```bash
   npm run demo
   # Shows: simulation → forensics → API → UI
   # Perfect for investor/professor presentation
   ```

3. **Next steps** (if user wants):
   - Install Ollama for AI copilot
   - Run `/graphify` for knowledge graph
   - Deploy frontend/backend to cloud
   - Add authentication (JWT)
   - Add database persistence

## Handoff Notes

**Token Context**: This is a heavy implementation - you have ~91k tokens remaining. Use efficiently:
- TaskList/TaskGet for status checks (minimal tokens)
- Bash for quick validation (minimal tokens)
- Only use Agents if you need to fix failures
- Defer graphify setup to later session if needed

**User's Goal**: Demonstrate working forensics UI to investors/professors. Highest priority is **working demo** (simulation → forensics → UI interaction) with **visual polish** (dark mode, clean layout).

**What Works Well**: The implementation plan is complete and detailed. Most of the heavy design/architecture work is done. Just need to verify subagent output and test the pipeline.

---

**Last Updated**: 2026-04-24 (by AI agent before context limit)  
**Ready to Continue**: Yes - all setup done, just need verification & testing
