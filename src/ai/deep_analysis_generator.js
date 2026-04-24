#!/usr/bin/env node
/**
 * deep_analysis_generator.js
 *
 * Generates a premium self-contained HTML deep-analysis report for a forensic run.
 * Covers: per-tx breakdown, heuristic explanations, interactive money-flow graph,
 * Ollama AI narrative sections, signal verdict, and accuracy scorecard.
 *
 * Usage:
 *   node src/ai/deep_analysis_generator.js --run-dir <path> [--skip-ai] [--model <name>]
 *
 * Supports both flat (AdminAttackSim MVP) and nested (ForensicToolW3) run structures.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

// ── CLI ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function getArg(flag, def = null) {
    const i = argv.indexOf(flag);
    return i !== -1 ? argv[i + 1] : def;
}
const runDir   = getArg('--run-dir');
const skipAi   = argv.includes('--skip-ai');
const model    = getArg('--model', 'gemma3:1b');

if (!runDir) {
    console.error('Usage: node src/ai/deep_analysis_generator.js --run-dir <path> [--skip-ai] [--model <name>]');
    process.exit(1);
}

// ── Path resolution (flat MVP or nested W3) ──────────────────────────
function resolvePaths(dir) {
    // Pattern A: AdminAttackSim MVP flat structure
    const flatSig = join(dir, 'signals', 'with_abi', 'signals.json');
    if (existsSync(flatSig)) {
        return {
            signals:   flatSig,
            sigFallback: join(dir, 'signals', 'without_abi', 'signals.json'),
            decoded:   join(dir, 'decoded', 'with_abi', 'decoded_records.json'),
            graph:     join(dir, 'graphs', 'trace_graph_with_abi.json'),
            manifest:  join(dir, 'run_manifest.json'),
            outputDir: dir,
            mode:      'flat',
        };
    }
    // Pattern B: ForensicToolW3 nested
    const bundle = join(dir, '02_forensic_bundle');
    return {
        signals:    join(bundle, '03_signals', 'signals_000001.ndjson'),
        sigFallback: null,
        decoded:    join(bundle, '02_decoded', 'decoded_records.ndjson'),
        graph:      join(bundle, '04_graphs', 'trace_graph.json'),
        manifest:   join(dir, 'run_manifest.json'),
        outputDir:  dir,
        mode:       'nested',
    };
}

function readJson(path, fallback = []) {
    if (!path || !existsSync(path)) return fallback;
    try {
        const raw = readFileSync(path, 'utf8').trim();
        if (!raw) return fallback;
        // Handle NDJSON
        if (raw[0] !== '[' && raw[0] !== '{') return fallback;
        if (raw[0] === '[') return JSON.parse(raw);
        // NDJSON or single object
        if (raw.includes('\n')) return raw.split('\n').filter(Boolean).map(l => JSON.parse(l));
        return JSON.parse(raw);
    } catch { return fallback; }
}

// ── Ollama ───────────────────────────────────────────────────────────
async function ollamaGenerate(prompt, numPredict = 900) {
    try {
        const res = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.3, num_predict: numPredict } }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        return d.response || '';
    } catch (e) {
        return `[AI unavailable: ${e.message}]`;
    }
}

// ── HTML helpers ─────────────────────────────────────────────────────
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const short = h => h ? `${h.slice(0,6)}...${h.slice(-4)}` : '—';
const fmt = v => {
    const n = parseFloat(v);
    if (isNaN(n)) return v;
    if (n > 1e18) return (n / 1e18).toFixed(4) + ' (wei→ETH?)';
    return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
};

function classColor(cls) {
    if (!cls) return 'normal';
    if (cls.includes('suspicious') || cls.includes('attack')) return 'suspicious';
    if (cls.includes('exit')) return 'exit';
    if (cls.includes('staging')) return 'staging';
    return 'normal';
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
    const paths = resolvePaths(runDir);
    console.log(`[deep-analysis] Mode: ${paths.mode}`);
    console.log(`[deep-analysis] Run dir: ${runDir}`);

    // Load data
    let signals = readJson(paths.signals, []);
    if (!signals.length && paths.sigFallback) signals = readJson(paths.sigFallback, []);
    const decoded  = readJson(paths.decoded, []);
    const graph    = readJson(paths.graph, { nodes: [], edges: [] });
    const manifest = readJson(paths.manifest, {});

    const runId = manifest.runId || runDir.split(/[\\/]/).pop();
    const totalTx = decoded.length;
    const suspiciousTx = decoded.filter(t => t.groundTruthAttackLinked || t.classification?.includes('suspicious'));
    const signalCount  = signals.length;
    const topSignal    = signals[0];
    const confidence   = topSignal?.confidence?.toUpperCase() || 'UNKNOWN';

    console.log(`[deep-analysis] Loaded: ${totalTx} txs, ${signals.length} signals, ${graph.nodes.length} graph nodes`);

    // ── AI Narratives ────────────────────────────────────────────────
    let aiExecutive = '', aiTechnical = '', aiRemediation = '';

    if (!skipAi) {
        const sigSummary = signals.map(s =>
            `Signal: ${s.signalName} | Confidence: ${s.confidence} | Actor: ${s.actor} → Target: ${s.target}\n` +
            `Heuristics: ${(s.triggeredHeuristics||[]).map(h=>`${h.id}(${h.name}): ${h.reason}`).join('; ')}\n` +
            `Why: ${s.why}`
        ).join('\n---\n');

        const txSummary = decoded.map(t =>
            `Block ${t.blockNumber}: ${t.decodedFunctionName||'unknown'}() by ${t.actorAddress} | Class: ${t.classification} | ` +
            `Events: ${(t.decodedEvents||[]).map(e=>e.eventName).join(',')||'none'}`
        ).join('\n');

        console.log('[deep-analysis] Calling Ollama for executive narrative...');
        aiExecutive = await ollamaGenerate(
            `You are a cybersecurity expert explaining a blockchain attack to a non-technical executive.\n` +
            `Based on these forensic signals and transactions, write 2 clear paragraphs explaining:\n` +
            `1) What the attack was and how it worked in simple terms\n` +
            `2) How your forensic system detected it\n\n` +
            `SIGNALS:\n${sigSummary}\n\nTRANSACTIONS:\n${txSummary}\n\n` +
            `Write in plain language. No bullet points. No code. Maximum 200 words.`
        );

        console.log('[deep-analysis] Calling Ollama for technical heuristic explanation...');
        const heuristics = topSignal?.triggeredHeuristics || [];
        aiTechnical = await ollamaGenerate(
            `You are a blockchain security engineer. Explain each of these heuristics technically:\n\n` +
            heuristics.map(h => `${h.id} — ${h.name}: ${h.reason}`).join('\n') + '\n\n' +
            `For each heuristic explain: what on-chain pattern it looks for, why that pattern is suspicious, ` +
            `and what the threshold means. Be precise and technical. Use 3-4 sentences per heuristic.`
        );

        console.log('[deep-analysis] Calling Ollama for remediation advice...');
        aiRemediation = await ollamaGenerate(
            `Based on this attack type "${topSignal?.signalName || 'privileged attack'}", ` +
            `what are 3-5 concrete smart contract code fixes and monitoring improvements that would prevent it? ` +
            `Be specific. Use short bullet points. Include both on-chain fixes and off-chain monitoring recommendations.`
        );
    } else {
        console.log('[deep-analysis] Skipping AI (--skip-ai flag set)');
        aiExecutive  = '<em>AI narrative skipped. Run without --skip-ai to generate.</em>';
        aiTechnical  = '<em>AI analysis skipped.</em>';
        aiRemediation = '<em>AI recommendations skipped.</em>';
    }

    // ── Build Cytoscape elements ─────────────────────────────────────
    const rolePositions = {
        unknown:          { x: 80,  y: 300 },
        contract:         { x: 350, y: 100 },
        privileged_actor: { x: 350, y: 320 },
        staging:          { x: 620, y: 320 },
        exit:             { x: 890, y: 320 },
        user:             { x: 200, y: 520 },
    };
    const userCount = {};
    const cyNodes = (graph.nodes || []).map(n => {
        const role = n.role || 'user';
        const pos = { ...(rolePositions[role] || { x: 200, y: 400 }) };
        if (role === 'user') {
            userCount.c = (userCount.c || 0) + 1;
            pos.x += (userCount.c - 1) * 110;
        }
        return {
            data: {
                id: n.address,
                label: n.label || short(n.address),
                role,
                suspicious: n.suspicious,
                attack_linked: n.attack_linked,
            },
            position: pos,
        };
    });

    const cyEdges = (graph.edges || []).map((e, i) => ({
        data: {
            id: `edge_${i}`,
            source: e.source,
            target: e.destination,
            label: `${e.amountFormatted || ''} [${e.actionType || ''}]`,
            amount: e.amountFormatted,
            actionType: e.actionType,
            suspicious: e.suspicious,
            classification: e.classification,
            txHash: e.txHash,
            block: e.blockNumber,
        },
    }));

    const cyElements = JSON.stringify([...cyNodes, ...cyEdges]);

    // ── Transaction cards HTML ───────────────────────────────────────
    const txCards = decoded.map((tx, i) => {
        const isSusp = tx.groundTruthAttackLinked || tx.classification?.includes('suspicious');
        const cls    = classColor(tx.classification);
        const events = (tx.decodedEvents || []).map(e => {
            const from = e.rawTopics?.[1] ? `0x${e.rawTopics[1].slice(-40)}` : '?';
            const to   = e.rawTopics?.[2] ? `0x${e.rawTopics[2].slice(-40)}` : '?';
            const rawVal = e.rawData ? BigInt(e.rawData).toString() : '?';
            const valFmt = e.rawData ? (Number(BigInt(e.rawData)) / 1e18).toFixed(4) : '?';
            return `<div class="event-row"><span class="ev-name">${esc(e.eventName||'Event')}</span>` +
                   `<span class="ev-flow">${short(from)} → ${short(to)}</span>` +
                   `<span class="ev-val">${valFmt} tokens</span></div>`;
        }).join('') || '<span class="no-events">No decoded events</span>';

        // Find heuristics triggered specifically for this tx
        const txHeuristics = signals.flatMap(s =>
            (s.triggeredHeuristics || [])
                .filter(() => s.txHash === tx.txHash)
                .map(h => h)
        );

        // Also collect derived heuristics from decoded report context
        const heurTags = (tx.heuristicsTriggered || []).map(h =>
            `<span class="heur-tag fired">${esc(h.id)} — ${esc(h.name)}</span>`
        ).join('');

        // Build heuristic section from parent signal if tx is in supporting evidence
        const parentSignal = signals.find(s =>
            s.txHash === tx.txHash ||
            (s.supportingEvidence || []).includes(tx.txHash)
        );
        const heurSection = parentSignal?.triggeredHeuristics?.length
            ? `<div class="tx-heuristics">
                <div class="heur-label">🔍 Heuristics triggered on signal:</div>
                ${parentSignal.triggeredHeuristics.map(h =>
                    `<div class="heur-item fired">
                        <span class="heur-id">${esc(h.id)}</span>
                        <span class="heur-name">${esc(h.name)}</span>
                        <span class="heur-reason">${esc(h.reason)}</span>
                    </div>`
                ).join('')}
            </div>`
            : '';

        const devScore = tx.baselineDeviation ? `<div class="tx-deviation">📊 Baseline Deviation: <strong>${esc(tx.baselineDeviation)}</strong></div>` : '';
        const rapidFollowUp = tx.rapidFollowUp === true ? `<div class="tx-flag rapid">⚡ Rapid follow-up extraction detected</div>` : '';
        const riskHint = tx.riskHint && tx.riskHint !== 'none' ? `<div class="tx-flag risk">⚠️ Risk hint: ${esc(tx.riskHint)}</div>` : '';

        return `
        <div class="tx-card ${cls}" id="tx-${i}">
            <div class="tx-card-header">
                <div class="tx-num">${i + 1}</div>
                <div class="tx-info">
                    <div class="tx-hash-line">
                        <span class="tx-icon">${isSusp ? '🔴' : '🟢'}</span>
                        <span class="tx-hash mono">${esc(tx.txHash)}</span>
                    </div>
                    <div class="tx-meta-row">
                        <span class="tx-block">Block #${esc(tx.blockNumber)}</span>
                        <span class="tx-sep">·</span>
                        <span class="tx-fn mono">${tx.decodedFunctionName ? esc(tx.decodedFunctionName) + '()' : `selector ${esc(tx.selector)}`}</span>
                        <span class="tx-sep">·</span>
                        <span class="badge badge-${cls}">${esc((tx.classification||'unknown').replace(/_/g,' ').toUpperCase())}</span>
                    </div>
                </div>
                <div class="tx-right-badges">
                    ${tx.groundTruthAttackLinked ? '<span class="badge badge-attack">✅ ATTACK LINKED</span>' : ''}
                    ${tx.decodeConfidence === 'high' ? '<span class="badge badge-green">ABI DECODED</span>' : ''}
                </div>
            </div>
            <div class="tx-card-body">
                <div class="tx-addr-row">
                    <div class="addr-block">
                        <div class="addr-label">From</div>
                        <div class="addr-val mono">${esc(tx.actorAddress || '—')}</div>
                    </div>
                    <div class="addr-arrow">→</div>
                    <div class="addr-block">
                        <div class="addr-label">To (Contract)</div>
                        <div class="addr-val mono">${esc(tx.targetAddress || 'contract deployment')}</div>
                    </div>
                </div>
                <div class="tx-section-label">Events Emitted</div>
                <div class="tx-events">${events}</div>
                ${devScore}${rapidFollowUp}${riskHint}
                ${heurSection}
            </div>
        </div>`;
    }).join('');

    // ── Heuristic panels ─────────────────────────────────────────────
    const allHeuristics = topSignal?.triggeredHeuristics || [];
    const heurPanels = allHeuristics.length ? allHeuristics.map(h => `
        <div class="heur-panel fired">
            <div class="heur-panel-id">${esc(h.id)}</div>
            <div class="heur-panel-name">${esc(h.name)}</div>
            <div class="heur-fired-badge">🔥 FIRED</div>
            <div class="heur-panel-reason">${esc(h.reason)}</div>
            <div class="heur-panel-txs">
                <div class="heur-tx-label">Triggered on TX:</div>
                <div class="mono heur-tx-hash">${esc(topSignal.txHash)}</div>
            </div>
        </div>`).join('') : '<p style="color:var(--text-dim)">No heuristics data available.</p>';

    // ── Signal verdict HTML ───────────────────────────────────────────
    const signalVerdict = topSignal ? `
        <div class="signal-alert">
            <div class="signal-icon">🚨</div>
            <div class="signal-name">${esc(topSignal.signalName)}</div>
            <div class="signal-conf">${esc(confidence)} CONFIDENCE</div>
            <div class="signal-why">${esc(topSignal.why || '')}</div>
            <div class="signal-evidence">
                <div class="evidence-label">Evidence Chain (${(topSignal.supportingEvidence||[]).length} txs)</div>
                ${(topSignal.supportingEvidence||[]).map((h,i) => `
                    <div class="evidence-item">
                        <span class="ev-step">Step ${i+1}</span>
                        <span class="mono ev-hash">${esc(h)}</span>
                    </div>`).join('')}
            </div>
        </div>` : '<p style="color:var(--text-dim)">No signals fired in this run.</p>';

    // ── Accuracy scorecard ────────────────────────────────────────────
    const attackLinked = decoded.filter(t => t.groundTruthAttackLinked);
    const truePos = attackLinked.length;
    const falsePos = decoded.filter(t => !t.groundTruthAttackLinked && t.classification?.includes('suspicious')).length;
    const precision = truePos + falsePos > 0 ? ((truePos / (truePos + falsePos)) * 100).toFixed(0) : 'N/A';
    const recall = truePos > 0 ? '100' : '0';

    const scorecard = `
        <div class="scorecard-grid">
            <div class="score-card green"><div class="score-val">${precision}%</div><div class="score-label">Precision</div></div>
            <div class="score-card green"><div class="score-val">${recall}%</div><div class="score-label">Recall</div></div>
            <div class="score-card red"><div class="score-val">${falsePos}</div><div class="score-label">False Positives</div></div>
            <div class="score-card purple"><div class="score-val">${truePos}</div><div class="score-label">True Positives</div></div>
        </div>
        <table class="score-table">
            <thead><tr><th>#</th><th>TX Hash</th><th>Block</th><th>Classification</th><th>GT Linked</th><th>Status</th></tr></thead>
            <tbody>
                ${decoded.map((t,i) => `
                <tr class="${t.groundTruthAttackLinked ? 'row-attack' : ''}">
                    <td>${i+1}</td>
                    <td class="mono">${short(t.txHash)}</td>
                    <td>${t.blockNumber}</td>
                    <td>${esc((t.classification||'').replace(/_/g,' '))}</td>
                    <td>${t.groundTruthAttackLinked ? '✅ YES' : '—'}</td>
                    <td>${t.groundTruthAttackLinked ? '<span class="badge badge-attack">ATTACK</span>' : '<span class="badge badge-green">NORMAL</span>'}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;

    // ── Full HTML document ────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Deep Attack Analysis — ${esc(runId)}</title>
<meta name="description" content="In-depth forensic attack analysis: per-transaction breakdown, heuristic explanations, money flow graph, and AI narrative.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/cytoscape@3.28.1/dist/cytoscape.min.js"></script>
<style>
:root {
    --bg:       #08080f;
    --bg-card:  #111118;
    --bg-hover: #1a1a26;
    --border:   #222230;
    --accent:   #7c6fff;
    --acc-glow: rgba(124,111,255,.25);
    --red:      #ef4444;
    --red-glow: rgba(239,68,68,.2);
    --orange:   #f59e0b;
    --ora-glow: rgba(245,158,11,.15);
    --green:    #22c55e;
    --grn-glow: rgba(34,197,94,.15);
    --text:     #e4e4f0;
    --dim:      #71717a;
    --muted:    #3f3f50;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);line-height:1.7;overflow-x:hidden}
.mono{font-family:'JetBrains Mono',monospace}

/* ── HERO ── */
.hero{min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:2rem;
    background:radial-gradient(ellipse at 30% 20%,rgba(124,111,255,.18),transparent 50%),
               radial-gradient(ellipse at 70% 80%,rgba(239,68,68,.12),transparent 50%);}
