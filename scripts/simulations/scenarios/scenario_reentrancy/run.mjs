/**
 * run.mjs — Scenario: reentrancy
 *
 * TARGET: ~100 transactions total
 *   - 10 users × ~9 txs each  = ~90 user noise txs
 *   - 1 attacker × 5 attacks  =   5 attack txs
 *   - deploy + funding txs    =  ~5 setup txs
 *   ─────────────────────────────────────────────
 *   Total                     = ~100 txs
 *
 * The 5 attack txs are interleaved randomly in the user noise.
 * The forensics tool must find exactly those 5 from ~100.
 *
 * No attack labels are emitted on-chain — the tool must discover them.
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

// ── Realistic user noise: varied deposit/withdraw/transfer patterns ──
// Each user does a mix of: deposit, withdraw, re-deposit — realistic DeFi activity
async function runUserBatch(users, vaults, batchSize) {
    let txCount = 0;
    for (const user of users) {
        for (let i = 0; i < batchSize; i++) {
            const vault = vaults[i % vaults.length];
            try {
                // Deposit
                const dep = await vault.connect(user).deposit({ value: eth('1') });
                await dep.wait();
                txCount++;

                // Withdraw half (realistic partial withdrawal)
                const userAddr = await user.getAddress();
                const bal = await vault.balances(userAddr);
                if (bal > 0n) {
                    const half = bal / 2n;
                    if (half > 0n) {
                        const wd = await vault.connect(user).withdraw(half);
                        await wd.wait();
                        txCount++;
                    }
                }
            } catch (_) { /* ignore user tx failures */ }
        }
    }
    return txCount;
}

// ── Deploy all victim contracts ──────────────────────────────────────
async function deployVictims(deployer, artifactsDir, cfg) {
    const victims = {};

    const vault1Art = loadArtifact(artifactsDir, 'VaultVictim');
    const { contract: vault1, address: vault1Addr } = await deployContract(deployer, vault1Art, [], 'VaultVictim');
    victims.vault1 = { contract: vault1, address: vault1Addr };

    const vault2Art = loadArtifact(artifactsDir, 'TokenVaultVictim');
    const { contract: vault2, address: vault2Addr } = await deployContract(deployer, vault2Art, [], 'TokenVaultVictim');
    victims.vault2 = { contract: vault2, address: vault2Addr };

    const readOnlyArt = loadArtifact(artifactsDir, 'ReadOnlyVictim');
    const { contract: readOnly, address: readOnlyAddr } = await deployContract(deployer, readOnlyArt, [], 'ReadOnlyVictim');
    victims.readOnly = { contract: readOnly, address: readOnlyAddr };

    const dependentArt = loadArtifact(artifactsDir, 'DependentProtocol');
    const { contract: dependent, address: dependentAddr } = await deployContract(deployer, dependentArt, [readOnlyAddr], 'DependentProtocol');
    victims.dependent = { contract: dependent, address: dependentAddr };

    const erc777Art = loadArtifact(artifactsDir, 'ERC777VaultVictim');
    const { contract: erc777, address: erc777Addr } = await deployContract(deployer, erc777Art, [], 'ERC777VaultVictim');
    victims.erc777 = { contract: erc777, address: erc777Addr };

    const flashPoolArt = loadArtifact(artifactsDir, 'FlashloanPool');
    const { contract: flashPool, address: flashPoolAddr } = await deployContract(deployer, flashPoolArt, [], 'FlashloanPool');
    victims.flashPool = { contract: flashPool, address: flashPoolAddr };

    const dexArt = loadArtifact(artifactsDir, 'SimpleDex');
    const dexFactory = new ethers.ContractFactory(dexArt.abi, dexArt.bytecode, deployer);
    const dexContract = await dexFactory.deploy({ value: eth(cfg.attacks.attack5_dexFund) });
    await dexContract.waitForDeployment();
    const dexAddr = await dexContract.getAddress();
    victims.dex = { contract: dexContract, address: dexAddr };
    console.log(`  [deploy] SimpleDex → ${dexAddr}`);

    const flashVictimArt = loadArtifact(artifactsDir, 'FlashloanVictim');
    const { contract: flashVictim, address: flashVictimAddr } = await deployContract(deployer, flashVictimArt, [dexAddr], 'FlashloanVictim');
    victims.flashVictim = { contract: flashVictim, address: flashVictimAddr };

    return victims;
}

