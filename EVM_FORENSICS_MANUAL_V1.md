# EVM Forensics Agent - Comprehensive Manual (Version 1.0)

**Author:** EVM Forensics Team  
**Date:** February 2026  
**Version:** 1.0.0

---

## 📋 Table of Contents

1.  [Executive Summary](#1-executive-summary)
2.  [System Architecture](#2-system-architecture)
3.  [Installation & Setup](#3-installation--setup)
4.  [The Simulation Engine](#4-the-simulation-engine)
5.  [The Forensics Pipeline](#5-the-forensics-pipeline)
6.  [AI Analyst & Visualization](#6-ai-analyst--visualization)
7.  [Detection Signals Reference](#7-detection-signals-reference)
8.  [Graph Visualization Logic](#8-graph-visualization-logic)
9.  [Extensibility Guide](#9-extensibility-guide)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Executive Summary

The **EVM Forensics Agent** is an enterprise-grade security analysis tool designed to detect, analyze, and visualize complex exploits on Ethereum Virtual Machine (EVM) blockchains. Unlike reliable static analysis tools, this agent performs **dynamic execution analysis**—it runs simulations or replays actual transaction history to observe the *runtime behavior* of smart contracts.

### Key Capabilities
*   **Simulation Matrix**: Spawns a local blockchain (Anvil), deploys vulnerable contracts, and simulates realistic user traffic mixed with sophisticated attacks (Reentrancy, Flash Loans, Market Manipulation).
*   **Deep Forensics**: Ingests raw block data (traces, logs, state diffs) and reconstructs the "crime scene" with high fidelity.
*   **AI Analyst**: Connects to local LLMs (via Ollama) to generate execute summaries and decoding storyboards for non-technical stakeholders.
*   **Visual Intelligence**: Automatically generates Graphviz (.dot) visualizations for fund flows, execution traces, and incident clusters.

---

## 2. System Architecture

The system is composed of three main layers:

1.  **Simulation Layer (`scripts/simulations/`)**
    *   **Engine**: Node.js script that orchestrates Anvil.
    *   **Scenarios**: Pluggable modules (`scenario_reentrancy`, `scenario_market_manipulation`) that define contracts and attack logic.
    *   **Output**: Generates raw NDJSON data (blocks, txs, traces).

2.  **Forensics Core (`src/`)**
    *   **Ingestion**: Reads raw data from disk (`raw_import`) or RPC (`rpc_live`).
    *   **Derived Engine**: Enriches data (e.g., decodes ABIs, calculates gas usage).
    *   **Signals Engine**: Runs 28+ heuristic rules to flag suspicious activity.
    *   **ML Engine**: Extracts features for anomaly detection.
    *   **Clustering**: Groups related suspicious signals into "Incidents".

3.  **Presentation Layer**
    *   **Report Generator**: Markdown reports (`forensic_report.md`).
    *   **Graph Exporter**: `.dot` files for visualization.
    *   **AI Agent**: Summarizes findings into natural language.

---

## 3. Installation & Setup

### Prerequisites
*   **Node.js**: v18+
*   **Foundry (Anvil)**: Required for simulations.
    *   Install: `curl -L https://foundry.paradigm.xyz | bash` then `foundryup`.
*   **Ollama**: Required for AI analysis.
    *   Install from [ollama.com](https://ollama.com).
    *   Pull model: `ollama pull gemma3:1b`.

### Installation
```bash
git clone <repo_url>
cd ForensicToolW3
npm install
```

### Quick Start
The **Master Automation Script** (`go.mjs`) handles everything.

1.  **Configure**: Edit `sim.config.js` to set your desired simulation parameters.
2.  **Run**:
    ```bash
    npm run go
    ```
3.  **View Results**: Check the `runs/` directory for the latest output.

---

## 4. The Simulation Engine

The simulation engine is the "training gym" for the forensics tool. It creates a controlled environment to test detection capabilities.

### Configuration (`sim.config.js`)
This is the single source of truth.

*   **`numUsers`**: Number of innocent bots generating noise.
*   **`txsPerUser`**: How many interactions each bot performs.
*   **`attacks`**: Toggle specific attack vectors (e.g., `{ classic_reentrancy: true }`).
*   **`anvil`**: Settings for the local blockchain (accounts, balance).

### Scenarios
Scenarios are located in `scripts/simulations/scenarios/`.

*   **Reentrancy**: Deploys a vulnerable `EtherVault` and `FlashLoan` pool. Simulates an attacker recursively calling `withdraw()` to drain funds.
*   **Market Manipulation**: Deploys a DEX and a lending protocol. Simulates an attacker using a massive flash loan to skew spot prices and borrow under-collateralized assets.

---

## 5. The Forensics Pipeline

The pipeline processes data in stages.

### Stage 1: Raw Ingestion
Collets raw data into `client/01_raw/`:
*   `block_headers.ndjson`
*   `transactions_raw.ndjson`
*   `process_trace.ndjson` (Parity/Geth traces)
*   `storage_diffs.ndjson` (State changes)

### Stage 2: Derived Analysis
Normalizes data into `02_derived/`:
*   **`token_transfers`**: Decodes ERC20/721 logs.
*   **`contract_creations`**: Identifies new contracts.
*   **`native_transfers`**: Extracts internal ETH movements from traces.

### Stage 3: Signals & Incidents
*   **Signals**: Heuristic rules run against derived data.
    *   *Example*: `HIGH_VALUE_TRANSFER` (>100 ETH).
    *   *Example*: `REENTRANCY_SAME_FUNCTION_LOOP` (Repeated calls in 1 tx).
*   **Incidents**: The clusterer groups signals that share common addresses or transactions into a single "Incident ID".

---

## 6. AI Analyst & Visualization

### AI Summaries
The `src/ai/ollama_analyst.js` module reads the forensic report and prompts the local LLM.
*   **Output**: `06_ai/ai_executive_summary.md`
*   **Model**: Configurable in `sim.config.js`. Recommended: `gemma3:1b` for speed/quality balance.

### Manager Storyboard
The `src/ai/storyboard_generator.js` specifically targets non-technical executives.
*   **Goal**: Explain "The Vulnerability", "The Heist", and "The Detection" using analogies.
*   **Output**: `decoded/manager_storyboard.md`.

---

## 7. Detection Signals Reference

The tool currently supports 28 detection rules, including:

| ID | Name | Severity | Description |
|----|------|----------|-------------|
| `S001` | `REENTRANCY_SAME_FUNCTION_LOOP` | CRITICAL | Contract calls itself repeatedly in one tx (Reentrancy pattern). |
| `S005` | `FLASH_LOAN_DETECTED` | HIGH | Transaction borrows and repays huge amount in one tx. |
| `S009` | `WASH_TRADING_PATTERN` | MEDIUM | Asset moved A -> B -> A rapidly. |
| `S015` | `TORNADO_CASH_INTERACTION` | HIGH | Interaction with known mixer addresses. |
| `S022` | `PRICE_MANIPULATION_DEX` | CRITICAL | Spot price changed by >5% in a single block. |

---

## 8. Graph Visualization Logic

Graphs are generated in `07_graphs/viz/` as `.dot` files.

*   **Structure**:
    *   **Nodes**: Addresses (Contracts/EOAs).
    *   **Edges**: Transfers (ETH/Tokens) or Calls.
*   **Files**:
    *   `incident_fund_flow_subgraph_*.dot`: The specific money trail for a detected exploit.
    *   `execution_nodes_*.dot`: Call graph of the attack transaction.
*   **Viewing**: Open `.dot` files in VS Code with "Graphviz Preview" extension.

---

## 9. Extensibility Guide

### Adding a New Scenario
1.  Create `scripts/simulations/scenarios/scenario_my_new_attack/`.
2.  Add `contracts/` (Solidity) and `run.mjs` (Script).
3.  Register in `sim.config.js` and `sim_runner.mjs`.

### Adding a New Detection Rule
1.  Navigate to `src/signals/rules/`.
2.  Create `my_rule.js`.
3.  Implement the logic:
    ```javascript
    export function evaluate(tx, traces, logs) {
        if (/* condition */) return { confidence: 'HIGH', ... };
    }
    ```
4.  Register in `src/signals/engine.js`.

---

## 10. Troubleshooting

**"Anvil spawn ENOENT"**
*   **Cause**: Foundry is not in SYSTEM PATH.
*   **Fix**: Reinstall Foundry or check your environment variables.

**"AI Report not generating"**
*   **Cause**: Ollama is not running.
*   **Fix**: Run `ollama serve` in a separate terminal.

**"Empty Graphs"**
*   **Cause**: No signals fired, or simulation volume too low.
*   **Fix**: Run a simulation with specific attack parameters enabled (see Config).

---
*End of Manual*
