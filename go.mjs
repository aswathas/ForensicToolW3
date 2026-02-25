#!/usr/bin/env node
/**
 * go.mjs — Master Automation Script
 *
 * Reads sim.config.js and runs the full pipeline:
 *   Step 1: Simulation  (Anvil + attacks + user noise)
 *   Step 2: Forensics   (raw import → derived → signals → ML → reports)
 *   Step 3: AI Summary  (Ollama local LLM — optional)
 *
 * Usage:
 *   npm run go                    ← uses sim.config.js
 *   node go.mjs --dry-run         ← shows what would run, doesn't execute
 *   node go.mjs --skip-sim        ← skip simulation, re-run forensics on last run
 *   node go.mjs --skip-ai         ← skip AI step
 */
import { execSync, spawn } from 'child_process';
import { existsSync, readdirSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = __dirname;

// ── Parse CLI flags ──────────────────────────────────────────────────
const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const SKIP_SIM = argv.includes('--skip-sim');
const SKIP_AI = argv.includes('--skip-ai');
const VERBOSE = argv.includes('--verbose');

// ── Load sim.config.js ───────────────────────────────────────────────
let cfg;
try {
    const mod = await import('./sim.config.js');
    cfg = mod.default;
} catch (e) {
    console.error('[go] ✗ Could not load sim.config.js:', e.message);
    process.exit(1);
}

// ── Banner ───────────────────────────────────────────────────────────
const LINE = '═'.repeat(62);
console.log(`\n${LINE}`);
console.log(`  EVM Forensics — Full Pipeline Automation`);
console.log(`  Config: sim.config.js`);
console.log(LINE);
console.log(`  Users       : ${cfg.numUsers}`);
console.log(`  Txs/user    : ${cfg.txsPerUser} (×2 = deposit+withdraw)`);
console.log(`  Attacks     : ${cfg.numAttacks} (${Object.entries(cfg.attacks).filter(([, v]) => v).map(([k]) => k).join(', ')})`);
console.log(`  Est. txs    : ~${cfg.numUsers * cfg.txsPerUser * 2 + cfg.numAttacks + 10}`);
console.log(`  AI enabled  : ${cfg.ai.enabled && !SKIP_AI ? `yes (${cfg.ai.model})` : 'no'}`);
console.log(`  Dry run     : ${DRY_RUN ? 'YES — nothing will execute' : 'no'}`);
console.log(LINE);

if (DRY_RUN) {
    console.log('\n[go] DRY RUN — exiting without executing anything.');
    process.exit(0);
}

// ── Helper: run a command and stream output ──────────────────────────
function run(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        console.log(`\n[go] $ ${cmd} ${args.join(' ')}`);
        const proc = spawn(cmd, args, {
            cwd: ROOT,
            stdio: 'inherit',
            shell: true,
            ...opts,
        });
        proc.on('close', code => {
            if (code !== 0 && !opts.allowFail) {
                reject(new Error(`Command exited with code ${code}`));
            } else {
                resolve(code);
            }
        });
        proc.on('error', reject);
    });
}

// ── Helper: find the most recent run directory ───────────────────────
function findLatestRun() {
    const runsDir = join(ROOT, cfg.output.baseDir);
    if (!existsSync(runsDir)) return null;
    const runs = readdirSync(runsDir)
        .filter(d => d.startsWith('run_'))
        .map(d => {
            const path = join(runsDir, d);
            return { name: d, path, time: statSync(path).mtimeMs };
        })
        .sort((a, b) => b.time - a.time);
    return runs.length > 0 ? runs[0] : null;
}

// ── Build CLI args for sim_runner from sim.config.js ─────────────────
function buildSimArgs() {
    const enabledAttacks = Object.values(cfg.attacks).filter(Boolean).length;
    return [
        'scripts/simulations/sim_runner.mjs',
        '--scenario', 'reentrancy',
        '--num-users', String(cfg.numUsers),
        '--user-txs', String(cfg.txsPerUser),
        '--num-attackers', String(enabledAttacks),
        '--repeat', '1',
        '--accounts', String(cfg.anvil.accounts),
        '--balance', String(cfg.anvil.balance),
        '--depth', String(cfg.attackParams.attack1_depth),
    ];
}