// ── Fund all victim contracts ────────────────────────────────────────
async function fundVictims(funder, victims, cfg) {
    const a = cfg.attacks;
    // Direct ETH top-up for contract balances
    await fundAddress(funder, victims.vault1.address, 50);
    await fundAddress(funder, victims.vault2.address, 50);
    await fundAddress(funder, victims.readOnly.address, 50);
    await fundAddress(funder, victims.erc777.address, 50);
    await fundAddress(funder, victims.flashVictim.address, Number(a.attack5_victimFund));

    // Internal accounting via deposit functions
    console.log('[fund] Depositing to vault1...');
    await (await victims.vault1.contract.connect(funder).deposit({ value: eth(a.attack1_depositPerUser) })).wait();
    console.log('[fund] Depositing to vault2...');
    await (await victims.vault2.contract.connect(funder).deposit({ value: eth(a.attack2_depositPerUser) })).wait();
    console.log('[fund] Depositing to readOnly...');
    await (await victims.readOnly.contract.connect(funder).deposit({ value: eth(a.attack3_depositPerUser) })).wait();
    console.log('[fund] Depositing to erc777...');
    await (await victims.erc777.contract.connect(funder).depositTokens({ value: eth(a.attack4_depositPerUser) })).wait();

    // Fund flashloan pool
    console.log('[fund] Depositing to flashPool...');
    await (await victims.flashPool.contract.connect(funder).deposit({ value: eth(a.attack5_flashPoolFund) })).wait();
    console.log('[fund] Funding complete');
}

// ════════════════════════════════════════════════════════════════════
// ATTACK FUNCTIONS — all use the SAME attacker wallet
// ════════════════════════════════════════════════════════════════════

async function runAttack1(attacker, victims, artifactsDir, cfg) {
    const art = loadArtifact(artifactsDir, 'Attacker1_Basic');
    const { contract: atk, address: atkAddr } = await deployContract(
        attacker, art, [victims.vault1.address], 'Attacker1_Basic'
    );
    await (await atk.setMaxDepth(cfg.attacks.attack1_maxDepth)).wait();
    const tx = await atk.attack({
        value: eth(cfg.attacks.attack1_attackValue),
        gasLimit: cfg.gas.attackGasLimit,
    });
    const receipt = await tx.wait();
    return { attack: 'classic_reentrancy', tx: receipt.hash, attacker: atkAddr, victim: victims.vault1.address, status: 'ok' };
}

async function runAttack2(attacker, victims, artifactsDir, cfg) {
    const art = loadArtifact(artifactsDir, 'Attacker2_CrossFunc');
    const { contract: atk, address: atkAddr } = await deployContract(
        attacker, art, [victims.vault2.address], 'Attacker2_CrossFunc'
    );
    await fundAddress(attacker, atkAddr, Number(cfg.attacks.attack2_prefund));
    const tx = await atk.attack({
        value: eth(cfg.attacks.attack2_attackValue),
        gasLimit: cfg.gas.attackGasLimit,
    });
    const receipt = await tx.wait();
    return { attack: 'cross_func_reentrancy', tx: receipt.hash, attacker: atkAddr, victim: victims.vault2.address, status: 'ok' };
}

async function runAttack3(attacker, victims, artifactsDir, cfg) {
    const art = loadArtifact(artifactsDir, 'Attacker3_ReadOnly');
    const { contract: atk, address: atkAddr } = await deployContract(
        attacker, art, [victims.readOnly.address, victims.dependent.address], 'Attacker3_ReadOnly'
    );
    const attackVal = Math.max(Number(cfg.attacks.attack3_attackValue), 3);
    const tx = await atk.attack({
        value: eth(attackVal),
        gasLimit: cfg.gas.attackGasLimit,
    });
    const receipt = await tx.wait();
    return { attack: 'readonly_reentrancy', tx: receipt.hash, attacker: atkAddr, victim: victims.readOnly.address, status: 'ok' };
}

async function runAttack4(attacker, victims, artifactsDir, cfg) {
    const art = loadArtifact(artifactsDir, 'Attacker4_ERC777');
    const { contract: atk, address: atkAddr } = await deployContract(
        attacker, art, [victims.erc777.address], 'Attacker4_ERC777'
    );
    // Setup: register hook, then deposit tokens into victim first so victim has balance to withdraw
    await (await atk.setup()).wait();
    // Ensure victim has enough ETH for the double-withdraw
    await fundAddress(attacker, victims.erc777.address, 20);
    const tx = await atk.attack({
        value: eth(cfg.attacks.attack4_attackValue),
        gasLimit: cfg.gas.attackGasLimit,
    });
    const receipt = await tx.wait();
    return { attack: 'erc777_hook_reentrancy', tx: receipt.hash, attacker: atkAddr, victim: victims.erc777.address, status: 'ok' };
}

