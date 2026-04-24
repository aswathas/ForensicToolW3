/**
 * CLI argument parser
 */
export function parseArgs(argv) {
    const args = {
        mode: 'raw_import',       // raw_import | rpc_live
        rawRoot: null,            // --raw-root
        rpcUrl: null,             // --rpc-url
        window: 'markers_onchain',// --window: markers_onchain | since_mark | range | lastN
        fromBlock: null,          // --from-block
        toBlock: null,            // --to-block
        lastN: 100,               // --last-n
        runId: null,              // --run-id
        outputDir: null,          // --output-dir
        traces: 'auto',           // --traces: auto | enabled | disabled
    };

    for (let i = 0; i < argv.length; i++) {
        switch (argv[i]) {
            case '--mode': args.mode = argv[++i]; break;
            case '--raw-root': args.rawRoot = argv[++i]; break;
            case '--rpc-url': args.rpcUrl = argv[++i]; break;
            case '--window': args.window = argv[++i]; break;
            case '--from-block': args.fromBlock = parseInt(argv[++i]); break;
            case '--to-block': args.toBlock = parseInt(argv[++i]); break;
            case '--last-n': args.lastN = parseInt(argv[++i]); break;
            case '--run-id': args.runId = argv[++i]; break;
            case '--output-dir': args.outputDir = argv[++i]; break;
            case '--traces': args.traces = argv[++i]; break;
        }
    }

    // Validate
    if (args.mode === 'raw_import' && !args.rawRoot) {
        console.warn('[args] --raw-root not specified, will look for evidence_run_*/01_raw');
    }
    if (args.mode === 'rpc_live' && !args.rpcUrl) {
        args.rpcUrl = 'http://127.0.0.1:8545';
        console.warn(`[args] --rpc-url not specified, defaulting to ${args.rpcUrl}`);
    }

    return args;
}
