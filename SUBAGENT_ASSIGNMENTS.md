# Subagent Task Assignments

**Team**: forensics-ui-build  
**Dispatch Date**: 2026-04-24  
**Execution Model**: Parallel with task dependencies

## Agent Assignments & Expected Outputs

### Agent 1: task-1-setup
**Task**: Project Setup & Dependencies  
**Status**: in_progress  
**Blocks**: Tasks 2, 3, 4, 5  
**Working Directory**: `/mnt/c/Users/aswat/ForensicToolW3`

**Creates**:
- `frontend/` with npm project, React, TypeScript, Tailwind, Vite
- `backend/` with npm project, Express, TypeScript, ts-node
- `frontend/tsconfig.json` with React JSX support
- `backend/tsconfig.json` with CommonJS target
- `frontend/tailwind.config.js` with dark mode theme
- `frontend/vite.config.ts` for dev server (:3000)
- `frontend/package.json` with dev/build/type-check scripts
- `backend/package.json` with dev/build/start scripts
- `frontend/public/index.html` with React mount point
- `frontend/src/index.tsx` as entry point
- `frontend/src/App.tsx` as root component
- `backend/.env.example` with PORT, OLLAMA_URL, RUNS_DIR

**Success Indicators**:
- Both `frontend/node_modules/` and `backend/node_modules/` exist
- `npm run type-check` runs without errors in both directories
- Package.json scripts are correctly configured

---

### Agent 2: task-2-types
**Task**: Frontend Types & API Client  
**Status**: pending (blocked by Task 1)  
**Blocks**: Tasks 5, 6  
**Working Directory**: `/mnt/c/Users/aswat/ForensicToolW3/frontend`

**Creates**:
- `frontend/src/types/forensics.ts` with interfaces:
  - ForensicRun (runId, status, confidence, metadata with stolen amount/asset/attacker)
  - Transaction (hash, from, to, value, status, isAnomaly, anomalyScore)
  - Signal (id, name, category, severity, confidence, description, affectedTransactions)
  - Entity (address, type, role, riskScore, transactionCount)
  - FundFlow (fromEntity, toEntity, amount, asset, timestamp, isAnomaly)
  - ForensicBundle (runId, transactions[], signals[], entities[], fundFlows[], coverage)

- `frontend/src/types/api.ts` with interfaces:
  - ApiResponse<T> with success, data, error, timestamp
  - ChatMessage with role, content, timestamp
  - ChatResponse with messages and context
  - ExportRequest with runId, format, includeGraphs, includeRawData
  - ExportResponse with url, filename, size

- `frontend/src/utils/api.ts`:
  - ForensicsAPI class using axios
  - Methods: getForensicRun(), listRuns(), sendChatMessage(), exportReport()
  - Singleton export as `api`

- `frontend/src/hooks/useForensicData.ts`:
  - Hook: useForensicData(runId)
  - Returns: { data, loading, error }
  - Auto-fetches on runId change

**Success Indicators**:
- All files created with correct TypeScript syntax
- No compile errors in `npm run type-check`
- API client methods match backend routes

---

### Agent 3: task-3-backend
**Task**: Backend API Server  
**Status**: completed ✅  
**Blocks**: Tasks 6, 8  
**Working Directory**: `/mnt/c/Users/aswat/ForensicToolW3/backend`

**Creates**:
- `backend/src/index.ts`:
  - Express app with CORS, express.json()
  - Routes: /api/forensics, /api/chat
  - Health check: GET /health
  - Error handler middleware
  - Listens on PORT (default 3001)

- `backend/src/services/forensicsService.ts`:
  - loadForensicBundle(runId) - reads from runs/runId/forensic_bundle/
  - Returns report + signals data
  - Handles missing data gracefully

- `backend/src/services/ollamaService.ts`:
  - chat(messages[], context) - calls Ollama API
  - Model: phi3:mini
  - Endpoint: OLLAMA_URL/api/generate

- `backend/src/api/routes/forensics.ts`:
  - GET /runs - returns list of run IDs
  - GET /:runId - returns full forensic bundle

