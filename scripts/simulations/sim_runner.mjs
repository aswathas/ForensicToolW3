#!/usr/bin/env node
/**
 * sim_runner.mjs — Main Simulation Entry Point
 *
 * Usage:
 *   node scripts/simulations/sim_runner.mjs [options]
 *
 * Options:
 *   --scenario <name>       Scenario to run (default: reentrancy)
 *   --num-attackers <n>     Number of attacker wallets
 *   --num-users <n>         Number of innocent user wallets
 *   --user-txs <n>          Innocent txs per user per round
 *   --repeat <n>            Times to repeat each attack
 *   --depth <n>             Reentrancy recursion depth
 *   --accounts <n>          Total Anvil accounts
 *   --balance <n>           ETH balance per account
 *
 * Output:
 *   runs/run_<id>/
 *     client/               Raw blockchain data (for client delivery)
 *       01_raw/             NDJSON files
 *       run_meta.json
 *     forensic_bundle/      Forensics analysis output
 */

import { startAnvil, stopAnvil } from './base/anvil_utils.mjs';
import { compileAll } from './base/compile.mjs';
import { deployMarker, emitRunStart, emitRunEnd } from './base/marker.mjs';
import { exportRawBundle } from './base/export_raw.mjs';
import { getSigners } from './base/deploy_utils.mjs';
import { runScenario } from './scenarios/scenario_reentrancy/run.mjs';
import { SIM_CONFIG, applyCliOverrides } from './sim_config.mjs';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { ethers } from 'ethers';
import crypto from 'crypto';

// ── Load user-facing sim.config.js and merge into SIM_CONFIG ─────────
// sim.config.js lives at project root and is the file users edit.
// It overrides the internal SIM_CONFIG defaults.
async function loadUserConfig(simConfig) {
    const userCfgPath = resolve('./sim.config.js');
    if (!existsSync(userCfgPath)) return simConfig; // no user config, use defaults
    try {
        // On Windows, dynamic import requires file:// URL for absolute paths
        const importUrl = process.platform === 'win32' ? `file://${userCfgPath.replace(/\\/g, '/')}` : userCfgPath;
        const mod = await import(importUrl + '?t=' + Date.now()); // bust cache
        const u = mod.default;
        // Merge user config into SIM_CONFIG
        if (u.numUsers !== undefined) simConfig.simulation.numUsers = u.numUsers;
        if (u.txsPerUser !== undefined) simConfig.simulation.numUserTxsPerRound = u.txsPerUser;
        if (u.numAttacks !== undefined) simConfig.simulation.numAttackers = Math.min(u.numAttacks, 5);
        if (u.anvil) Object.assign(simConfig.anvil, u.anvil);
        if (u.gas) Object.assign(simConfig.gas, u.gas);
        if (u.output) Object.assign(simConfig.output, u.output);
        if (u.attackParams) {
            const p = u.attackParams;
            if (p.attack1_ethValue) simConfig.attacks.attack1_attackValue = p.attack1_ethValue;
            if (p.attack1_depth) simConfig.attacks.attack1_maxDepth = p.attack1_depth;
            if (p.attack2_ethValue) simConfig.attacks.attack2_attackValue = p.attack2_ethValue;
            if (p.attack2_prefund) simConfig.attacks.attack2_prefund = p.attack2_prefund;
            if (p.attack3_ethValue) simConfig.attacks.attack3_attackValue = p.attack3_ethValue;
            if (p.attack4_ethValue) simConfig.attacks.attack4_attackValue = p.attack4_ethValue;
            if (p.attack5_ethValue) simConfig.attacks.attack5_attackValue = p.attack5_ethValue;
        }
        if (u.victimFunding) {
            const v = u.victimFunding;
            if (v.vault1) simConfig.attacks.attack1_depositPerUser = v.vault1;
            if (v.vault2) simConfig.attacks.attack2_depositPerUser = v.vault2;
            if (v.readOnly) simConfig.attacks.attack3_depositPerUser = v.readOnly;
            if (v.erc777) simConfig.attacks.attack4_depositPerUser = v.erc777;
            if (v.flashPool) simConfig.attacks.attack5_flashPoolFund = v.flashPool;
            if (v.flashVictim) simConfig.attacks.attack5_victimFund = v.flashVictim;
            if (v.dex) simConfig.attacks.attack5_dexFund = v.dex;
        }
        // Also store which attacks are enabled for run.mjs to use
        if (u.attacks) simConfig.enabledAttacks = u.attacks;
        console.log('[runner] Loaded sim.config.js — user config applied');
    } catch (e) {
        console.warn('[runner] Warning: could not load sim.config.js:', e.message);
    }
    return simConfig;
}

