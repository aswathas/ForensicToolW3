/**
 * ingest_raw.js — Standalone Raw Data Ingestion Tool
 *
 * Usage:
 *   node ingest_raw.js --input <path_to_raw_data_folder_or_zip>
 *
 * This script:
 * 1. Validates the raw data structure (chain/, txs/, traces/, state/)
 * 2. Runs the full Forensics Pipeline on it
 * 3. Runs the AI Analyst on the result
 * 4. Generates the Manager Storyboard
 */
import { existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, resolve, basename } from 'path';
import { spawn } from 'child_process';

const ROOT = resolve('.');

async function runCommand(cmd, args) {
    console.log(`\n[ingest] $ ${cmd} ${args.join(' ')}`);
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, { stdio: 'inherit', shell: true, cwd: ROOT });
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command exited with code ${code}`));
        });
        proc.on('error', reject);
    });
}

async function main() {
    const args = process.argv.slice(2);
    const inputIdx = args.indexOf('--input');
    if (inputIdx === -1) {
        console.error('Usage: node ingest_raw.js --input <path_to_raw_data>');
        process.exit(1);
    }

    let rawPath = resolve(args[inputIdx + 1]);

    // Quick validation
    if (!existsSync(rawPath)) {
        console.error(`Error: Input path not found: ${rawPath}`);
        process.exit(1);
    }

    // If it's a folder, check if it has the right subfolders, or deep search
    // We expect: chain/, txs/, traces/, state/
    // If missing, maybe they are deeper?
    if (!existsSync(join(rawPath, 'txs')) && !existsSync(join(rawPath, 'chain'))) {
        console.log('⚠ Root folder does not look like raw data root. Searching deeper...');
        // Simple 1-level deep search
        const subdirs = readdirSync(rawPath).filter(d => statSync(join(rawPath, d)).isDirectory());
        const found = subdirs.find(d => existsSync(join(rawPath, d, 'txs')));
        if (found) {
            rawPath = join(rawPath, found);
            console.log(`✓ Found raw data at: ${rawPath}`);
        } else {
            console.error('Error: Could not find valid raw data structure (txs/, chain/, traces/)');
            console.error('Expected structure:');
            console.error('  root/');
            console.error('    ├── chain/ (block_headers_*.ndjson)');
            console.error('    ├── txs/   (transactions_raw_*.ndjson)');
            process.exit(1);
        }
    }

    const runId = `import_${Date.now().toString(36)}`;
    const outputDir = join(ROOT, 'runs', `run_${runId}`);
    const forensicBundleDir = join(outputDir, 'forensic_bundle');

    console.log(`\n══ EVM Forensics: Raw Data Ingestion ════════════════════════`);
    console.log(`Input  : ${rawPath}`);
    console.log(`Run ID : ${runId}`);
    console.log(`Output : ${outputDir}`);
    console.log(`═════════════════════════════════════════════════════════════`);

    mkdirSync(outputDir, { recursive: true });

    // 1. Run Forensics
    try {
        console.log('\n[ingest] ── Step 1: Running Forensics Pipeline ──');
        await runCommand('node', [
            'src/index.js',
            '--mode', 'raw_import',
            '--raw-root', `"${rawPath}"`,
            '--output-dir', `"${forensicBundleDir}"`
        ]);

        // 2. Run AI Analyst
        console.log('\n[ingest] ── Step 2: Running AI Analyst ──');
        // Check if ollama is running? We'll just try and allow fail
        try {
            await runCommand('node', [
                'src/ai/ollama_analyst.js',
                '--bundle-dir', `"${forensicBundleDir}"`,
                '--model', 'gemma3:1b' // Default or make configurable
            ]);
        } catch (e) {
            console.log('⚠ AI Analyst failed (Ollama running?), skipping.');
        }

        // 3. Run Storyboard
        console.log('\n[ingest] ── Step 3: Generating Manager Storyboard ──');
        try {
            await runCommand('node', [
                'src/ai/storyboard_generator.js',
                '--bundle-dir', `"${forensicBundleDir}"`
            ]);
        } catch (e) {
            console.log('⚠ Storyboard generation failed.');
        }

        // 4. Generate Graphs
        console.log('\n[ingest] ── Step 4: Generating Graphs ──');
        const dotScript = join(__dirname, 'src', 'graphs', 'dot_exporter.js');
        const visualDir = join(forensicBundleDir, '02_forensic_bundle', '07_graphs');
        const viz = join(visualDir, 'viz');

        if (existsSync(visualDir)) {
            const subgraphs = ['execution_graph', 'fund_flow_graph', 'incident_subgraph'];
            for (const sub of subgraphs) {
                const p = join(visualDir, sub);
                if (existsSync(p)) {
                    await runCommand('node', [dotScript, '--input', `"${p}"`, '--output', `"${viz}"`]);
                }
            }
        }

        console.log(`\n✅ Ingestion Complete!`);
        console.log(`Results at: ${forensicBundleDir}`);

    } catch (err) {
        console.error(`\n❌ Ingestion Failed: ${err.message}`);
        process.exit(1);
    }
}

main();
