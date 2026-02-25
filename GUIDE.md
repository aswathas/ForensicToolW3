# EVM Forensics Automation Guide

This guide explains how to use the single-command automation script to run simulations and perform forensic analysis.

## 1. Configure the Simulation

Open `sim.config.js` in the root directory. This is the **only file you need to edit**.

You can curb usage here:
- `numUsers`: Number of innocent users (e.g., 10 or 50)
- `txsPerUser`: Total activity per user (e.g., 5 sets = ~10 txs each)
- `numAttacks`: How many of the 5 attack types to run
- `attacks`: Enable/disable specific attack types (e.g., turn off flashloans)

Example config for ~100 transactions:
```javascript
export default {
    numUsers: 10,
    txsPerUser: 5,   // 10 users × 5 sets × 2 txs = 100 user txs
    numAttacks: 5,   // plus 5 attack txs
    // ...
}
```

## 2. Run the Automation

Run the master command:
```bash
npm run go
```

This single command will:
1.  **Run Simulation**: Spin up a local Anvil blockchain, execute user activity and attacks.
2.  **Run Forensics**: Import the raw blockchain data, detect signals, extract ML features, and generate reports.
3.  **Run AI Analyst**: (Optional) Generate an executive summary using Ollama.

### Other Commands
- `npm run go:skip-ai` — Run simulation + forensics only (skips AI).
- `npm run go:skip-sim` — Skip simulation, just re-run forensics/AI on the last run.
- `npm run go:dry-run` — Show what would happen without running anything.

### New Scenarios
-   **Market Manipulation**: Simulate a flashloan pump & dump.
    ```bash
    node scripts/simulations/sim_runner.mjs --scenario market_manipulation
    ```

## 3. View Results

The script will output the path to the results folder (e.g., `runs/run_xxxxxxxx/forensic_bundle/`).

Key files to check:
1.  **Forensic Report** (`05_reports/forensic_report.md`):
    - Full breakdown of incidents, suspicious transactions, and money flow.
2.  **Signals Coverage** (`03_signals/_meta/signals_coverage_report.json`):
    - Which detection rules fired and how often.
3.  **AI Summary** (`06_ai/ai_executive_summary.md`):
    - Narrative explanation of the attack (if AI was enabled).
4.  **Manager Storyboard** (`decoded/manager_storyboard.md`):
    - Simplified "Vulnerability → Heist → Detection" walkthrough for executives.

## 4. AI Setup (Optional)

To enable the AI analyst:
1.  Install Ollama: https://ollama.ai
2.  Run `ollama serve` in a separate terminal.
3.  Pull the model: `ollama pull phi3:mini`
4.  Set `ai.enabled: true` in `sim.config.js`.

The `npm run go` command will automatically use it.

## 5. Raw Data Import Format

If importing external data (`--mode raw_import --raw-root <dir>`), ensuring the following NDJSON structure:

```
raw_root/
├── chain/
│   └── block_headers_*.ndjson
├── txs/
│   ├── transactions_raw_*.ndjson
│   ├── transaction_receipts_*.ndjson
│   └── event_logs_raw_*.ndjson
├── traces/
│   └── call_traces_raw_*.ndjson
└── state/ (Recommended)
    ├── state_diffs_*.ndjson
    ├── balance_diffs_*.ndjson
    └── storage_diffs_*.ndjson
    └── storage_diffs_*.ndjson
```

## 7. Importing Client Data (Standalone)

If a client gives you a folder of raw NDJSON files (e.g., `client_data_dump/`), use the standalone ingestion tool:

```bash
node ingest_raw.js --input ./client_data_dump
```

This will run the **full pipeline**: Forensics + AI Summary + Manager Storyboard.

## 8. Visualizing Graphs

The tool generates graph data in:
`runs/run_ID/forensic_bundle/02_forensic_bundle/04_graphs/`

To view these:
1.  **VS Code Extensions**:
    -   Install **"Graphviz Preview"** (by Stephanvs).
    -   Open `.dot` files (e.g., `incident_graph.dot` or `money_flow.dot`).
    -   Click the "Open Preview to the Side" button (or Ctrl+Shift+V).
2.  **Online Viewers**:
    -   Copy the content of any `.dot` file.
    -   Paste it into [Viz.js](http://viz-js.com/) or [Edotor](https://edotor.net/).


## 6. Manual Storyboard Generation

If you have an existing run and want to generate the Manager Storyboard manually:

```bash
node src/ai/storyboard_generator.js --bundle-dir runs/run_YOUR_ID/forensic_bundle
```