const SCENARIOS = {
    reentrancy: {
        name: 'reentrancy',
        contractDirs: [
            'scripts/simulations/base/contracts',
            'scripts/simulations/scenarios/scenario_reentrancy/contracts',
        ],
        runner: runScenario,
    },
    market_manipulation: {
        name: 'market_manipulation',
        contractDirs: [
            'scripts/simulations/base/contracts',
            'scripts/simulations/scenarios/scenario_reentrancy/contracts', // Reuse FlashloanContracts
            'scripts/simulations/scenarios/scenario_market_manipulation',
        ],
        // Dynamic import runner wrapper
        runner: async (...args) => {
            const mod = await import('./scenarios/scenario_market_manipulation/run.mjs');
            return mod.runScenario(...args);
        }
    },
};

async function main() {
    const argv = process.argv.slice(2);
    const scenarioIdx = argv.indexOf('--scenario');
    const scenarioName = scenarioIdx !== -1 ? argv[scenarioIdx + 1] : 'reentrancy';
    const scenarioCfg = SCENARIOS[scenarioName];
    if (!scenarioCfg) {
        console.error(`Unknown scenario: ${scenarioName}. Available: ${Object.keys(SCENARIOS).join(', ')}`);
        process.exit(1);
    }

    // Apply user config (sim.config.js) then CLI overrides
    let cfg = await loadUserConfig(SIM_CONFIG);
    cfg = applyCliOverrides(cfg, argv);

    const runId = crypto.randomBytes(8).toString('hex');

    // ── Output folder structure ──────────────────────────────────────
    // runs/run_<id>/client/        ← raw data for client
    // runs/run_<id>/forensic_bundle/ ← analysis (filled by forensics tool)
    const baseRunDir = resolve(join(cfg.output.baseDir, `run_${runId}`));
    const clientDir = join(baseRunDir, 'client');
    const rawDir = join(clientDir, '01_raw');
    const forensicBundleDir = join(baseRunDir, 'forensic_bundle');

    mkdirSync(rawDir, { recursive: true });
    mkdirSync(forensicBundleDir, { recursive: true });

    console.log(`\n${'═'.repeat(64)}`);
    console.log(`  EVM Forensics Agent — Simulation Runner`);
    console.log(`  Scenario  : ${scenarioName}`);
    console.log(`  Run ID    : ${runId}`);
    console.log(`  Attackers : ${cfg.simulation.numAttackers}`);
    console.log(`  Users     : ${cfg.simulation.numUsers}`);
    console.log(`  Repeats   : ${cfg.simulation.attackRepeatCount}x per attack type`);
    console.log(`  User txs  : ${cfg.simulation.numUserTxsPerRound} per round`);
    console.log(`  Output    : ${baseRunDir}`);
    console.log(`${'═'.repeat(64)}\n`);

    let anvilProc = null;
    let provider = null;

    try {
        // ── Step 1: Start Anvil ────────────────────────────────────────
        console.log('[runner] Step 1/6: Starting Anvil...');
        const anvil = await startAnvil({
            port: cfg.anvil.port,
            accounts: cfg.anvil.accounts,
            balance: cfg.anvil.balance,
        });
        anvilProc = anvil.proc;
        provider = new ethers.JsonRpcProvider(anvil.rpcUrl);
        const actualAccounts = await provider.listAccounts();
        console.log(`[runner] Anvil ready at ${anvil.rpcUrl} | Requested: ${cfg.anvil.accounts}, Actual: ${actualAccounts.length}`);
        if (actualAccounts.length < cfg.anvil.accounts) {
            console.error(`[runner] CRITICAL: Anvil started with fewer accounts than requested (${actualAccounts.length} vs ${cfg.anvil.accounts}). Transactions will fail.`);
            throw new Error('Anvil account count mismatch. Verify anvil binary supports --accounts flag.');
        }
        console.log(`[runner] Accounts verified. Balance check: ${await provider.getBalance(actualAccounts[0])} wei`);

        // ── Step 2: Compile contracts ──────────────────────────────────
        console.log('\n[runner] Step 2/6: Compiling contracts...');
        const artifactsDir = join(baseRunDir, 'artifacts');
        mkdirSync(artifactsDir, { recursive: true });
        const projectRoot = resolve('.');
        await compileAll(scenarioCfg.contractDirs.map(d => join(projectRoot, d)), artifactsDir);
        console.log('[runner] Compilation complete');

        // ── Step 3: Deploy marker + emit RunStart ──────────────────────
        console.log('\n[runner] Step 3/6: Deploying forensics marker...');
        const signers = await getSigners(provider, cfg.anvil.accounts);
        const deployer = signers[0];
        const { contract: markerContract, address: markerAddr } = await deployMarker(deployer, artifactsDir);
        const startBlock = await provider.getBlockNumber();
        const { runIdBytes } = await emitRunStart(markerContract, runId, scenarioName);
        console.log(`[runner] RunStart emitted at block ${startBlock}`);

        // ── Step 4: Run scenario ───────────────────────────────────────
        console.log('\n[runner] Step 4/6: Running scenario...');
        const scenarioResult = await scenarioCfg.runner(provider, artifactsDir, cfg, signers);
        const endBlock = await provider.getBlockNumber();
        await emitRunEnd(markerContract, runIdBytes);
        console.log(`[runner] RunEnd emitted at block ${endBlock}`);
        console.log(`[runner] Block range: ${startBlock} → ${endBlock} (${endBlock - startBlock} blocks)`);

        // ── Step 5: Export raw bundle ──────────────────────────────────
        console.log('\n[runner] Step 5/6: Exporting raw data bundle...');
        await exportRawBundle(provider, startBlock, endBlock, clientDir);

        // ── Step 6: Write run metadata ─────────────────────────────────
        const runMeta = {
            run_id: runId,
            scenario: scenarioName,
            started_at: new Date().toISOString(),
            config: cfg,
            block_range: { from: startBlock, to: endBlock },
            attacks: scenarioResult.results,
            contracts: scenarioResult.contracts,
            output: {
                client_dir: clientDir,
                forensic_bundle_dir: forensicBundleDir,
                raw_dir: rawDir,
            },
        };
        writeFileSync(join(clientDir, 'run_meta.json'), JSON.stringify(runMeta, null, 2));
        writeFileSync(join(baseRunDir, 'run_meta.json'), JSON.stringify(runMeta, null, 2));

        const succeeded = scenarioResult.results.filter(r => r.status === 'ok').length;
        const total = scenarioResult.results.length;

        console.log(`\n${'═'.repeat(64)}`);
        console.log(`  ✓ Simulation complete!`);
        console.log(`  Attacks   : ${succeeded}/${total} succeeded`);
        console.log(`  Blocks    : ${startBlock} → ${endBlock}`);
        console.log(`  Run ID    : ${runId}`);
        console.log(`  Client    : ${clientDir}`);
        console.log(`  Forensics : ${forensicBundleDir}`);
        console.log(`${'═'.repeat(64)}`);
        console.log(`\n  To analyze with forensics tool:`);
        console.log(`  node src/index.js --mode raw_import --raw-root "${rawDir}" --output-dir "${forensicBundleDir}"`);
        console.log('');

    } catch (err) {
        console.error('\n[runner] FATAL:', err.message);
        console.error(err.stack);
        process.exitCode = 1;
    } finally {
        if (anvilProc) {
            stopAnvil(anvilProc);
            console.log('[anvil] Stopped.');
        }
    }
    process.exit(process.exitCode || 0);
}

main();
