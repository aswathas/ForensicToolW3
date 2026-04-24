/**
 * ollama_analyst.js — Local LLM Forensic Narrative Generator
 *
 * Uses Ollama (local) to generate an AI executive summary from forensic findings.
 * Designed for low-spec laptops: uses phi3:mini or tinyllama by default.
 *
 * Usage:
 *   node src/ai/ollama_analyst.js --bundle-dir ./runs/run_xxx/forensic_bundle
 *
 * Requires Ollama running: `ollama serve`
 * Model: `ollama pull phi3:mini`  (2.3GB, fast on CPU)
 *   OR:  `ollama pull tinyllama`  (637MB, fastest)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
// phi3:mini = best quality/size ratio for forensics (2.3GB)
// tinyllama = fastest, lowest RAM (637MB) — use if phi3 is too slow
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'phi3:mini';

// ── Ollama API call ────────────────────────────────────────────────────
async function ollamaGenerate(model, prompt, timeoutMs = 120_000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: {
                    temperature: 0.2,   // low temp = more factual
                    num_predict: 600,   // max tokens — keep short for speed
                    top_p: 0.9,
                },
            }),
            signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return data.response?.trim() || '';
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') throw new Error(`Ollama timed out after ${timeoutMs / 1000}s`);
        throw err;
    }
}

// ── Check Ollama is running ────────────────────────────────────────────
async function checkOllama(model) {
    try {
        const res = await fetch(`${OLLAMA_URL}/api/tags`);
        if (!res.ok) throw new Error('not running');
        const data = await res.json();
        const models = (data.models || []).map(m => m.name);
        const available = models.some(m => m.startsWith(model.split(':')[0]));
        return { running: true, available, models };
    } catch {
        return { running: false, available: false, models: [] };
    }
}

// ── Build forensic prompt ──────────────────────────────────────────────
function buildPrompt(report, topSignals, mlSummary) {
    const incidentSummary = report.incidents.map((inc, i) =>
        `Incident ${i + 1}: ${inc.tx_count} txs, severity=${inc.severity}, rules=[${inc.rules_fired.slice(0, 4).join(', ')}]`
    ).join('\n');

    const signalSummary = topSignals.map(s =>
        `- ${s.rule_id} (${s.confidence}): ${JSON.stringify(s.details).slice(0, 120)}`
    ).join('\n');

    return `You are a blockchain forensic analyst. Analyze this EVM transaction data and write a concise executive summary.

FORENSIC DATA:
- Transactions analyzed: ${report.summary.txs_analyzed}
- Total signals fired: ${report.summary.total_signals}
- Rules triggered: ${report.summary.rules_fired.join(', ')}
- Incidents detected: ${report.summary.incidents}

INCIDENTS:
${incidentSummary || 'None'}

TOP SIGNALS (sample):
${signalSummary}

ML ANALYSIS:
- Feature vectors: ${mlSummary.feature_count || 0}
- High-suspicion txs: ${mlSummary.top_suspicious_count || 0}
- State diff features available: ${mlSummary.state_diff_features?.length || 0}

Write a 3-paragraph executive summary:
1. What attack type(s) were detected and how confident are you?
2. What evidence supports this (specific signals and state changes)?
3. What immediate actions should the security team take?

Be specific, concise, and factual. Do not speculate beyond the data.`;
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
    const args = process.argv.slice(2);
    const getBundleDir = () => {
        const i = args.indexOf('--bundle-dir');
        return i !== -1 ? args[i + 1] : null;
    };
    const model = args[args.indexOf('--model') + 1] || DEFAULT_MODEL;

    const bundleDir = getBundleDir();
    if (!bundleDir) {
        console.error('Usage: node src/ai/ollama_analyst.js --bundle-dir <path> [--model phi3:mini]');
        process.exit(1);
    }

    const aiDir = join(bundleDir, '02_forensic_bundle', '06_ai');
    mkdirSync(aiDir, { recursive: true });

    console.log(`\n[ollama] Checking Ollama at ${OLLAMA_URL}...`);
    const status = await checkOllama(model);

    if (!status.running) {
        const msg = [
            '# AI Executive Summary — Ollama Not Running',
            '',
            '> **Ollama is not running.** Start it with: `ollama serve`',
            '> Then pull a model: `ollama pull phi3:mini` (recommended, 2.3GB)',
            '> Or for faster/lighter: `ollama pull tinyllama` (637MB)',
            '',
            '## How to Set Up',
            '',
            '1. Install Ollama: https://ollama.ai',
            '2. Run: `ollama serve`',
            '3. Pull model: `ollama pull phi3:mini`',
            '4. Re-run: `node src/ai/ollama_analyst.js --bundle-dir ' + bundleDir + '`',
        ].join('\n');
        writeFileSync(join(aiDir, 'ai_executive_summary.md'), msg);
        console.warn('[ollama] ⚠ Ollama not running. Instructions written to ai_executive_summary.md');
        return;
    }

    if (!status.available) {
        console.warn(`[ollama] ⚠ Model '${model}' not found. Available: ${status.models.join(', ')}`);
        console.warn(`[ollama]   Run: ollama pull ${model}`);
        // Try fallback to any available model
        const fallback = status.models[0];
        if (!fallback) {
            console.error('[ollama] No models available. Pull one first.');
            return;
        }
        console.log(`[ollama] Falling back to: ${fallback}`);
    }

    const activeModel = status.available ? model : status.models[0];
    console.log(`[ollama] ✓ Using model: ${activeModel}`);

    // Load forensic data
    const reportPath = join(bundleDir, '02_forensic_bundle', '05_reports', 'forensic_report.json');
    const mlSchemaPath = join(bundleDir, '02_forensic_bundle', '05_ml_features', 'ml_feature_schema.json');
    const signalsPath = join(bundleDir, '02_forensic_bundle', '03_signals', 'signals_000001.ndjson');

    if (!existsSync(reportPath)) {
        console.error(`[ollama] forensic_report.json not found at ${reportPath}`);
        console.error('[ollama] Run the forensics tool first: node src/index.js ...');
        process.exit(1);
    }

    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const mlSchema = existsSync(mlSchemaPath) ? JSON.parse(readFileSync(mlSchemaPath, 'utf8')) : {};

    // Load top HIGH-confidence signals as context
    const topSignals = existsSync(signalsPath)
        ? readFileSync(signalsPath, 'utf8')
            .trim().split('\n').filter(Boolean)
            .map(l => { try { return JSON.parse(l); } catch { return null; } })
            .filter(s => s && s.confidence === 'HIGH')
            .slice(0, 8)
        : [];

    console.log(`[ollama] Loaded: ${report.summary.txs_analyzed} txs, ${topSignals.length} HIGH signals`);
    console.log(`[ollama] Generating narrative (this may take 30-90s on CPU)...`);

    const prompt = buildPrompt(report, topSignals, mlSchema);

    let narrative;
    try {
        narrative = await ollamaGenerate(activeModel, prompt, 180_000);
    } catch (err) {
        console.error(`[ollama] Generation failed: ${err.message}`);
        narrative = `[AI generation failed: ${err.message}]\n\nRun manually: ollama run ${activeModel}`;
    }

    // Write output
    const now = new Date().toISOString();
    const output = [
        `# AI Executive Summary`,
        ``,
        `**Generated**: ${now}`,
        `**Model**: ${activeModel}`,
        `**Ollama URL**: ${OLLAMA_URL}`,
        ``,
        `---`,
        ``,
        narrative,
        ``,
        `---`,
        ``,
        `*Generated by EVM Forensics Agent — AI Analyst Module*`,
        `*Data source: ${reportPath}*`,
    ].join('\n');

    writeFileSync(join(aiDir, 'ai_executive_summary.md'), output);

    // Also write structured JSON for programmatic use
    writeFileSync(join(aiDir, 'ai_analysis.json'), JSON.stringify({
        generated_at: now,
        model: activeModel,
        narrative,
        input_summary: {
            txs_analyzed: report.summary.txs_analyzed,
            signals_fired: report.summary.total_signals,
            incidents: report.summary.incidents,
            high_signals_used: topSignals.length,
        },
    }, null, 2));

    console.log(`[ollama] ✓ AI summary written to ${aiDir}`);
    console.log(`\n${'─'.repeat(60)}`);
    console.log(narrative);
    console.log(`${'─'.repeat(60)}\n`);
}

main().catch(err => {
    console.error('[ollama] FATAL:', err.message);
    process.exit(1);
});
