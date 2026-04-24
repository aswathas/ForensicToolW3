# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EVM Forensics Agent** — An enterprise-grade blockchain forensics platform for detecting and analyzing suspicious activity on EVM chains. The tool ingests either live RPC data or client-exported raw logs, applies 28 heuristic detection rules (signals), clusters findings into incidents, performs ML-based risk scoring, and generates evidence-linked forensic reports.

The tool follows strict enterprise principles: evidence-first reporting, reproducibility via deterministic derivations, evidence-linked tracing, and graceful handling of incomplete data.

## Key Commands

```bash
# Full pipeline (simulation → forensics → AI analysis)
npm run go

# Skip simulation, re-analyze last run
npm run go:skip-sim

# Skip AI step (forensics only)
npm run go:skip-ai

# Dry-run (show what would execute)
npm run go:dry-run

# Simulation scenarios (various parameters)
npm run sim:precision        # minimal: 2 users, 1 tx each
npm run sim:quick            # medium: 5 attackers, 3 users
npm run sim:heavy            # comprehensive: 4 repeats, 8 users, 5 attackers

# Direct forensics on raw data
npm run forensics:import     # import existing raw data
npm run forensics:live       # attach to live RPC endpoint

# AI analysis on existing runs
npm run ai:analyze
```

## Configuration

**Primary configuration file: `sim.config.js`** — Controls simulation parameters:
- `numUsers`: Number of innocent users
- `txsPerUser`: Transaction sets per user
- `numAttacks`: Attack types to include (1–5)
- `attacks`: Enable/disable specific attack patterns (reentrancy, flashloan, oracle manipulation, etc.)
- `ai.enabled`: Enable Ollama-based AI analysis

Edit this file to control simulation scale and features before running `npm run go`.

## Architecture

### Layered Pipeline Design

The tool processes data through strictly deterministic layers, each producing a reproducible output bundle:

```
00_intake              ← Simulation metadata + ABI bindings
 ↓
01_raw                 ← Layer 0: Raw blockchain data (blocks, txs, traces, state diffs)
 ↓
02_forensic_bundle/
  ├─ 00_abi            ← ABI index + decoder mappings
  ├─ 01_abi_enriched   ← Decoded transactions & events
  ├─ 02_derived        ← Layer 1: 36 deterministic datasets (transaction enrichment, traces, value movement)
  ├─ 03_signals        ← Layer 2: 28 heuristic rules (detectors) + coverage rollups
  ├─ 04_ml             ← Layer 3: Feature vectors + risk scoring
  ├─ 05_reports        ← Human-readable findings (forensic report, incident timeline, money trail)
  ├─ 06_ai             ← Evidence-linked AI narratives (executive summary, analyst notes)
  └─ 07_graphs         ← Execution + fund-flow visualizations (.dot format)
```

### Module Organization

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **ingestion** | Data import (RPC/raw files), window resolution | `window_resolver.js`, `raw_collector.js` |
| **derived** | Layer 1: Transforms raw data into enriched views | `pipeline.js` (orchestrates 36 datasets) |
| **signals** | Layer 2: Applies 28 heuristic rules for detection | `engine.js` (signal dispatch + triage) |
| **ml** | Layer 3: Feature extraction + risk scoring | `ml_features.js` |
| **incidents** | Clusters suspicious txs into incidents | `clusterer.js` |
| **reports** | Generates all output documents | `generator.js` |
| **graphs** | Builds execution & fund-flow graphs | `builder.js`, `dot_exporter.js` |
| **ai** | Ollama integration for narratives | `ollama_analyst.js`, `storyboard_generator.js` |
| **integrity** | Evidence-linking & referential checks | `manifest.js` |

### Critical Design Constraints

1. **Evidence-First**: Every finding must reference upstream data (dataset_path + record_id). Never fabricate or assume.
2. **Deterministic**: Layer 1 datasets are deterministic transforms of raw data + config. No randomness in core derivations.
3. **Graceful Degradation**: Missing traces/state-diffs/ABIs → emit limitations, don't fail. Optional data may be empty.
4. **Reproducible**: All runs produce manifest.json, sha256sums.txt, and referential_integrity_report.json.

### Window Resolution (Critical for Forensics)

The forensics engine must determine which blocks to analyze. Priority order:

1. **CLI flags**: `--from-block` / `--to-block` (explicit)
2. **ForensicsMarker events** (simulation mode): Scan on-chain for RunStart/RunEnd events
3. **Local markers file**: `run_markers.json` fallback
4. **lastN fallback** (dev only, with warnings)

For simulations, the runner deploys ForensicsMarker contract and emits RunStart/RunEnd events; forensics engine scans these to auto-detect the window.

## Key Data Flow

1. **Raw Import** → Collect blocks, txs, receipts, traces, state diffs from RPC or files
2. **Window Resolution** → Determine from_block/to_block
3. **ABI Binding** → Index known ABIs (client contracts + standard ERC20/721/1155)
4. **Derived Layer** → 36 datasets: enriched txs, traces, token transfers, approvals, etc.
5. **Signal Detection** → Fire 28 rules against derived data, rank suspicious txs
6. **Incident Clustering** → Group txs by shared victims, suspects, sinks, block proximity
7. **ML Scoring** → Compute entity risk, transaction anomaly, community detection
8. **Report Generation** → Forensic report, incident timeline, money trail
9. **AI Analysis** → Ollama narrative (evidence-linked, grounded in reports)
10. **Graph Export** → Execution & fund-flow .dot files for visualization

