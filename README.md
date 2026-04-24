# EVM Forensics Investigation UI

Enterprise-grade blockchain forensics platform with interactive investigation dashboard.

## Quick Start

```bash
npm run demo
```

This runs the complete pipeline: simulation -> forensics -> backend API -> frontend.

## Architecture

- **Frontend**: React 19 + TypeScript + Tailwind CSS + Vite
- **Backend**: Express.js + Node.js + TypeScript
- **Data Source**: Forensic JSON outputs from simulation (`evidence_run_*/`)
- **AI**: Ollama integration for copilot chat

## Features

- Three-panel investigation interface
- 28 heuristic detection rules
- AI copilot powered by Ollama
- Fund flow visualization (D3.js)
- Evidence-linked findings
- PDF/JSON export

## Development

```bash
# Start backend (port 3001)
cd backend && npm run dev

# Start frontend (port 3000)
cd frontend && npm run dev

# Run tests
bash scripts/test-demo.sh
```

## Deployment

Frontend and backend can be deployed separately:

- Frontend: `npm run build` in `frontend/`
- Backend: `npm run build && npm start` in `backend/`

## Documentation

- [DEMO_GUIDE.md](./DEMO_GUIDE.md) - How to run the demo
- [DEMO_NOTES.md](./DEMO_NOTES.md) - Talking points for investors/professors
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) - Validation checklist
- [BUILD_STATUS.md](./BUILD_STATUS.md) - Build completion summary
- [CLAUDE.md](./CLAUDE.md) - Contributor / agent guide
- [DESIGN.md](./DESIGN.md) - Architecture design notes
- [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) - Ollama configuration
