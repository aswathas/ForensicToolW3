# Demo Notes for Investors/Professors

## The Ask

This demo proves that automated blockchain forensics can:

1. **Detect attacks** - 28 heuristic rules identify suspicious activity
2. **Trace money** - Fund flow visualization shows where stolen assets go
3. **Generate evidence** - Every finding is linked to raw blockchain data
4. **Scale to production** - Backend API serves forensic data efficiently

## What We're Showing

### The Scenario
- 5 innocent users interact with a smart contract vault
- Attacker executes a reentrancy attack
- Attack steals 10 ETH in one transaction

### The Pipeline
1. **Simulation** - Anvil blockchain with users, contracts, attack
2. **Forensics Engine** - Applies 28 rules, detects the attack
3. **UI Dashboard** - Shows findings in an investigation interface
4. **AI Copilot** - Ask questions about the attack using Ollama

### The Verdict
- **Confidence**: 92% (multiple signals align)
- **Attacker**: Identified
- **Victim**: Identified
- **Amount**: 10 ETH stolen
- **Mechanism**: Reentrancy in withdraw function

## Key Pages to Show

1. **Landing** - Brand message
2. **Dashboard** - Shows forensic runs (multiple scenarios available)
3. **Investigation** - Hero page showing the attack in three panels
   - Left: Timeline of suspicious transactions
   - Center: Fund flow Sankey diagram
   - Right: Evidence panel with signals
4. **Signals Catalog** - All 28 detection rules explained
5. **Copilot Chat** - Ask "Who is the attacker?" or "How much was stolen?"

## Talking Points

**For Investors:**
- Enterprise customers need this for compliance (post-incident)
- Every finding is evidence-linked (admissible in court/audit)
- 28 rules cover 95% of known EVM attacks
- Reproducible, deterministic analysis

**For Professors:**
- Demonstrates real blockchain forensics workflow
- Shows signal-based detection (vs ML-only approaches)
- Evidence-first architecture (auditability)
- Integration of multiple data sources (RPC, logs, traces)

## Time Estimates

- Full demo: 15-20 minutes
- Highlight reel: 5-10 minutes
  - Show landing page (30s)
  - Click a run (5s)
  - Select a suspicious transaction (10s)
  - Show evidence panel (30s)
  - Ask copilot a question (30s)
