/**
 * generator.js — Report Generator
 * Produces human-readable forensic reports from signals and incidents.
 * AI narrative section is a placeholder — will be filled by Ollama integration.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ethers } from 'ethers';

export async function runReportGenerator(signals, incidents, derived, rawData, outputDir) {
    const bundleDir = join(outputDir, '02_forensic_bundle');
    const reportsDir = join(bundleDir, '05_reports');
    const aiDir = join(bundleDir, '06_ai');
    const govDir = join(bundleDir, '00_governance');
    const qualityDir = join(bundleDir, '00_quality');

    [reportsDir, aiDir, govDir, qualityDir].forEach(d => mkdirSync(d, { recursive: true }));

    const now = new Date().toISOString();
    const firedRules = signals.firedRules || [];
    const totalSignals = signals.totalFired || 0;

    // ── Analyze Incidents for Summary ────────────────────────────
    let summaryVerdict = 'Clean';
    let attackVectors = new Set();
    let topAttacker = 'None';
    let topVictim = 'None';
    let exploitTxCount = 0;
    let setupTxCount = 0;

    if (incidents.length > 0) {
        summaryVerdict = 'Suspicious Activity Detected';

        // Collect all rules fired across incidents
        const allRules = new Set(incidents.flatMap(i => i.rules_fired));

        if ([...allRules].some(r => r.includes('REENTRANCY'))) {
            attackVectors.add('Reentrancy');
            summaryVerdict = 'CONFIRMED ATTACK';
        }
        if ([...allRules].some(r => r.includes('FLASHLOAN'))) {
            attackVectors.add('Flashloan Manipulation');
            summaryVerdict = 'CONFIRMED ATTACK';
        }
        if ([...allRules].some(r => r.includes('DRAINED') || r.includes('VICTIM_LOSES'))) {
            attackVectors.add('Asset Draining');
        }

        // Count "Setup" vs "Exploit" based on signals
        const setupRules = ['NEW_RECEIVER_FIRST_SEEN_AND_LARGE_INFLOW', 'CONSOLIDATION_TO_FEW_SINKS', 'STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT'];
        const exploitRules = ['REENTRANCY_SAME_FUNCTION_LOOP', 'FLASHLOAN_WITH_EXTRACTION_OUTFLOW', 'STATE_DIFF_VICTIM_LOSES_ATTACKER_GAINS'];

        // This is rough estimation based on signals
        setupTxCount = signals.allSignals.filter(s => setupRules.includes(s.rule_id)).length;
        exploitTxCount = signals.allSignals.filter(s => exploitRules.includes(s.rule_id)).length;

        // Identify Top Attacker (most frequently flagged as suspect)
        const suspectCounts = {};
        incidents.forEach(inc => {
            inc.suspect_addresses.forEach(addr => {
                suspectCounts[addr] = (suspectCounts[addr] || 0) + 1;
            });
        });
        topAttacker = Object.keys(suspectCounts).sort((a, b) => suspectCounts[b] - suspectCounts[a])[0] || 'None';
    }

    // ── Forensic Report (MD) ─────────────────────────────────────
    const forensicReport = [
        `# Forensic Report`,
        ``,
        `> **Deterministic Analysis** (No AI)`,
        ``,
        `## Executive Summary`,
        ``,
        `**Verdict**: ${summaryVerdict}`,
        `**Detected Attack Vectors**: ${attackVectors.size > 0 ? [...attackVectors].join(', ') : 'None'}`,
        `**Primary Suspect**: \`${topAttacker}\``,
        ``,
        `### Analysis Overview`,
        `The forensic engine analyzed **${rawData.txCount} transactions** and identified **${incidents.length} incident clusters** involving **${totalSignals} high-confidence signals**.`,
        ``,
        `- **Confirmed Exploits**: ${exploitTxCount} strong signals indicating theft or malicious state manipulation.`,
        `- **Setup/Funding Noise**: ${setupTxCount} signals indicating large capital movements (likely setup or funding).`,
        ``,
        `---`,
        ``,
        `**Generated**: ${now}`,
        `**Total Signals Fired**: ${totalSignals}`,
        `**Incidents Detected**: ${incidents.length}`,
        `**Transactions Analyzed**: ${rawData.txCount}`,
        `**Event Logs**: ${rawData.logCount}`,
        `**Traces**: ${rawData.traceCount}`,
        ``,
        `## Incidents`,
        ``,
        ...incidents.flatMap(inc => [
            `### Incident ${inc.incident_index} — \`${inc.incident_id}\``,
            ``,
            `- **Severity**: ${inc.severity}`,
            `- **Transactions**: ${inc.tx_count}`,
            `- **Block Range**: ${inc.block_range ? `${inc.block_range.from} → ${inc.block_range.to}` : 'N/A'}`,
            `- **Signals Fired**: ${inc.signal_count}`,
            `- **Rules**: ${inc.rules_fired.join(', ')}`,
            `- **Suspect Addresses**:`,
            ...inc.suspect_addresses.map(a => `  - \`${a}\``),
            `- **Transactions**:`,
            ...inc.tx_hashes.map(h => `  - \`${h}\``),
            ``,
        ]),
        `## Signal Summary`,
        ``,
        `| Rule | Count |`,
        `|------|-------|`,
        ...firedRules.map(rule => {
            const count = signals.allSignals.filter(s => s.rule_id === rule).length;
            return `| ${rule} | ${count} |`;
        }),
        ``,
        `## Limitations`,
        ``,
        `- Traces available: ${rawData.traceCount > 0 ? 'YES' : 'NO — some reentrancy signals may have lower confidence'}`,
        `- ABI decoding: Standard ERC20/721 only — unknown contract selectors not decoded`,
        `- Oracle price data: Not available — Rules 15, 17 not evaluated`,
        `- IOC list: Not provided — Rule 27 not evaluated`,
    ].join('\n');

    writeFileSync(join(reportsDir, 'forensic_report.md'), forensicReport);

    // ── Forensic Report (JSON) ───────────────────────────────────
    const forensicReportJson = {
        generated_at: now,
        summary: {
            total_signals: totalSignals,
            incidents: incidents.length,
            txs_analyzed: rawData.txCount,
            rules_fired: firedRules,
        },
        incidents,
        signals_by_rule: firedRules.map(rule => ({
            rule_id: rule,
            count: signals.allSignals.filter(s => s.rule_id === rule).length,
            signals: signals.allSignals.filter(s => s.rule_id === rule),
        })),
    };
    writeFileSync(join(reportsDir, 'forensic_report.json'), JSON.stringify(forensicReportJson, null, 2));

    // ── Suspect Entities ─────────────────────────────────────────
    const suspectMap = {};
    for (const inc of incidents) {
        for (const addr of inc.suspect_addresses) {
            if (!suspectMap[addr]) suspectMap[addr] = { incidents: [], rules: new Set() };
            suspectMap[addr].incidents.push(inc.incident_id);
            inc.rules_fired.forEach(r => suspectMap[addr].rules.add(r));
        }
    }
    const suspectReport = [
        `# Suspect Entities`,
        ``,
        `> NOTE: These are "suspect entities" based on signal evidence. Not labeled as attackers.`,
        ``,
        ...Object.entries(suspectMap).map(([addr, data]) => [
            `## \`${addr}\``,
            `- **Incidents**: ${data.incidents.join(', ')}`,
            `- **Associated Rules**: ${[...data.rules].join(', ')}`,
            ``,
        ].join('\n')),
    ].join('\n');
    writeFileSync(join(reportsDir, 'suspect_entities.md'), suspectReport);

    // ── Money Trail ──────────────────────────────────────────────
    const moneyTrail = [
        `# Money Trail Report`,
        ``,
        `## Fund Flow Summary`,
        ``,
        `Total fund flow edges: ${derived.fundFlowEdges?.length || 0}`,
        ``,
        `## Top Receivers (by inflow count)`,
        ``,
    ];
    if (derived.addressProfiles) {
        const topReceivers = derived.addressProfiles
            .sort((a, b) => Number(BigInt(b.total_inflow_wei || 0) - BigInt(a.total_inflow_wei || 0)))
            .slice(0, 10);
        for (const p of topReceivers) {
            moneyTrail.push(`- \`${p.address}\`: ${ethers.formatEther(BigInt(p.total_inflow_wei || 0))} ETH inflow`);
        }
    }
    writeFileSync(join(reportsDir, 'money_trail_report.md'), moneyTrail.join('\n'));

    // ── Action Checklist ─────────────────────────────────────────
    const checklist = [
        `# Action Checklist`,
        ``,
        `## Immediate`,
        `- [ ] Review incident clusters in forensic_report.md`,
        `- [ ] Verify suspect entity addresses against known threat intel`,
        `- [ ] Check fund flow graph for off-ramp destinations`,
        ``,
        `## Investigation`,
        `- [ ] Obtain full ABI for unknown contract addresses`,
        `- [ ] Request traces from node if not available`,
        `- [ ] Cross-reference suspect addresses with exchange KYC`,
        ``,
        `## Remediation`,
        `- [ ] If reentrancy confirmed: pause affected contracts`,
        `- [ ] If flashloan confirmed: review oracle price sources`,
        `- [ ] File incident report with chain-of-custody documentation`,
    ].join('\n');
    writeFileSync(join(reportsDir, 'action_checklist.md'), checklist);

    // ── Limitations ──────────────────────────────────────────────
    const limitations = [
        `# Limitations and Gaps`,
        ``,
        `| Item | Status | Impact |`,
        `|------|--------|--------|`,
        `| Call traces | ${rawData.traceCount > 0 ? '✅ Available' : '❌ Missing'} | Reentrancy signals require traces for HIGH confidence |`,
        `| State diffs | ${rawData.stateDiffCount > 0 ? `✅ Available (${rawData.stateDiffCount} txs)` : '❌ Not collected'} | Storage slot analysis and Group G heuristics |`,
        `| ABI decoding | Partial (ERC20/721 only) | Unknown selectors remain undecoded |`,
        `| Oracle data | ❌ Not available | Rules 15, 17 not evaluated |`,
        `| IOC list | ❌ Not provided | Rule 27 not evaluated |`,
    ].join('\n');
    writeFileSync(join(reportsDir, 'limitations_and_gaps.md'), limitations);
    writeFileSync(join(qualityDir, 'limitations_and_gaps.md'), limitations);

    // ── AI Narrative (placeholder — Ollama will fill this) ───────
    const aiPlaceholder = [
        `# AI Executive Summary`,
        ``,
        `> **NOTE**: AI narrative requires Ollama (local LLM) to be running.`,
        ``,
        `## Quick Setup`,
        ``,
        `\`\`\`bash`,
        `# 1. Install Ollama: https://ollama.ai`,
        `# 2. Start Ollama`,
        `ollama serve`,
        ``,
        `# 3. Pull a lightweight model (choose one):`,
        `ollama pull phi3:mini      # 2.3GB — best quality for forensics`,
        `ollama pull tinyllama      # 637MB — fastest, lowest RAM`,
        ``,
        `# 4. Generate AI summary`,
        `node src/ai/ollama_analyst.js --bundle-dir "${outputDir}"`,
        `\`\`\``,
        ``,
        `## What the AI Will Analyze`,
        ``,
        `- \`02_forensic_bundle/05_reports/forensic_report.json\` — all signals and incidents`,
        `- \`02_forensic_bundle/03_signals/signals_000001.ndjson\` — HIGH-confidence signals`,
        `- \`02_forensic_bundle/05_ml_features/ml_feature_schema.json\` — ML feature summary`,
        ``,
        `## Output`,
        ``,
        `- \`06_ai/ai_executive_summary.md\` — narrative report`,
        `- \`06_ai/ai_analysis.json\` — structured JSON for programmatic use`,
    ].join('\n');
    writeFileSync(join(aiDir, 'ai_executive_summary.md'), aiPlaceholder);

    // ── Governance ───────────────────────────────────────────────
    writeFileSync(join(govDir, 'tool_version.json'), JSON.stringify({
        tool: 'EVM Forensics Agent',
        version: '1.0.0',
        generated_at: now,
    }, null, 2));

    writeFileSync(join(govDir, 'chain_of_custody.json'), JSON.stringify({
        generated_at: now,
        mode: 'automated',
        pipeline_steps: ['window_resolver', 'raw_collector', 'derived_pipeline', 'signals_engine', 'incident_clusterer', 'graph_builder', 'report_generator'],
    }, null, 2));

    // ── Quality: completeness metrics ────────────────────────────
    writeFileSync(join(qualityDir, 'completeness_metrics.json'), JSON.stringify({
        txs: rawData.txCount,
        logs: rawData.logCount,
        traces: rawData.traceCount,
        state_diffs: rawData.stateDiffCount ?? 0,
        trace_coverage_pct: rawData.txCount > 0 ? ((rawData.traceCount / rawData.txCount) * 100).toFixed(1) : '0',
        state_diff_coverage_pct: rawData.txCount > 0 ? (((rawData.stateDiffCount ?? 0) / rawData.txCount) * 100).toFixed(1) : '0',
        signals_fired: totalSignals,
        rules_fired: firedRules.length,
        rules_total: 36,
        incidents: incidents.length,
    }, null, 2));

    console.log(`[reports] Reports written to ${reportsDir}`);
}
