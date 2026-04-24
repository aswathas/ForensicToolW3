# EVM Forensics Demo Guide

## Quick Start

Run the complete demo pipeline in one command:

```bash
npm run demo
```

This will:
1. Execute a blockchain simulation (5 users, 5 txs each, reentrancy attack)
2. Run the forensics analysis engine
3. Start the Express backend API (port 3001)
4. Start the React frontend dev server (port 3000)
5. Open your browser to http://localhost:3000/dashboard

## Manual Steps

If you want to run steps individually:

```bash
# Step 1: Run simulation
npm run sim:quick

# Step 2: Start backend (separate terminal)
cd backend && npm run dev

# Step 3: Start frontend (another terminal)
cd frontend && npm run dev

# Step 4: Navigate to http://localhost:3000
```

## Using the Demo

1. **Landing Page** - Overview of the tool
2. **Dashboard** - Lists all forensic runs
3. **Investigation** - Click a run to see the three-panel investigation interface:
   - **Left**: Transaction timeline (click to select)
   - **Center**: Fund flow visualization
   - **Right**: Evidence panel with signals
4. **Copilot Chat** - Ask questions about the attack (requires Ollama running)
5. **Signals Catalog** - View all 28 detection rules
6. **Report Builder** - Export findings as PDF/JSON

## Requirements

- Node.js 18+
- npm
- (Optional) Ollama for AI copilot: `ollama serve` in a separate terminal

## Troubleshooting

- **Backend fails to start**: Check that port 3001 is not in use
- **Frontend fails to start**: Check that port 3000 is not in use
- **Chat not working**: Ensure Ollama is running on http://127.0.0.1:11434
- **No runs found**: Run `npm run sim:quick` first to generate data
