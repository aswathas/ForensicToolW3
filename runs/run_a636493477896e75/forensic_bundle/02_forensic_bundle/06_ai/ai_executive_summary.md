# AI Executive Summary

> **NOTE**: AI narrative requires Ollama (local LLM) to be running.

## Quick Setup

```bash
# 1. Install Ollama: https://ollama.ai
# 2. Start Ollama
ollama serve

# 3. Pull a lightweight model (choose one):
ollama pull phi3:mini      # 2.3GB — best quality for forensics
ollama pull tinyllama      # 637MB — fastest, lowest RAM

# 4. Generate AI summary
node src/ai/ollama_analyst.js --bundle-dir "./runs/run_a636493477896e75/forensic_bundle"
```

## What the AI Will Analyze

- `02_forensic_bundle/05_reports/forensic_report.json` — all signals and incidents
- `02_forensic_bundle/03_signals/signals_000001.ndjson` — HIGH-confidence signals
- `02_forensic_bundle/05_ml_features/ml_feature_schema.json` — ML feature summary

## Output

- `06_ai/ai_executive_summary.md` — narrative report
- `06_ai/ai_analysis.json` — structured JSON for programmatic use