// ── Write a run summary file ─────────────────────────────────────────
function writeRunSummary(runDir, simResult, forensicsResult) {
    const summary = {
        generated_at: new Date().toISOString(),
        config: {
            numUsers: cfg.numUsers,
            txsPerUser: cfg.txsPerUser,
            numAttacks: cfg.numAttacks,
            enabledAttacks: Object.entries(cfg.attacks).filter(([, v]) => v).map(([k]) => k),
        },
        sim: simResult,
        forensics: forensicsResult,
        paths: {
            rawData: join(runDir, 'client', '01_raw'),
            forensicBundle: join(runDir, 'forensic_bundle', '02_forensic_bundle'),
            report: join(runDir, 'forensic_bundle', '02_forensic_bundle', '05_reports', 'forensic_report.md'),
            aiSummary: join(runDir, 'forensic_bundle', '02_forensic_bundle', '06_ai', 'ai_executive_summary.md'),
            mlFeatures: join(runDir, 'forensic_bundle', '02_forensic_bundle', '05_ml_features', 'ml_features_000001.ndjson'),
        },
    };
    writeFileSync(join(runDir, 'run_summary.json'), JSON.stringify(summary, null, 2));
    return summary;
}

// ════════════════════════════════════════════════════════════════════
// STEP 1: SIMULATION
// ════════════════════════════════════════════════════════════════════
let runDir;

if (SKIP_SIM) {
    console.log('\n[go] ── Step 1: SKIPPING simulation (--skip-sim) ──');
    const latest = findLatestRun();
    if (!latest) {
        console.error('[go] ✗ No existing run found in ./runs/. Cannot skip simulation.');
        process.exit(1);
    }
    runDir = latest.path;
    console.log(`[go] Using latest run: ${latest.name}`);
} else {
    console.log('\n[go] ══ Step 1/3: Running Simulation ══════════════════════');
    console.log(`[go] Target: ~${cfg.numUsers * cfg.txsPerUser * 2 + cfg.numAttacks + 10} txs`);
    console.log(`[go] ${cfg.numUsers} users | 1 attacker | ${cfg.numAttacks} attacks`);

    // Kill any existing Anvil
    try { execSync('Stop-Process -Name "anvil" -Force -ErrorAction SilentlyContinue', { shell: 'powershell' }); } catch (_) { }
    await new Promise(r => setTimeout(r, 1000));

    const simArgs = buildSimArgs();
    const simStart = Date.now();
    await run('node', simArgs);
    const simDuration = ((Date.now() - simStart) / 1000).toFixed(1);

    // Find the run that was just created
    const latest = findLatestRun();
    if (!latest) {
        console.error('[go] ✗ Simulation completed but no run directory found.');
        process.exit(1);
    }
    runDir = latest.path;
    console.log(`\n[go] ✓ Simulation done in ${simDuration}s → ${latest.name}`);
}

// ════════════════════════════════════════════════════════════════════
// STEP 2: FORENSICS
// ════════════════════════════════════════════════════════════════════
console.log('\n[go] ══ Step 2/3: Running Forensics ═══════════════════════');

const rawRoot = join(runDir, 'client', '01_raw');
const forensicBundleDir = join(runDir, 'forensic_bundle');

if (!existsSync(rawRoot)) {
    console.error(`[go] ✗ Raw data not found at: ${rawRoot}`);
    console.error('[go]   Did the simulation complete successfully?');
    process.exit(1);
}

mkdirSync(forensicBundleDir, { recursive: true });

const forensicsStart = Date.now();
await run('node', [
    'src/index.js',
    '--mode', 'raw_import',
    '--raw-root', rawRoot,
    '--output-dir', forensicBundleDir,
]);
const forensicsDuration = ((Date.now() - forensicsStart) / 1000).toFixed(1);
console.log(`\n[go] ✓ Forensics done in ${forensicsDuration}s`);