- `backend/src/api/routes/ollama.ts`:
  - POST / - accepts { runId, message, context }
  - Returns ChatResponse with messages[] and context

- `backend/.env.example` - template for .env

**Success Indicators**:
- `npm run dev` starts without errors
- `curl http://localhost:3001/health` returns { status: 'ok' }
- `curl http://localhost:3001/api/forensics/runs` returns JSON array

---

### Agent 4: task-4-layout
**Task**: Layout Components  
**Status**: completed ✅  
**Blocks**: Tasks 5, 7  
**Working Directory**: `/mnt/c/Users/aswat/ForensicToolW3/frontend`

**Creates**:
- `frontend/src/components/Layout/Navbar.tsx`:
  - Shows logo "🔍 Forensics"
  - Links to /, /dashboard, /investigation, /signals
  - Uses bg-bg-primary, borders with bg-tertiary
  - Hovers to accent-primary

- `frontend/src/components/Layout/Sidebar.tsx`:
  - Links to all 6 pages
  - Active link highlighted with accent-primary
  - Width: w-64, background: bg-secondary

- `frontend/src/components/Layout/Footer.tsx`:
  - Copyright text, centered
  - Uses text-muted color

- `frontend/src/components/Layout/Layout.tsx`:
  - Wrapper component with Navbar + Sidebar + main + Footer
  - showSidebar prop (optional)
  - Full height flex layout

- `frontend/src/components/Common/Button.tsx`:
  - Variants: primary (blue), secondary (gray), danger (red)
  - Sizes: sm, md, lg
  - Disabled state with opacity-50
  - Props: children, variant, size, onClick, disabled

- `frontend/src/components/Common/Card.tsx`:
  - bg-bg-secondary with border border-bg-tertiary
  - Rounded corners, padding 6
  - Takes children and optional className

**Success Indicators**:
- All components export correctly
- Tailwind classes resolve without errors
- Components compose together (Layout wraps cards, buttons work)

---

### Agent 5: task-5-investigation
**Task**: Investigation Dashboard (3-Panel)  
**Status**: completed ✅  
**Blocks**: Tasks 7, 9  
**Working Directory**: `/mnt/c/Users/aswat/ForensicToolW3/frontend`

**Creates**:
- `frontend/src/components/Investigation/AttackSummary.tsx`:
  - 4-column grid: Verdict, Attacker, Stolen, Confidence
  - Color-coded values (success green, danger red, primary blue)
  - Takes ForensicRun prop

- `frontend/src/components/Investigation/TransactionTimeline.tsx`:
  - Left panel: scrollable transaction list
  - Filters: All / Suspicious toggle
  - Each tx shows: hash, from/to, block, timestamp
  - Selected tx has ring-2 ring-accent-primary
  - onSelectTransaction callback
  - Anomaly indicator (red dot)

- `frontend/src/components/Investigation/FundFlowGraph.tsx`:
  - Center panel: SVG placeholder for D3.js Sankey
  - Shows top senders and amounts
  - Proper labels and styling for future D3 integration

- `frontend/src/components/Investigation/EvidencePanel.tsx`:
  - Right panel: selected transaction details
  - Shows: from, to, value
  - "Firing Signals" section with signal name + description
  - Shows 3 top related signals

- `frontend/src/pages/Investigation.tsx`:
  - Main page with 3-column grid layout
  - AttackSummary header
  - Three panels arranged grid-cols-3
  - Uses useForensicData hook to fetch runId data
  - Manages selectedTx state
  - Passes data to components

**Success Indicators**:
- Page loads at /investigation/:runId
- Clicking a transaction updates evidence panel
- All components render without errors
- Data flows from API → hook → components

---

### Agent 6: task-6-copilot
**Task**: AI Chat Copilot  
**Status**: in_progress  
**Blocks**: Task 9  
**Working Directory**: `/mnt/c/Users/aswat/ForensicToolW3/frontend`

**Creates**:
- `frontend/src/hooks/useAIChat.ts`:
  - Hook: useAIChat(runId)
  - State: messages[], loading, error
  - Method: sendMessage(content, context?)
  - Calls api.sendChatMessage()

