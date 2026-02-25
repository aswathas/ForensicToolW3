/**
 * run.mjs — Scenario: market_manipulation
 *
 * Simulates a "pump and dump" style market manipulation using flashloans.
 * 
 * Flow:
 * 1. Users trade on SimpleDex, establishing a baseline price.
 * 2. Attacker borrows huge ETH via Flashloan.
 * 3. Attacker buys massive amount of tokens on Dex (price bumps up).
 * 4. Attacker exploits FlashloanVictim (which uses Dex spot price) to borrow inflated amount.
 * 5. Attacker swaps tokens back to ETH (dumps) to repay flashloan.
 * 6. Attacker profits or causes insolvency in Victim.
 */
import { ethers } from 'ethers';
import { deployContract, fundAddress, mineBlocks } from '../../base/deploy_utils.mjs';
import { readFileSync } from 'fs';
import { join } from 'path';

function loadArtifact(artifactsDir, name) {
    const path = join(artifactsDir, `${name}.json`);
    return JSON.parse(readFileSync(path, 'utf8'));
}

function eth(amount) { return ethers.parseEther(String(amount)); }

// ── Realistic user noise: Random swaps on DEX ────────────────────────
async function runUserTrading(users, dex, batchSize) {
    let txCount = 0;
    for (const user of users) {
        for (let i = 0; i < batchSize; i++) {
            try {
                // Randomly buy or sell small amounts
                const isBuy = Math.random() > 0.5;
                if (isBuy) {
                    // Buy tokens with ETH
                    const val = eth((Math.random() * 0.5 + 0.1).toFixed(2)); // 0.1 - 0.6 ETH
                    const tx = await dex.contract.connect(user).swapEthForTokens({ value: val });
                    await tx.wait();
                    txCount++;
                } else {
                    // Sell tokens (skip for now as we didn't approve/mint for users)
                    // simplified: just buy more to simulate volume
                    const val = eth('0.1');
                    const tx = await dex.contract.connect(user).swapEthForTokens({ value: val });
                    await tx.wait();
                    txCount++;
                }
            } catch (_) { /* ignore failures */ }
        }
    }
    return txCount;
}

// ── Deploy contracts ─────────────────────────────────────────────────
async function deploySystem(deployer, artifactsDir, cfg) {
    const system = {};

    // 1. Flashloan Pool
    const poolArt = loadArtifact(artifactsDir, 'FlashloanPool');
    const { contract: pool, address: poolAddr } = await deployContract(deployer, poolArt, [], 'FlashloanPool');
    system.pool = { contract: pool, address: poolAddr };

    // 2. SimpleDex (with initial liquidity)
    const dexArt = loadArtifact(artifactsDir, 'SimpleDex');
    const dexFactory = new ethers.ContractFactory(dexArt.abi, dexArt.bytecode, deployer);
    // Deploy with 100 ETH liquidity
    const dexContract = await dexFactory.deploy({ value: eth('100') });
    await dexContract.waitForDeployment();
    const dexAddr = await dexContract.getAddress();
    system.dex = { contract: dexContract, address: dexAddr };
    console.log(`  [deploy] SimpleDex → ${dexAddr}`);

    // 3. Victim Protocol (uses Dex oracle)
    const victimArt = loadArtifact(artifactsDir, 'FlashloanVictim');
    const { contract: victim, address: victimAddr } = await deployContract(deployer, victimArt, [dexAddr], 'FlashloanVictim');
    system.victim = { contract: victim, address: victimAddr };

    return system;
}

