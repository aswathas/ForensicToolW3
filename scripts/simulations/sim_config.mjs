/**
 * sim_config.mjs — Central Simulation Configuration
 *
 * TARGET: ~100 transactions
 *   - 10 users × ~9 txs each = ~90 user noise txs
 *   - 1 attacker × 5 attacks =   5 attack txs
 *   - deploy + funding txs   =  ~5 setup txs
 */

export const SIM_CONFIG = {
    // ── Anvil node settings ──────────────────────────────────────────
    anvil: {
        port: 8545,
        accounts: 20,           // [0]=deployer, [1-10]=users, [11]=attacker
        balance: 100_000,       // ETH per account
    },

    // ── Simulation scale (used by run.mjs internally, not CLI-driven) ─
    simulation: {
        numAttackers: 5,        // kept for CLI compat — run.mjs uses 1 attacker wallet
        numUsers: 10,           // 10 innocent users
        numUserTxsPerRound: 1,  // kept for CLI compat
        attackRepeatCount: 1,   // 1 round — exactly 5 attacks
        mineBlocksBetween: 2,
    },

    // ── Per-attack ETH amounts ───────────────────────────────────────
    attacks: {
        attack1_depositPerUser: '10',       // ETH deposited into vault1
        attack1_attackValue: '3',           // ETH attacker sends
        attack1_maxDepth: 3,                // reentrancy depth (3 = clear signal)

        attack2_depositPerUser: '10',
        attack2_attackValue: '3',
        attack2_prefund: '10',

        attack3_attackValue: '3',           // >= 2 ETH required
        attack3_depositPerUser: '5',

        attack4_depositPerUser: '5',
        attack4_attackValue: '3',

        attack5_attackValue: '2',
        attack5_flashPoolFund: '200',
        attack5_victimFund: '50',
        attack5_dexFund: '20',
    },

    // ── Output folder ────────────────────────────────────────────────
    output: {
        baseDir: './runs',
    },

    // ── Gas limits ───────────────────────────────────────────────────
    gas: {
        attackGasLimit: 2_000_000,
        deployGasLimit: 5_000_000,
    },
};

// ── CLI override helper ──────────────────────────────────────────────
export function applyCliOverrides(config, argv) {
    const get = (flag, def) => {
        const i = argv.indexOf(flag);
        return i !== -1 ? argv[i + 1] : def;
    };
    const getNum = (flag, def) => Number(get(flag, def));

    config.simulation.numAttackers = getNum('--num-attackers', config.simulation.numAttackers);
    config.simulation.numUsers = getNum('--num-users', config.simulation.numUsers);
    config.simulation.numUserTxsPerRound = getNum('--user-txs', config.simulation.numUserTxsPerRound);
    config.simulation.attackRepeatCount = getNum('--repeat', config.simulation.attackRepeatCount);
    config.anvil.accounts = getNum('--accounts', config.anvil.accounts);
    config.anvil.balance = getNum('--balance', config.anvil.balance);
    config.attacks.attack1_maxDepth = getNum('--depth', config.attacks.attack1_maxDepth);

    return config;
}