- `frontend/src/components/Chat/Message.tsx`:
  - Displays single ChatMessage
  - User messages: right-aligned, accent-primary background
  - Assistant: left-aligned, bg-bg-tertiary
  - Shows timestamp

- `frontend/src/components/Chat/AIChat.tsx`:
  - Full chat interface
  - Message history scrollable area
  - Input field + Send button
  - Loading state ("Thinking...")
  - Error display
  - Props: runId, selectedTx?, selectedEntity?

- Updates to `frontend/src/pages/Investigation.tsx`:
  - Adds AIChat component below 3-panel grid
  - Passes current runId and selection context

**Success Indicators**:
- Chat component renders in Investigation page
- Input accepts text
- Send button calls useAIChat hook
- Messages display correctly
- (Ollama integration works if server running)

---

### Agent 7: task-7-pages
**Task**: Additional Pages  
**Status**: in_progress  
**Blocks**: Task 9  
**Working Directory**: `/mnt/c/Users/aswat/ForensicToolW3/frontend`

**Creates**:
- `frontend/src/pages/Landing.tsx`:
  - Hero layout with centered content
  - Title, description, CTA buttons
  - Feature grid (28 Heuristics, Evidence-First, AI Copilot)

- `frontend/src/pages/Dashboard.tsx`:
  - Calls api.listRuns()
  - Shows list of runs as cards
  - Each card has "Investigate" button linking to /investigation/:runId
  - Loading state + empty state message

- `frontend/src/pages/SignalsCatalog.tsx`:
  - Lists 28 detection rules (hardcoded sample)
  - Grouped by category (reentrancy, approval, flashloan, oracle, admin, fundflow)
  - Each signal shows: name, description, severity badge (critical/high/medium)

- `frontend/src/pages/EntityProfile.tsx`:
  - Shows sample entity: address, type, role, risk score
  - Activity section: tx count, first/last seen dates

- `frontend/src/pages/ReportBuilder.tsx`:
  - Form: Report format (PDF/JSON radio)
  - Checkboxes: Include graphs, include raw data
  - Export button (calls api.exportReport())

- Updates to `frontend/src/App.tsx`:
  - Router setup with all 6 routes
  - Routes: /, /dashboard, /investigation/:runId, /signals, /entity-profile, /report
  - Wildcard fallback to /

**Success Indicators**:
- All 6 pages load without errors
- Navigation between pages works
- Links are correct (/investigation shows correct runId)
- Styling matches design system (dark mode, colors)

---

### Agent 8: task-8-demo
**Task**: Demo Orchestration Script  
**Status**: in_progress  
**Blocks**: Task 9  
**Working Directory**: `/mnt/c/Users/aswat/ForensicToolW3`

**Creates**:
- `scripts/run-demo.sh`:
  - Step 1: Run `npm run sim:quick` (or `npm run sim`)
  - Step 2: Wait for simulation to complete
  - Step 3: Start backend: `cd backend && npm run dev` (background)
  - Step 4: Wait for /health endpoint
  - Step 5: Start frontend: `cd frontend && npm run dev` (background)
  - Step 6: Open browser to http://localhost:3000/dashboard
  - Cleanup: Kill both processes on Ctrl+C

- `frontend/.env`:
  - VITE_API_URL=http://localhost:3001

- `backend/.env`:
  - PORT=3001
  - OLLAMA_URL=http://127.0.0.1:11434
  - RUNS_DIR=../runs

- `DEMO_GUIDE.md`:
  - Quick start: `npm run demo`
  - What happens (5 steps)
  - Manual steps if running separately
  - Requirements (Node 18+, npm, optional Ollama)
  - Troubleshooting

- Root `package.json` updates:
  - Script: `"demo": "bash scripts/run-demo.sh"`

**Success Indicators**:
- `npm run demo` runs without errors
- Simulation completes
- Backend starts on :3001
- Frontend starts on :3000
- Browser opens to dashboard
- Both processes clean up on Ctrl+C

---