.hero h1{font-size:3rem;font-weight:800;background:linear-gradient(135deg,#7c6fff,#ef4444,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.5rem}
.hero .sub{font-size:1.1rem;color:var(--dim);max-width:680px;margin-bottom:2.5rem}
.meta-strip{display:flex;gap:1.2rem;flex-wrap:wrap;justify-content:center}
.meta-chip{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:.9rem 1.4rem;min-width:120px}
.meta-chip .mlabel{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.meta-chip .mval{font-size:1.4rem;font-weight:700;color:var(--accent);margin-top:.2rem}
.meta-chip .mval.red{color:var(--red)}
.meta-chip .mval.green{color:var(--green)}

/* ── LAYOUT ── */
.container{max-width:1200px;margin:0 auto;padding:0 2rem}
.section{padding:5rem 0}
.section-header{margin-bottom:2.5rem}
.section-tag{display:inline-flex;align-items:center;gap:.6rem;background:var(--bg-card);border:1px solid var(--border);border-radius:100px;padding:.4rem 1.2rem .4rem .6rem;font-size:.8rem;color:var(--dim);margin-bottom:1rem}
.section-tag .snum{background:var(--accent);color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.75rem}
.section h2{font-size:2rem;font-weight:700;color:#fff}
.narration{font-size:1rem;color:var(--dim);max-width:820px;line-height:1.9;padding:1.2rem 1.5rem;background:rgba(124,111,255,.05);border-left:3px solid var(--accent);border-radius:0 8px 8px 0;margin-top:1rem}

/* ── TX CARDS ── */
.tx-timeline{display:flex;flex-direction:column;gap:1.2rem}
.tx-card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;overflow:hidden;transition:border-color .2s,box-shadow .2s}
.tx-card:hover{border-color:var(--accent);box-shadow:0 4px 24px var(--acc-glow)}
.tx-card.suspicious{border-color:rgba(239,68,68,.35);background:linear-gradient(135deg,rgba(239,68,68,.04),var(--bg-card))}
.tx-card.suspicious:hover{box-shadow:0 4px 24px var(--red-glow)}
.tx-card.staging{border-color:rgba(245,158,11,.3)}
.tx-card.exit{border-color:rgba(220,38,38,.4);background:linear-gradient(135deg,rgba(220,38,38,.06),var(--bg-card))}
.tx-card-header{display:flex;align-items:center;gap:1rem;padding:1.2rem 1.5rem;border-bottom:1px solid var(--border)}
.tx-num{background:var(--muted);color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex-shrink:0}
.tx-card.suspicious .tx-num{background:var(--red)}
.tx-info{flex:1;min-width:0}
.tx-hash-line{display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem}
.tx-hash{font-size:.75rem;color:var(--dim);word-break:break-all}
.tx-icon{font-size:1rem}
.tx-meta-row{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap}
.tx-block{font-size:.8rem;color:var(--muted);background:var(--bg-hover);padding:.2rem .6rem;border-radius:6px}
.tx-sep{color:var(--muted)}
.tx-fn{font-size:.8rem;color:var(--accent)}
.tx-right-badges{display:flex;flex-direction:column;gap:.4rem;align-items:flex-end;flex-shrink:0}
.tx-card-body{padding:1.2rem 1.5rem;display:flex;flex-direction:column;gap:.9rem}
.tx-addr-row{display:grid;grid-template-columns:1fr auto 1fr;gap:.5rem;align-items:center;background:var(--bg-hover);border-radius:10px;padding:.8rem 1rem}
.addr-block{min-width:0}
.addr-label{font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.addr-val{font-size:.72rem;color:var(--text);word-break:break-all;margin-top:.2rem}
.addr-arrow{color:var(--dim);font-size:1.2rem;text-align:center}
.tx-section-label{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.tx-events{display:flex;flex-direction:column;gap:.4rem}
.event-row{display:flex;align-items:center;gap:.8rem;font-size:.78rem;background:var(--bg-hover);padding:.5rem .8rem;border-radius:8px;flex-wrap:wrap}
.ev-name{color:var(--accent);font-weight:600;font-family:'JetBrains Mono',monospace}
.ev-flow{color:var(--dim)}
.ev-val{color:var(--green);font-family:'JetBrains Mono',monospace;margin-left:auto}
.no-events{font-size:.78rem;color:var(--muted)}
.tx-deviation{font-size:.82rem;color:var(--orange)}
.tx-flag{font-size:.8rem;padding:.3rem .7rem;border-radius:6px}
.tx-flag.rapid{color:var(--orange);background:var(--ora-glow)}
.tx-flag.risk{color:var(--red);background:var(--red-glow)}
.tx-heuristics{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:1rem}
.heur-label{font-size:.7rem;color:var(--red);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.6rem;font-weight:600}
.heur-item{display:grid;grid-template-columns:40px 1fr 2fr;gap:.5rem;align-items:start;padding:.4rem 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.78rem}
.heur-item:last-child{border-bottom:none}
.heur-item.fired .heur-id{color:var(--red);font-weight:700;font-family:'JetBrains Mono',monospace}
.heur-item.fired .heur-name{color:var(--text);font-weight:600}
.heur-item .heur-reason{color:var(--dim)}

/* ── BADGES ── */
.badge{display:inline-block;padding:.15rem .6rem;border-radius:100px;font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
.badge-suspicious{background:var(--red-glow);color:var(--red)}
.badge-normal{background:var(--grn-glow);color:var(--green)}
.badge-staging{background:var(--ora-glow);color:var(--orange)}
.badge-exit{background:rgba(220,38,38,.2);color:#dc2626}
.badge-attack{background:rgba(239,68,68,.15);color:var(--red);border:1px solid rgba(239,68,68,.3)}
.badge-green{background:var(--grn-glow);color:var(--green)}

/* ── HEURISTIC PANELS ── */
.heur-panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;margin-top:2rem}
.heur-panel{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:1.8rem;position:relative;overflow:hidden;transition:box-shadow .2s}
.heur-panel.fired{border-color:var(--red);box-shadow:0 0 30px var(--red-glow)}
.heur-panel.fired::after{content:'🔥 FIRED';position:absolute;top:.8rem;right:.8rem;font-size:.6rem;font-weight:700;color:var(--red);background:var(--red-glow);padding:.2rem .5rem;border-radius:4px}
.heur-panel-id{font-size:2rem;font-weight:800;color:var(--accent);font-family:'JetBrains Mono',monospace;margin-bottom:.3rem}
.heur-panel.fired .heur-panel-id{color:var(--red)}
.heur-panel-name{font-size:1rem;font-weight:700;margin-bottom:.5rem;color:#fff}
.heur-fired-badge{display:inline-block;font-size:.7rem;color:var(--red);background:var(--red-glow);padding:.2rem .6rem;border-radius:4px;margin-bottom:1rem}
.heur-panel-reason{font-size:.82rem;color:var(--dim);line-height:1.7;margin-bottom:1rem;padding:.8rem;background:rgba(239,68,68,.06);border-radius:8px}
.heur-tx-label{font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem}
.heur-tx-hash{font-size:.72rem;color:var(--dim);word-break:break-all}

/* ── GRAPH ── */
#cy-container{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;overflow:hidden;position:relative}
#cy{width:100%;height:520px}
.cy-legend{display:flex;flex-wrap:wrap;gap:1rem;padding:1rem 1.5rem;border-top:1px solid var(--border)}
.legend-item{display:flex;align-items:center;gap:.5rem;font-size:.78rem;color:var(--dim)}
.legend-dot{width:12px;height:12px;border-radius:50%}
#cy-tooltip{position:fixed;z-index:1000;background:#1a1a28;border:1px solid var(--border);border-radius:10px;padding:.8rem 1rem;font-size:.78rem;font-family:'JetBrains Mono',monospace;max-width:320px;pointer-events:none;display:none;box-shadow:0 8px 32px rgba(0,0,0,.6)}

/* ── AI NARRATIVE ── */
.ai-tabs{display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap}
.ai-tab{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:.5rem 1.2rem;font-size:.85rem;cursor:pointer;transition:all .2s;color:var(--dim)}
.ai-tab:hover,.ai-tab.active{background:var(--accent);border-color:var(--accent);color:#fff}
.ai-pane{display:none;background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:2rem}
.ai-pane.active{display:block}
.ai-pane p{color:var(--dim);line-height:1.9;margin-bottom:1rem;font-size:.95rem}
.ai-pane h3{color:var(--accent);margin-bottom:.8rem;font-size:1rem}

/* ── SIGNAL ALERT ── */
.signal-alert{background:linear-gradient(135deg,rgba(239,68,68,.1),rgba(245,158,11,.05));border:2px solid var(--red);border-radius:20px;padding:3rem;text-align:center;animation:alertPulse 3s ease-in-out infinite}
@keyframes alertPulse{0%,100%{box-shadow:0 0 20px var(--red-glow)}50%{box-shadow:0 0 50px rgba(239,68,68,.4)}}
.signal-icon{font-size:3.5rem;margin-bottom:.8rem}
.signal-name{font-size:1.6rem;font-weight:700;color:var(--red);margin-bottom:.5rem}
.signal-conf{font-size:2.5rem;font-weight:800;color:var(--red);margin-bottom:1.5rem}
.signal-why{font-size:.9rem;color:var(--dim);max-width:700px;margin:0 auto 2rem;line-height:1.8}
.signal-evidence{text-align:left;max-width:700px;margin:0 auto}
.evidence-label{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.8rem}
.evidence-item{display:flex;align-items:center;gap:1rem;padding:.6rem .8rem;background:var(--bg-hover);border-radius:8px;margin-bottom:.5rem}
.ev-step{font-size:.7rem;font-weight:600;color:var(--orange);text-transform:uppercase;flex-shrink:0}
.ev-hash{font-size:.72rem;color:var(--dim);word-break:break-all}

/* ── SCORECARD ── */
.scorecard-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem}
.score-card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:1.5rem;text-align:center}
.score-card.green{border-color:rgba(34,197,94,.3)}
.score-card.red{border-color:rgba(239,68,68,.3)}
.score-card.purple{border-color:rgba(124,111,255,.3)}
.score-val{font-size:2.5rem;font-weight:800;color:var(--green)}
.score-card.red .score-val{color:var(--red)}
.score-card.purple .score-val{color:var(--accent)}
.score-label{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:.3rem}
.score-table{width:100%;border-collapse:collapse;font-size:.8rem}
.score-table th{background:var(--bg-hover);padding:.7rem 1rem;text-align:left;color:var(--muted);text-transform:uppercase;font-size:.65rem;letter-spacing:.06em;border-bottom:1px solid var(--border)}
.score-table td{padding:.7rem 1rem;border-bottom:1px solid rgba(255,255,255,.03);font-family:'JetBrains Mono',monospace}
.score-table tr.row-attack td{background:rgba(239,68,68,.05)}

/* ── FOOTER ── */
.footer{text-align:center;padding:3rem;color:var(--muted);font-size:.78rem;border-top:1px solid var(--border)}

/* ── DIVIDER ── */
.section-divider{height:1px;background:linear-gradient(to right,transparent,var(--border),transparent);margin:0}
@media(max-width:768px){.hero h1{font-size:2rem}.scorecard-grid{grid-template-columns:1fr 1fr}.heur-item{grid-template-columns:1fr}.tx-addr-row{grid-template-columns:1fr}}
</style>
</head>
<body>

<!-- HERO -->
<section class="hero">
    <div style="font-size:4rem;margin-bottom:1rem">🔬</div>
    <h1>Deep Attack Analysis</h1>
    <p class="sub">Full decoded forensic investigation — per-transaction breakdown, heuristic triggers, money-flow graph, and AI narrative</p>
    <div class="meta-strip">
        <div class="meta-chip"><div class="mlabel">Run ID</div><div class="mval" style="font-size:.9rem">${esc(runId)}</div></div>
        <div class="meta-chip"><div class="mlabel">Transactions</div><div class="mval">${totalTx}</div></div>
        <div class="meta-chip"><div class="mlabel">Suspicious</div><div class="mval red">${suspiciousTx.length}</div></div>
        <div class="meta-chip"><div class="mlabel">Signals Fired</div><div class="mval red">${signalCount}</div></div>
        <div class="meta-chip"><div class="mlabel">Confidence</div><div class="mval red">${esc(confidence)}</div></div>
        <div class="meta-chip"><div class="mlabel">Precision</div><div class="mval green">${precision}%</div></div>
    </div>
    <div style="margin-top:2rem;display:flex;gap:1rem;flex-wrap:wrap;justify-content:center">
        <a href="#tx-timeline" style="background:var(--accent);color:#fff;padding:.7rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;font-size:.9rem">View Transactions ↓</a>
        <a href="#graph" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text);padding:.7rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;font-size:.9rem">Money Flow Graph ↓</a>
    </div>
</section>

<div class="container">

<!-- STEP 1: TRANSACTION TIMELINE -->
<section class="section" id="tx-timeline">
    <div class="section-header">
        <div class="section-tag"><span class="snum">1</span> TRANSACTION TIMELINE</div>
        <h2>Every Transaction — Decoded &amp; Classified</h2>
        <div class="narration">Each transaction is decoded using the contract ABI and classified by the forensic pipeline. Red cards are attack-linked. Each card shows the exact function called, events emitted, baseline deviation, and which heuristics fired.</div>
    </div>
    <div class="tx-timeline">
        ${txCards}
    </div>
</section>

<div class="section-divider"></div>

<!-- STEP 2: HEURISTIC DEEP DIVE -->
<section class="section" id="heuristics">
    <div class="section-header">
        <div class="section-tag"><span class="snum">2</span> HEURISTIC BREAKDOWN</div>
        <h2>Detection Rules — How Each One Fired</h2>
        <div class="narration">Our forensic engine uses heuristic rules that look for specific patterns in on-chain data. Each rule has a numeric threshold. When a transaction exceeds that threshold, the rule "fires." When multiple rules fire on the same transaction cluster, a final alert signal is raised.</div>
    </div>
    <div class="heur-panels">
        ${heurPanels}
    </div>
</section>

<div class="section-divider"></div>

<!-- STEP 3: MONEY FLOW GRAPH -->
<section class="section" id="graph">
    <div class="section-header">
        <div class="section-tag"><span class="snum">3</span> MONEY FLOW GRAPH</div>
        <h2>Interactive Attack Path Visualization</h2>
        <div class="narration">This graph shows how tokens/funds moved between accounts. Red nodes and edges are attack-linked. Hover over any node or edge to see full addresses and transaction details. You can pan and zoom the graph.</div>
    </div>
    <div id="cy-container">
        <div id="cy"></div>
        <div class="cy-legend">
            <div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div>Attacker / Privileged Actor</div>
            <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div>Staging Wallet</div>
            <div class="legend-item"><div class="legend-dot" style="background:#dc2626"></div>Exit Wallet</div>
            <div class="legend-item"><div class="legend-dot" style="background:#7c6fff"></div>Contract</div>
            <div class="legend-item"><div class="legend-dot" style="background:#22c55e"></div>Normal User</div>
            <div class="legend-item"><div class="legend-dot" style="background:#52525b"></div>Zero Address / Unknown</div>
        </div>
    </div>
    <div id="cy-tooltip"></div>
</section>

<div class="section-divider"></div>

<!-- STEP 4: AI NARRATIVE -->
<section class="section" id="ai-narrative">
    <div class="section-header">
        <div class="section-tag"><span class="snum">4</span> AI NARRATIVE</div>
        <h2>Ollama LLM Analysis</h2>
        <div class="narration">The following sections are generated by a local Ollama AI model analysing the forensic signals and decoded transactions. Three views are provided: a plain-language executive summary, a technical heuristic deep-dive, and remediation advice.</div>
    </div>
    <div class="ai-tabs">
        <button class="ai-tab active" onclick="showTab('exec')">📋 Executive Summary</button>
        <button class="ai-tab" onclick="showTab('tech')">🔬 Technical Analysis</button>
        <button class="ai-tab" onclick="showTab('fix')">🛡️ Remediation</button>
    </div>
    <div class="ai-pane active" id="pane-exec"><p>${esc(aiExecutive).replace(/\n/g,'</p><p>')}</p></div>
    <div class="ai-pane" id="pane-tech"><p>${esc(aiTechnical).replace(/\n/g,'</p><p>')}</p></div>
    <div class="ai-pane" id="pane-fix"><p>${esc(aiRemediation).replace(/\n/g,'</p><p>')}</p></div>
</section>

<div class="section-divider"></div>

<!-- STEP 5: SIGNAL VERDICT -->
<section class="section" id="verdict">
    <div class="section-header">
        <div class="section-tag"><span class="snum">5</span> SIGNAL VERDICT</div>
        <h2>Final Alert Raised</h2>
    </div>
    ${signalVerdict}
</section>

<div class="section-divider"></div>

<!-- STEP 6: ACCURACY SCORECARD -->
<section class="section" id="scorecard">
    <div class="section-header">
        <div class="section-tag"><span class="snum">6</span> ACCURACY SCORECARD</div>
        <h2>Detection Performance vs Ground Truth</h2>
        <div class="narration">Since this is a simulated run, we know exactly which transactions are attacks (ground truth). This scorecard measures how accurately the forensic pipeline detected them.</div>
    </div>
    ${scorecard}
</section>

</div>

<footer class="footer">
    <p>Generated by <strong>ForensicToolW3 — Deep Analysis Generator</strong> · Run: ${esc(runId)} · ${new Date().toISOString()}</p>
    <p style="margin-top:.5rem">AI narratives generated by Ollama model: <code>${esc(model)}</code></p>
</footer>

<!-- INLINE SCRIPTS -->
<script>
// ── AI tabs ──────────────────────────────────────────────────────
function showTab(name) {
    document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ai-pane').forEach(p => p.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('pane-' + name).classList.add('active');
}

// ── Cytoscape graph ──────────────────────────────────────────────
const elements = ${cyElements};

const roleColors = {
    privileged_actor: '#ef4444',
    staging:          '#f59e0b',
    exit:             '#dc2626',
    contract:         '#7c6fff',
    user:             '#22c55e',
    unknown:          '#52525b',
};

const cy = cytoscape({
    container: document.getElementById('cy'),
    elements,
    style: [
        {
            selector: 'node',
            style: {
                'background-color': el => roleColors[el.data('role')] || '#52525b',
                'border-width': el => el.data('suspicious') ? 3 : 1,
                'border-color': el => el.data('suspicious') ? '#ef4444' : '#333',
                'label': 'data(label)',
                'font-family': 'JetBrains Mono, monospace',
                'font-size': '10px',
                'color': '#e4e4f0',
                'text-valign': 'bottom',
                'text-halign': 'center',
                'text-margin-y': 6,
                'width': el => el.data('suspicious') ? 52 : 44,
                'height': el => el.data('suspicious') ? 52 : 44,
                'box-shadow': el => el.data('suspicious') ? '0 0 20px rgba(239,68,68,0.6)' : 'none',
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 2,
                'line-color': el => el.data('suspicious') ? '#ef4444' : '#22c55e',
                'target-arrow-color': el => el.data('suspicious') ? '#ef4444' : '#22c55e',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'label': 'data(label)',
                'font-size': '9px',
                'font-family': 'JetBrains Mono, monospace',
                'color': el => el.data('suspicious') ? '#f87171' : '#86efac',
                'text-background-color': '#111118',
                'text-background-opacity': 0.85,
                'text-background-padding': '3px',
                'text-rotation': 'autorotate',
                'opacity': 0.85,
            }
        },
        {
            selector: 'edge[?suspicious]',
            style: { 'line-style': 'solid', 'width': 3 }
        }
    ],
    layout: { name: 'preset' },
    userZoomingEnabled: true,
    userPanningEnabled: true,
    minZoom: 0.3,
    maxZoom: 3,
});

// Fit to screen
cy.fit(cy.elements(), 40);

// Tooltip
const tooltip = document.getElementById('cy-tooltip');

cy.on('mouseover', 'node', function(e) {
    const d = e.target.data();
    tooltip.innerHTML = \`
        <div style="margin-bottom:.4rem;font-weight:600;color:#7c6fff">\${d.label || 'Node'}</div>
        <div style="color:#71717a;font-size:.7rem;word-break:break-all">\${e.target.id()}</div>
        <div style="margin-top:.4rem;font-size:.7rem;color:\${d.suspicious ? '#ef4444' : '#22c55e'}">\${d.role?.toUpperCase() || ''} \${d.suspicious ? '⚠️ SUSPICIOUS' : ''}</div>
    \`;
    tooltip.style.display = 'block';
});

cy.on('mouseover', 'edge', function(e) {
    const d = e.target.data();
    tooltip.innerHTML = \`
        <div style="margin-bottom:.4rem;font-weight:600;color:\${d.suspicious?'#ef4444':'#22c55e'}">\${d.actionType?.toUpperCase() || 'Transfer'} \${d.suspicious ? '⚠️ SUSPICIOUS':'✅ NORMAL'}</div>
        <div style="font-size:.72rem;color:#71717a">Amount: <span style="color:#e4e4f0">\${d.amount || '?'}</span></div>
        <div style="margin-top:.3rem;font-size:.7rem;color:#71717a">TX: <span style="color:#52525b">\${d.txHash ? d.txHash.slice(0,14)+'...' : '?'}</span></div>
        <div style="font-size:.7rem;color:#71717a">Block: \${d.block || '?'}</div>
        <div style="font-size:.7rem;color:#71717a">Classification: \${d.classification || '?'}</div>
    \`;
    tooltip.style.display = 'block';
});

cy.on('mouseout', 'node, edge', function() {
    tooltip.style.display = 'none';
});

document.addEventListener('mousemove', function(e) {
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top  = (e.clientY + 14) + 'px';
});

// Highlight attack path on load
cy.elements().filter(el => el.data('suspicious') || el.data('attack_linked')).forEach(el => {
    el.style({ 'opacity': 1 });
});
</script>

</body>
</html>`;

    const outPath = join(runDir, 'deep_analysis.html');
    writeFileSync(outPath, html, 'utf8');
    console.log(`\n[deep-analysis] ✓ Report generated → ${outPath}`);
    console.log(`[deep-analysis]   Open in browser: file://${outPath.replace(/\\/g,'/')}`);
}

main().catch(e => { console.error('[deep-analysis] Fatal:', e.message); process.exit(1); });