// ════════════════════════════════════════════════════════════════════
// STEP 3: AI SUMMARY (optional)
// ════════════════════════════════════════════════════════════════════
if (cfg.ai.enabled && !SKIP_AI) {
    console.log('\n[go] ══ Step 3/3: AI Summary (Ollama) ═════════════════════');
    console.log(`[go] Model: ${cfg.ai.model} | URL: ${cfg.ai.ollamaUrl}`);
    console.log('[go] This may take 30-90s on CPU...');

    const aiStart = Date.now();
    const aiCode = await run('node', [
        'src/ai/ollama_analyst.js',
        '--bundle-dir', forensicBundleDir,
        '--model', cfg.ai.model,
    ], { allowFail: true });
    const aiDuration = ((Date.now() - aiStart) / 1000).toFixed(1);

    if (aiCode === 0) {
        console.log(`\n[go] ✓ AI summary done in ${aiDuration}s`);

        // ── STEP 4: MANAGER STORYBOARD ──────────────────────────────────
        console.log('\n[go] ══ Step 4: Manager Storyboard ════════════════════════');
        const sbStart = Date.now();
        await run('node', ['src/ai/storyboard_generator.js', '--bundle-dir', forensicBundleDir], { allowFail: true });
        const sbDuration = ((Date.now() - sbStart) / 1000).toFixed(1);
        console.log(`\n[go] ✓ Storyboard generated in ${sbDuration}s`);
    }
} else {
    console.log('\n[go] ── Step 3/3: AI Summary SKIPPED ──');
    console.log('[go]   To enable: set ai.enabled=true in sim.config.js');
    console.log(`[go]   To run manually: node src/ai/ollama_analyst.js --bundle-dir "${forensicBundleDir}"`);
}

// ── STEP 5: GRAPH VISUALIZATION ────────────────────────────────
console.log('\n[go] ══ Step 5: Generating Graph Visualizations ═══════════════');
const dotScript = join(__dirname, 'src', 'graphs', 'dot_exporter.js');
const graphsDir = join(forensicBundleDir, '02_forensic_bundle', '07_graphs');
const vizDir = join(graphsDir, 'viz');

if (existsSync(graphsDir) && existsSync(dotScript)) {
    // We export specific subgraphs
    const subgraphs = ['execution_graph', 'fund_flow_graph', 'incident_subgraph'];
    for (const sub of subgraphs) {
        const inputPath = join(graphsDir, sub);
        if (existsSync(inputPath)) {
            await run('node', ['src/graphs/dot_exporter.js', '--input', inputPath, '--output', vizDir], { allowFail: true });
        }
    }
}

// ════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ════════════════════════════════════════════════════════════════════
const runName = runDir.split(/[\\/]/).pop();
const reportPath = join(forensicBundleDir, '02_forensic_bundle', '05_reports', 'forensic_report.md');
const aiPath = join(forensicBundleDir, '02_forensic_bundle', '06_ai', 'ai_executive_summary.md');
const mlPath = join(forensicBundleDir, '02_forensic_bundle', '05_ml_features', 'ml_features_000001.ndjson');
const signalsPath = join(forensicBundleDir, '02_forensic_bundle', '03_signals', 'signals_000001.ndjson');

writeRunSummary(runDir, { completed: true }, { completed: true });

console.log(`\n${LINE}`);
console.log(`  ✓ PIPELINE COMPLETE`);
console.log(LINE);
console.log(`  Run ID      : ${runName}`);
console.log(`  Run folder  : ${runDir}`);
console.log(LINE);
console.log(`  KEY OUTPUT FILES:`);
console.log(`  📊 Forensic report  : ${reportPath}`);
console.log(`  🤖 AI summary       : ${aiPath}`);
console.log(`  🧠 ML features      : ${mlPath}`);
console.log(`  🚨 Signals          : ${signalsPath}`);
console.log(LINE);
console.log(`\n  HOW TO VIEW RESULTS:`);
console.log(`  1. Open the forensic report:`);
console.log(`     ${reportPath}`);
console.log(`\n  2. Check signals coverage:`);
console.log(`     ${join(forensicBundleDir, '02_forensic_bundle', '03_signals', '_meta', 'signals_coverage_report.json')}`);
console.log(`\n  3. Check ML high-suspicion txs:`);
console.log(`     ${join(forensicBundleDir, '02_forensic_bundle', '05_ml_features', 'top_suspicious_txs.ndjson')}`);
console.log(`\n  4. Re-run AI summary (if Ollama wasn't running):`);
console.log(`     ollama serve`);
console.log(`     ollama pull ${cfg.ai.model}`);
console.log(`     node src/ai/ollama_analyst.js --bundle-dir "${forensicBundleDir}"`);
console.log(LINE + '\n');
