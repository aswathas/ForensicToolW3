/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  sim.config.js — MASTER SIMULATION CONFIGURATION            ║
 * ║                                                              ║
 * ║  This is the ONLY file you need to edit.                    ║
 * ║  After editing, run:  npm run go                            ║
 * ║  That single command will:                                   ║
 * ║    1. Run the simulation (Anvil + attacks + user noise)      ║
 * ║    2. Run the forensics tool on the output                   ║
 * ║    3. Generate AI summary (if Ollama is running)             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

export default {

    // ── HOW MANY TRANSACTIONS TO GENERATE ───────────────────────────
    // Total txs ≈ (numUsers × txsPerUser × 2) + numAttacks + setupTxs
    // Target: ~50 txs
    // 5 users × 5 txs = 25 sets × 2 = 50 transactions + 1 attack
    numUsers: 5,
    txsPerUser: 5,
    numAttacks: 1,    // 1 attack transaction

    // ── ATTACK CONFIGURATION ─────────────────────────────────────────
    // Which attacks to enable (set to false to skip)
    attacks: {
        classic_reentrancy: true,
        cross_func_reentrancy: true,
        readonly_reentrancy: true,
        erc777_hook: true,
        flashloan_price_manip: true,
    },

    // ── ATTACK PARAMETERS ────────────────────────────────────────────
    attackParams: {
        attack1_ethValue: '3',
        attack1_depth: 3,
        attack2_ethValue: '3',
        attack2_prefund: '10',
        attack3_ethValue: '3',
        attack4_ethValue: '3',
        attack5_ethValue: '2',
    },

    // ── VICTIM FUNDING ───────────────────────────────────────────────
    // Increased funding to prevent reverts during long runs (10k txs)
    victimFunding: {
        vault1: '10000',
        vault2: '10000',
        readOnly: '10000',
        erc777: '10000',
        flashPool: '100000',
        flashVictim: '10000',
        dex: '10000',
    },

    // ── ANVIL SETTINGS ───────────────────────────────────────────────
    anvil: {
        port: 8545,
        accounts: 60,       // Needed for 50 users + deployer + attacker
        balance: 1_000_000, // 1 Million ETH per account
    },

    // ── OUTPUT ───────────────────────────────────────────────────────
    output: {
        baseDir: './runs',  // all runs saved here as runs/run_<id>/
    },

    // ── AI ANALYSIS (Ollama) ─────────────────────────────────────────
    ai: {
        enabled: true,              // set false to skip AI step
        model: 'gemma3:1b',         // phi3:mini (2.3GB) or tinyllama (637MB)
        ollamaUrl: 'http://127.0.0.1:11434',
    },

    // ── GAS ──────────────────────────────────────────────────────────
    gas: {
        attackGasLimit: 2_000_000,
        deployGasLimit: 5_000_000,
    },
    // ── SCENARIO: MARKET MANIPULATION ────────────────────────────────
    market_manipulation: {
        enabled: true,
    },
};
