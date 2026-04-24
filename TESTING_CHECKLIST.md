# Testing Checklist

## Setup Verification

- [ ] Frontend npm dependencies installed (`cd frontend && npm install`)
- [ ] Backend npm dependencies installed (`cd backend && npm install`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] .env files created in backend directory
- [ ] Ollama running (if testing chat): `ollama serve`

## Frontend Tests

- [ ] Landing page loads (http://localhost:3000)
- [ ] Navigation between all 6 pages works
- [ ] Dashboard lists forensic runs correctly
- [ ] Investigation page loads with correct runId
- [ ] Three-panel layout renders (timeline, fund-flow, evidence)
- [ ] Transaction selection updates evidence panel
- [ ] Signals appear in evidence panel
- [ ] Chat input accepts text
- [ ] Signals catalog displays all rules
- [ ] Entity profile page loads
- [ ] Report builder form works

## Backend Tests

- [ ] Backend starts without errors (`npm run dev`)
- [ ] /health endpoint responds (curl http://localhost:3001/health)
- [ ] /api/forensics/runs returns list of runs
- [ ] /api/forensics/:runId returns forensic data
- [ ] /api/chat accepts POST with message
- [ ] CORS allows frontend requests
- [ ] Error handling returns proper JSON responses

## Integration Tests

- [ ] Run full demo: `npm run demo`
- [ ] Simulation completes and generates run directory
- [ ] Backend loads forensic data from runs/ directory
- [ ] Frontend successfully fetches data from API
- [ ] Chat integration works (if Ollama available)
- [ ] No console errors in browser dev tools
- [ ] No console errors in backend logs

## Demo Narrative

Follow this sequence to validate the demo works:

1. **Start**: `npm run demo`
2. **Navigate**: Go to Dashboard
3. **Select Run**: Click latest run to investigate
4. **Select Tx**: Click a transaction in timeline
5. **View Evidence**: Check evidence panel updates
6. **Ask Question**: Type "What happened in this attack?" in chat
7. **Generate Report**: Navigate to Report Builder, click Export
8. **Check Results**: Verify exported file

## Performance Targets

- Page load: < 2s
- Data fetch: < 1s
- Chat response: < 3s (Ollama)
- Three-panel interaction: smooth (60fps)

## Bug Documentation

If any issues found, document:
- What page/component failed
- Expected vs actual behavior
- Steps to reproduce
- Error messages from console
