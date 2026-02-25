# AI Executive Summary

> **NOTE**: AI narrative requires Ollama integration.
> Run: `node src/forensics/ai/analyst.js --output-dir runs/run_5449b9eaedf565a3/forensic_bundle`
> after setting up Ollama with a local model (e.g., mistral, llama3).

## What to Analyze

The AI analyst should review:
- `02_forensic_bundle/05_reports/forensic_report.json`
- `02_forensic_bundle/03_signals/signals_000001.ndjson`
- `02_forensic_bundle/03_signals/rollups/signals_by_incident_000001.ndjson`

And produce:
- Executive summary
- Attack hypothesis with confidence
- Recommended next steps