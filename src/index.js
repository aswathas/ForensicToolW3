#!/usr/bin/env node
/**
 * src/index.js — Forensics Tool Entry Point
 *
 * Usage:
 *   node src/index.js --mode raw_import --raw-root ./evidence_run_xxx/01_raw
 *   node src/index.js --mode rpc_live --rpc-url http://127.0.0.1:8545 --window markers_onchain
 */
import { parseArgs } from './cli/args.js';
import { resolveWindow } from './ingestion/window_resolver.js';
import { collectRaw } from './ingestion/raw_collector.js';
import { runDerivedPipeline } from './derived/pipeline.js';
import { runSignalsEngine } from './signals/engine.js';
import { runIncidentClusterer } from './incidents/clusterer.js';
import { runGraphBuilder } from './graphs/builder.js';
import { runReportGenerator } from './reports/generator.js';
import { writeManifest } from './integrity/manifest.js';
import { extractMlFeatures } from './ml/ml_features.js';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const runId = args.runId || crypto.randomBytes(6).toString('hex');
    const outputDir = args.outputDir || `./forensics_output_${runId}`;
    mkdirSync(outputDir, { recursive: true });

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  EVM Forensics Agent (Enterprise)`);
    console.log(`  Mode   : ${args.mode}`);
    console.log(`  Run ID : ${runId}`);
    console.log(`  Output : ${outputDir}`);
    console.log(`${'═'.repeat(60)}\n`);

    const runMeta = {
        run_id: runId,
        mode: args.mode,
        started_at: new Date().toISOString(),
        args,
    };

    // ── Step 1: Resolve block window ───────────────────────────────
    console.log('[forensics] Step 1/7: Resolving block window...');
    const window = await resolveWindow(args);
    console.log(`[forensics] Window: blocks ${window.fromBlock} → ${window.toBlock}`);
    runMeta.window = window;

    // ── Step 2: Collect raw data ───────────────────────────────────
    console.log('\n[forensics] Step 2/7: Collecting raw data...');
    const rawData = await collectRaw(args, window, outputDir);
    console.log(`[forensics] Raw: ${rawData.txCount} txs, ${rawData.logCount} logs, ${rawData.traceCount} traces, ${rawData.stateDiffCount ?? 0} state_diffs`);

    // ── Step 3: Derived pipeline ───────────────────────────────────
    console.log('\n[forensics] Step 3/7: Running derived pipeline (36 datasets)...');
    const derived = await runDerivedPipeline(rawData, outputDir);
    console.log(`[forensics] Derived: ${Object.keys(derived).length} datasets produced`);

    // ── Step 4: Signals engine ─────────────────────────────────────
    console.log('\n[forensics] Step 4/7: Evaluating 28 signal rules...');
    const signals = await runSignalsEngine(derived, rawData, outputDir);
    console.log(`[forensics] Signals: ${signals.totalFired} signal events fired`);

    // ── Step 4.5: ML Feature Extraction ───────────────────────────
    console.log('\n[forensics] Step 4.5/7: Extracting ML features (state diffs + traces + signals)...');
    const mlResult = await extractMlFeatures(rawData, derived, signals, outputDir);
    console.log(`[forensics] ML: ${mlResult.features.length} feature vectors | ${mlResult.topSuspicious.length} high-suspicion txs`);

    // ── Step 5: Incident clustering ────────────────────────────────
    console.log('\n[forensics] Step 5/7: Clustering incidents...');
    const incidents = await runIncidentClusterer(signals, derived, outputDir);
    console.log(`[forensics] Incidents: ${incidents.length} clusters found`);

    // ── Step 6: Graph builder ──────────────────────────────────────
    console.log('\n[forensics] Step 6/7: Building graphs...');
    await runGraphBuilder(derived, incidents, outputDir);

    // ── Step 7: Reports ────────────────────────────────────────────
    console.log('\n[forensics] Step 7/7: Generating reports...');
    await runReportGenerator(signals, incidents, derived, rawData, outputDir);

    // ── Integrity manifest ─────────────────────────────────────────
    runMeta.completed_at = new Date().toISOString();
    writeFileSync(join(outputDir, 'run_meta.json'), JSON.stringify(runMeta, null, 2));
    await writeManifest(outputDir);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ✓ Forensics complete!`);
    console.log(`  Signals fired : ${signals.totalFired}`);
    console.log(`  Incidents     : ${incidents.length}`);
    console.log(`  ML features   : ${mlResult.features.length} txs (${mlResult.topSuspicious.length} high-suspicion)`);
    console.log(`  Output        : ${outputDir}`);
    console.log(`${'═'.repeat(60)}\n`);
}

main().catch((err) => {
    console.error('\n[forensics] FATAL:', err.message);
    console.error(err.stack);
    process.exit(1);
});