## The 28 Heuristic Rules

Organized into 6 categories (signals_catalog.json must list all 28):

- **Reentrancy** (6): same-function loops, cross-function, callback before state update, delegatecall in sensitive paths, multiple withdraws, reverts after partial state change
- **Approvals** (4): unlimited approval, allowance drain bursts, approval+drain window, spender role anomalies
- **Flashloans** (4): borrow-repay same tx, multi-pool hops, large price impact, extraction outflows
- **Oracle/Price** (4): deviation in same block, spot price spikes, sandwich-like impact, arbitrage with victim
- **Admin/Upgrade** (4): proxy implementation change, privileged role change, suspicious admin sequences, upgrade+outflow
- **Fund Flow** (6): victim net outflow spike, new receiver with large inflow, peel chains, consolidation patterns, hop to risky destinations, asset diversification

Each rule:
- Has a confidence policy (deterministic + evidence-based)
- Tracks false positive notes
- Reports per-signal coverage (count, missing inputs)

## Output Structure

After running `npm run go`, results are in `evidence_run_<run_id>/`:

- **README.md** + **run_meta.json** → Execution context
- **00_intake/** → Simulation metadata, provided entities, ABI bindings
- **01_raw/** → Raw blockchain data (quality reports included)
- **02_forensic_bundle/** → All derived, signal, ML, and report outputs
  - **05_reports/forensic_report.md** → Main findings (incidents, suspicious txs, money flow)
  - **05_reports/suspect_entities.md** → Ranked entities by risk
  - **03_signals/_meta/signals_coverage_report.json** → Which rules fired + coverage stats
  - **06_ai/ai_executive_summary.md** → AI-generated narrative (if enabled)
  - **07_graphs/*.dot** → Execution graph, fund-flow graph (import to VS Code Graphviz Preview or Viz.js)

## AI Analysis (Optional)

Requires [Ollama](https://ollama.ai):

```bash
# Terminal 1: Start Ollama server
ollama serve

# Terminal 2: Pull model
ollama pull phi3:mini

# Then run with AI enabled (set in sim.config.js)
npm run go
```

AI outputs are grounded in forensic reports and include:
- Executive summary (incident overview)
- Analyst narrative (detailed walkthrough with evidence citations)
- Hypotheses (alternative interpretations + caveats)
- Next steps (recommended actions)

## Development Notes

### When Adding Detection Rules

1. Implement rule logic in `src/signals/engine.js`
2. Add rule metadata to `signals_catalog.json` (name, description, confidence model, false positive notes)
3. Emit signal event with evidence_refs pointing to upstream datasets
4. Update `signals_coverage_report.json` to track coverage
5. Add rollup views in `signals_by_entity` / `signals_by_incident`

### When Modifying Derived Datasets

1. All Layer 1 transforms must be deterministic (same input → same output, no randomness)
2. Each record must include a stable `record_id` (computed via SHA256 over canonical fields)
3. Any new dataset must be added to the 02_forensic_bundle/02_derived structure
4. Update `derivation_manifest.json` with schema + transformation logic
5. Evidence-link: include source dataset references

### When Interpreting Forensic Output

- **Suspect entity** = high-risk address (NOT confirmed attacker — confidence-scored)
- **Incident** = cluster of correlated suspicious txs
- **Signal** = rule-based detection (may have false positives; confidence layer mitigates)
- **ML score** = auxiliary (complements signals, not primary evidence)
- **Money trail** = fund-flow tracing (limited by missing internal transfers; see coverage report)

### Viewing Graphs

- **VS Code**: Install "Graphviz Preview" extension, open `.dot` files
- **Online**: Paste `.dot` content into [Viz.js](http://viz-js.com/) or [Edotor](https://edotor.net/)

## Testing & Debugging

```bash
# Precision test (minimal scale: 2 users, 1 tx each, quick execution)
npm run sim:precision

# Dry-run to see execution plan
npm run go:dry-run

# Skip simulation, re-run forensics on last run (for iterating on derivation/signals)
npm run go:skip-sim

# Verbose logging (set in your terminal or modify go.mjs)
node go.mjs --verbose
```

Check `sim_debug.log` and `pipeline_log.txt` for execution traces.

## Enterprise Requirements (Non-Negotiable)

1. **Evidence-First**: All conclusions must cite upstream data. No fabrication.
2. **Reproducibility**: Same input → same deterministic output. manifest.json + sha256sums.txt required.
3. **Integrity**: referential_integrity_report.json must validate all evidence_refs resolve.
4. **Graceful Degradation**: Missing traces/state diffs → limitations documented, not failure.
5. **ABI Decoding**: Only decode with provided/standard ABIs. Never assume attacker ABI.
6. **Confidence Layers**: Separate observable facts from heuristic detections from ML assist from AI narrative.

These are enforced via quality checks in completeness_metrics.json, consistency_checks.json, and limitations_and_gaps.md.