// ── Main Scenario ────────────────────────────────────────────────────
export async function runScenario(provider, artifactsDir, cfg, allSigners) {
    const NUM_USERS = cfg.simulation.numUsers || 10;
    const NUM_ATTACKS = cfg.simulation.numAttackers || 5;

    // Signer allocation
    const deployer = allSigners[0];
    const users = allSigners.slice(1, 1 + NUM_USERS);
    const attacker = allSigners[1 + NUM_USERS];

    console.log(`\n[scenario] ═══════════════════════════════════════════════`);
    console.log(`[scenario] Scenario: Market Manipulation (Flashloan Pump & Dump)`);
    console.log(`[scenario] Users    : ${NUM_USERS}`);
    console.log(`[scenario] Attacker : ${await attacker.getAddress()}`);
    console.log(`[scenario] ═══════════════════════════════════════════════`);

    const results = [];

    // 1. Deploy & Fund
    console.log('\n[scenario] Deploying system...');
    const sys = await deploySystem(deployer, artifactsDir, cfg);

    // Fund FlashPool (so it can lend)
    await fundAddress(deployer, sys.pool.address, 1000); // 1000 ETH liquidity
    await sys.pool.contract.connect(deployer).deposit({ value: eth('500') });

    // Fund Victim (so it can lend out)
    await fundAddress(deployer, sys.victim.address, 200);

    // Attacker deploys their exploit contract
    console.log('\n[scenario] Deploying attacker contract...');
    const atkArt = loadArtifact(artifactsDir, 'Attacker5_Flashloan');
    const { contract: atk, address: atkAddr } = await deployContract(
        attacker, atkArt,
        [sys.pool.address, sys.dex.address, sys.victim.address],
        'Attacker5_Flashloan'
    );
    // Attacker deposits collateral to victim (required to borrow later)
    await (await sys.victim.contract.connect(attacker).depositCollateral({ value: eth('5') })).wait();

    // ── PHASE 1: Normal Trading ──────────────────────────────────────
    const totalSets = cfg.simulation.numUserTxsPerRound;
    const phase1Sets = Math.floor(totalSets / 2);
    const phase3Sets = totalSets - phase1Sets;

    console.log(`\n[scenario] ── Phase 1: Baseline Market Activity ──`);
    if (phase1Sets > 0) {
        const count = await runUserTrading(users, sys.dex, phase1Sets);
        console.log(`[scenario] Phase 1: ${count} trades`);
    }
    await mineBlocks(provider, 2);

    // ── PHASE 2: The Attack (Pump & Dump) ────────────────────────────
    console.log(`\n[scenario] ── Phase 2: Execution ──`);

    // We run the attack multiple times if requested, but usually once is enough for this scenario.
    // If repeat is requested, we do it, but market state might stay manipulated.
    const attacksToRun = Math.min(NUM_ATTACKS, 5);

    for (let i = 0; i < attacksToRun; i++) {
        console.log(`\n[scenario] Attack run ${i + 1}/${attacksToRun}...`);

        // Interleaved noise
        await runUserTrading(users, sys.dex, 1);

        try {
            // Run the attack function
            // 20 ETH attack value = amount to swap/manipulate with
            const tx = await atk.attack({
                value: eth('20'),
                gasLimit: 3_000_000
            });
            const receipt = await tx.wait();

            results.push({
                attack: 'flashloan_manipulation',
                tx: receipt.hash,
                attacker: atkAddr,
                victim: sys.victim.address,
                status: 'ok'
            });
            console.log(`  ✓ Attack successful: ${receipt.hash}`);
        } catch (e) {
            console.error(`  ✗ Attack failed: ${e.message.slice(0, 100)}...`);
            results.push({ attack: 'flashloan_manipulation', status: 'failed', error: e.message });
        }
        await mineBlocks(provider, 2);
    }

    // ── PHASE 3: Post-Attack Activity ────────────────────────────────
    console.log(`\n[scenario] ── Phase 3: Post-Crash Activity ──`);
    if (phase3Sets > 0) {
        const count = await runUserTrading(users, sys.dex, phase3Sets);
        console.log(`[scenario] Phase 3: ${count} trades`);
    }

    // Drain remaining sets if any (conceptually similar to reentrancy fix)
    // Here we just ensured pure math split above, but if logic changes:
    // while (setsRun < totalSets) { ... }

    return {
        results,
        contracts: {
            dex: sys.dex.address,
            pool: sys.pool.address,
            victim: sys.victim.address
        }
    };
}