async function runAttack5(attacker, victims, artifactsDir, cfg) {
    const art = loadArtifact(artifactsDir, 'Attacker5_Flashloan');
    const { contract: atk, address: atkAddr } = await deployContract(
        attacker, art,
        [victims.flashPool.address, victims.dex.address, victims.flashVictim.address],
        'Attacker5_Flashloan'
    );
    // Deposit collateral into FlashloanVictim so borrowAgainstCollateral has something to work with
    await (await victims.flashVictim.contract.connect(attacker).depositCollateral({ value: eth('5') })).wait();
    const tx = await atk.attack({
        value: eth(cfg.attacks.attack5_attackValue),
        gasLimit: cfg.gas.attackGasLimit,
    });
    const receipt = await tx.wait();
    return { attack: 'flashloan_price_manip', tx: receipt.hash, attacker: atkAddr, victim: victims.flashVictim.address, status: 'ok' };
}

const ATTACK_FNS = [runAttack1, runAttack2, runAttack3, runAttack4, runAttack5];
const ATTACK_NAMES = ['classic_reentrancy', 'cross_func_reentrancy', 'readonly_reentrancy', 'erc777_hook_reentrancy', 'flashloan_price_manip'];

// ════════════════════════════════════════════════════════════════════
// MAIN SCENARIO ENTRY POINT
// Target: ~100 txs total = 5 attack txs + ~95 user noise txs
// ════════════════════════════════════════════════════════════════════
export async function runScenario(provider, artifactsDir, cfg, allSigners) {
    const NUM_USERS = cfg.simulation.numUsers || 10;
    const NUM_ATTACKS = cfg.simulation.numAttackers || 5;
    const USER_BATCHES = 3;     // 3 batches of user activity (before, between, after attacks)
    // Each user does: deposit + partial_withdraw = 2 txs per batch
    // 10 users × 2 txs × 3 batches = 60 user txs
    // Plus funding deposits (10 txs) + deploy txs (~10) + attack txs (5) ≈ 85-100 total

    // Signer allocation:
    // [0]       = deployer/funder
    // [1..10]   = 10 innocent users
    // [11]      = THE attacker (1 wallet, 5 attacks)
    const deployer = allSigners[0];
    const users = allSigners.slice(1, 1 + NUM_USERS);
    const attacker = allSigners[1 + NUM_USERS]; // single attacker wallet

    // Which attacks to run — respects sim.config.js attacks.{name}: true/false
    const enabledMap = cfg.enabledAttacks || {
        classic_reentrancy: true,
        cross_func_reentrancy: true,
        readonly_reentrancy: true,
        erc777_hook: true,
        flashloan_price_manip: true,
    };
    const attacksToRun = ATTACK_FNS
        .map((fn, i) => ({ fn, name: ATTACK_NAMES[i], key: Object.keys(enabledMap)[i] }))
        .filter(a => enabledMap[a.key] !== false);

    const attackerAddr = await attacker.getAddress();
    console.log(`\n[scenario] ═══════════════════════════════════════════════`);
    console.log(`[scenario] TARGET: ~100 txs | ${NUM_USERS} users | 1 attacker | ${attacksToRun.length} attacks`);
    console.log(`[scenario] Deployer : ${await deployer.getAddress()}`);
    console.log(`[scenario] Users    : ${NUM_USERS} wallets (indices 1-${NUM_USERS})`);
    console.log(`[scenario] Attacker : ${attackerAddr} (1 wallet, ${attacksToRun.length} attack types)`);
    console.log(`[scenario] Attacks  : ${attacksToRun.map(a => a.name).join(', ')}`);
    console.log(`[scenario] ═══════════════════════════════════════════════`);

    const results = [];

    // ── Deploy victim contracts ──────────────────────────────────────
    console.log('\n[scenario] Deploying victim contracts...');
    const victims = await deployVictims(deployer, artifactsDir, cfg);
    console.log('[scenario] All victims deployed');

    // ── Initial funding ──────────────────────────────────────────────
    console.log('\n[scenario] Funding victim contracts...');
    await fundVictims(deployer, victims, cfg);
    console.log('[scenario] Victims funded');
    await mineBlocks(provider, 2);

    const userVaults = [victims.vault1.contract, victims.vault2.contract];

    // ── PHASE 1: User noise BEFORE any attacks (establishes baseline) ─
    const totalSets = cfg.simulation.numUserTxsPerRound;
    const phase1Sets = totalSets > 0 ? 1 : 0;
    const phase3Sets = totalSets > 1 ? 1 : 0;
    const phase2Available = Math.max(0, totalSets - phase1Sets - phase3Sets);
    let phase2SetsRun = 0;

    console.log(`\n[scenario] ── Phase 1: User activity (pre-attack baseline) ──`);
    console.log(`[scenario] ${NUM_USERS} users × ${phase1Sets} batches × 2 txs = ${NUM_USERS * phase1Sets * 2} txs`);
    let phase1Count = 0;
    if (phase1Sets > 0) {
        phase1Count = await runUserBatch(users, userVaults, phase1Sets);
    }
    console.log(`[scenario] Phase 1 complete: ${phase1Count} txs`);
    await mineBlocks(provider, 2);

    // ── PHASE 2: Attacks interleaved with user noise ──────────────────
    // Pattern: [user batch] → [attack] → [user batch] → [attack] → ...
    console.log(`\n[scenario] ── Phase 2: Attacks interleaved with user noise ──`);
    console.log(`[scenario] Distributing ${phase2Available} batches across ${attacksToRun.length} attack gaps`);

    for (let atkIdx = 0; atkIdx < attacksToRun.length; atkIdx++) {
        const { fn: attackFn, name: attackName } = attacksToRun[atkIdx];

        // Distribute remaining budget across attack gaps
        // We have phase2Available sets to spread over attacksToRun.length gaps
        // Simple logic: if phase2SetsRun < phase2Available, run a set
        if (phase2SetsRun < phase2Available) {
            console.log(`[scenario] ... interleaved user batch ...`);
            await runUserBatch(users, userVaults, 1);
            phase2SetsRun++;
            await mineBlocks(provider, 1);
        }

        // Execute attack
        console.log(`\n[scenario] Attack ${atkIdx + 1}/${attacksToRun.length}: ${attackName}`);
        try {
            const result = await attackFn(attacker, victims, artifactsDir, cfg);
            results.push(result);
            console.log(`  ✓ ATTACK SUCCESS | tx: ${result.tx}`);
            console.log(`    attacker: ${result.attacker}`);
            console.log(`    victim:   ${result.victim}`);
        } catch (e) {
            const errMsg = e.message.slice(0, 300);
            console.error(`  ✗ ATTACK FAILED: ${errMsg}`);
            results.push({ attack: attackName, status: 'failed', error: errMsg });
        }
        await mineBlocks(provider, 2);
    }

    // ── PHASE 2.5: Drain remaining Phase 2 sets ──────────────────────
    // If we have more user batches than attacks, we need to run them now
    // to reach the target transaction count.
    while (phase2SetsRun < phase2Available) {
        console.log(`[scenario] ... draining extra user batch (${phase2SetsRun + 1}/${phase2Available}) ...`);
        await runUserBatch(users, userVaults, 1);
        phase2SetsRun++;
        await mineBlocks(provider, 1);
    }

    // ── PHASE 3: User noise AFTER attacks (covers attacker's tracks) ──
    console.log(`\n[scenario] ── Phase 3: User activity (post-attack cover) ──`);
    console.log(`[scenario] ${NUM_USERS} users × ${phase3Sets} batches × 2 txs = ${NUM_USERS * phase3Sets * 2} txs`);
    let phase3Count = 0;
    if (phase3Sets > 0) {
        phase3Count = await runUserBatch(users, userVaults, phase3Sets);
    }
    console.log(`[scenario] Phase 3 complete: ${phase3Count} txs`);
    await mineBlocks(provider, 2);

    // ── Summary ──────────────────────────────────────────────────────
    const succeeded = results.filter(r => r.status === 'ok').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log(`\n[scenario] ═══════════════════════════════════════════════`);
    console.log(`[scenario] SIMULATION COMPLETE`);
    console.log(`[scenario] Attacks: ${succeeded}/${NUM_ATTACKS} succeeded, ${failed} failed`);
    console.log(`[scenario] Ground truth attack txs:`);
    for (const r of results) {
        if (r.status === 'ok') {
            console.log(`  ✓ [${r.attack}] ${r.tx}`);
        } else {
            console.log(`  ✗ [${r.attack}] FAILED`);
        }
    }
    console.log(`[scenario] ═══════════════════════════════════════════════`);

    return {
        results,
        groundTruth: {
            attackTxHashes: results.filter(r => r.status === 'ok').map(r => r.tx),
            attackerAddress: attackerAddr,
            attackCount: NUM_ATTACKS,
            succeededCount: succeeded,
        },
        contracts: {
            vault1: victims.vault1.address,
            vault2: victims.vault2.address,
            readOnlyVault: victims.readOnly.address,
            dependent: victims.dependent.address,
            erc777Vault: victims.erc777.address,
            flashPool: victims.flashPool.address,
            dex: victims.dex.address,
            flashVictim: victims.flashVictim.address,
        },
    };
}