### Agent 9: task-9-testing
**Task**: Testing & Demo Validation  
**Status**: in_progress  
**Blocks**: Task 10  
**Working Directory**: `/mnt/c/Users/aswat/ForensicToolW3`

**Creates**:
- `TESTING_CHECKLIST.md`:
  - Setup: dependencies, .env, TypeScript
  - Frontend tests: 11 scenarios (pages, navigation, panels, chat)
  - Backend tests: 5 scenarios (server, endpoints, CORS)
  - Integration tests: full pipeline
  - Demo narrative: step-by-step walkthrough
  - Performance targets

- `DEMO_NOTES.md`:
  - For investors: compliance, evidence-linking, scalability
  - For professors: workflow, signals, architecture
  - Key pages to show
  - Time estimates (15-20 min full, 5-10 min highlight)
  - Talking points

- `scripts/test-demo.sh`:
  - Checks node/npm installed
  - Verifies frontend/backend node_modules
  - Runs `npm run type-check`
  - Checks for simulation runs
  - Reports setup status

**Success Indicators**:
- `bash scripts/test-demo.sh` completes without errors
- All checks pass (dependencies, TypeScript, runs exist)
- Testing checklist can be manually validated

---

### Agent 10: task-10-final
**Task**: Final Integration & Demo Ready  
**Status**: in_progress  
**Blocks**: (final task)  
**Working Directory**: `/mnt/c/Users/aswat/ForensicToolW3`

**Creates**:
- `frontend/src/styles/globals.css`:
  - Tailwind imports (@tailwind base/components/utilities)
  - Custom scrollbar styling
  - Code block styling
  - Focus state styling

- `frontend/src/index.tsx`:
  - React import
  - App import
  - globals.css import
  - ReactDOM.createRoot + render

- `frontend/public/index.html`:
  - DOCTYPE, meta tags
  - `<div id="root"></div>`
  - Script tag for /src/index.tsx

- `README.md`:
  - Quick start: `npm run demo`
  - Architecture overview
  - Features list
  - Development commands
  - Documentation links
  - Tech stack

- `BUILD_STATUS.md`:
  - ✅ All 10 tasks listed as completed
  - Frontend deliverables: 6 pages, 10+ components, design system
  - Backend deliverables: Express API, forensic loading, Ollama integration
  - Demo ready: `npm run demo`
  - Next steps for production

**Success Indicators**:
- All files created with correct content
- App compiles and runs
- `npm run demo` works end-to-end
- All 10 tasks show completed in TaskList

---

## Task Dependency Graph

```
Task 1 (Setup)
├── Task 2 (Types) → Task 5 (Investigation) → Task 7 (Pages)
├── Task 3 (Backend API) → Task 6 (Chat) → Task 9 (Testing)
├── Task 4 (Layout) → Task 5 (Investigation)
└── Task 8 (Demo Script) → Task 9 (Testing)
    
Task 9 (Testing) → Task 10 (Final Integration)
```

## Troubleshooting Guide

If an agent fails, check:

1. **Task 1 (Setup) Failed**
   - Verify Node 18+ and npm installed: `node --version && npm --version`
   - Try manual setup: `cd frontend && npm install`
   - Check disk space (npm needs ~500MB)

2. **Task 2 (Types) Failed**
   - Check frontend/node_modules exists (requires Task 1 to complete first)
   - Verify file paths are correct
   - TypeScript should compile: `cd frontend && npm run type-check`

3. **Task 3 (Backend) Failed**
   - Similar to Task 1 - check npm/Node versions
   - Verify backend/node_modules created

4. **Task 4 (Layout) Failed**
   - Check Tailwind installed in frontend (Task 1 prerequisite)
   - Verify component syntax (React functional components)

5. **Task 5 (Investigation) Failed**
   - Requires Tasks 1, 2, 4 complete
   - Check D3 installed: `grep d3 frontend/package.json`

6. **Later Tasks Failed**
   - Check all dependencies satisfied
   - Review agent error output via `TaskGet <task_id>`
   - Retry individual agent if safe

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-24  
**Next Review**: After all tasks complete
