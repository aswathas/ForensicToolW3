/**
 * raw_collector.js
 * Collects raw data either from:
 *   - raw_import: reads existing NDJSON files from rawRoot
 *   - rpc_live: fetches from RPC and writes NDJSON files
 */
import { ethers } from 'ethers';
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

export async function collectRaw(args, window, outputDir) {
    if (args.mode === 'raw_import') {
        return collectFromFiles(args.rawRoot, outputDir);
    } else {
        return collectFromRpc(args, window, outputDir);
    }
}

// ── Mode B: Read from existing NDJSON files ───────────────────────
function collectFromFiles(rawRoot, outputDir) {
    console.log(`[raw] Reading from: ${rawRoot}`);

    const readNdjson = (filePath) => {
        if (!existsSync(filePath)) return [];
        return readFileSync(filePath, 'utf8')
            .trim().split('\n').filter(Boolean)
            .map(l => { try { return JSON.parse(l); } catch { return null; } })
            .filter(Boolean);
    };

    const findFile = (subdir, pattern) => {
        const dir = join(rawRoot, subdir);
        if (!existsSync(dir)) return null;
        const files = readdirSync(dir).filter(f => f.includes(pattern) && f.endsWith('.ndjson'));
        return files.length > 0 ? join(dir, files[0]) : null;
    };

    const blockHeaders = readNdjson(findFile('chain', 'block_headers') || '');
    const transactions = readNdjson(findFile('txs', 'transactions_raw') || '');
    const receipts = readNdjson(findFile('txs', 'transaction_receipts') || '');
    const eventLogs = readNdjson(findFile('txs', 'event_logs_raw') || '');
    const callTraces = readNdjson(findFile('traces', 'call_traces_raw') || '');

    // State diffs — mandatory for derived pipeline, heuristics, and ML
    const stateDiffs = readNdjson(findFile('state', 'state_diffs') || '');
    const balanceDiffs = readNdjson(findFile('state', 'balance_diffs') || '');
    const storageDiffs = readNdjson(findFile('state', 'storage_diffs') || '');

    if (stateDiffs.length === 0) {
        console.warn('[raw] ⚠ No state_diffs found — heuristics and ML features will be degraded.');
        console.warn('[raw]   Re-run simulation with updated export_raw.mjs to get state diffs.');
    } else {
        console.log(`[raw] State diffs: ${stateDiffs.length} txs | balance_diffs: ${balanceDiffs.length} | storage_diffs: ${storageDiffs.length}`);
    }

    // Copy raw files to output bundle
    const outRawDir = join(outputDir, '01_raw');
    mkdirSync(join(outRawDir, 'chain'), { recursive: true });
    mkdirSync(join(outRawDir, 'txs'), { recursive: true });
    mkdirSync(join(outRawDir, 'traces'), { recursive: true });
    mkdirSync(join(outRawDir, '00_quality'), { recursive: true });

    // Write coverage
    const coverage = {
        mode: 'raw_import',
        raw_root: rawRoot,
        blocks: blockHeaders.length,
        txs: transactions.length,
        receipts: receipts.length,
        event_logs: eventLogs.length,
        traces: callTraces.length,
        state_diffs: stateDiffs.length,
        balance_diffs: balanceDiffs.length,
        storage_diffs: storageDiffs.length,
        generated_at: new Date().toISOString(),
    };
    writeFileSync(
        join(outRawDir, '00_quality', 'data_coverage_report_000001.ndjson'),
        JSON.stringify(coverage) + '\n'
    );

    console.log(`[raw] Loaded: ${blockHeaders.length} blocks, ${transactions.length} txs, ${eventLogs.length} logs, ${callTraces.length} traces`);

    return {
        blockHeaders,
        transactions,
        receipts,
        eventLogs,
        callTraces,
        stateDiffs,
        balanceDiffs,
        storageDiffs,
        txCount: transactions.length,
        logCount: eventLogs.length,
        traceCount: callTraces.length,
        stateDiffCount: stateDiffs.length,
        rawRoot,
        outputDir,
    };
}

// ── Mode A: Fetch from RPC ────────────────────────────────────────
async function collectFromRpc(args, window, outputDir) {
    console.log(`[raw] Fetching from RPC: ${args.rpcUrl}`);
    const provider = new ethers.JsonRpcProvider(args.rpcUrl);

    const outRawDir = join(outputDir, '01_raw');
    mkdirSync(join(outRawDir, 'chain'), { recursive: true });
    mkdirSync(join(outRawDir, 'txs'), { recursive: true });
    mkdirSync(join(outRawDir, 'traces'), { recursive: true });
    mkdirSync(join(outRawDir, '00_quality'), { recursive: true });

    const blockHeaders = [], transactions = [], receipts = [], eventLogs = [], callTraces = [];

    for (let bn = window.fromBlock; bn <= window.toBlock; bn++) {
        const block = await provider.getBlock(bn, true);
        if (!block) continue;

        blockHeaders.push({
            record_id: `block:${block.hash}`,
            block_number: block.number,
            block_hash: block.hash,
            parent_hash: block.parentHash,
            timestamp: block.timestamp,
            miner: block.miner,
            gas_used: block.gasUsed?.toString(),
            tx_count: block.transactions?.length ?? 0,
        });

        for (const tx of block.prefetchedTransactions ?? []) {
            transactions.push({
                record_id: `tx:${tx.hash}`,
                tx_hash: tx.hash,
                block_number: block.number,
                from: tx.from,
                to: tx.to,
                value: tx.value?.toString(),
                gas: tx.gasLimit?.toString(),
                input: tx.data,
                nonce: tx.nonce,
            });

            try {
                const receipt = await provider.getTransactionReceipt(tx.hash);
                if (receipt) {
                    receipts.push({
                        record_id: `receipt:${tx.hash}`,
                        tx_hash: tx.hash,
                        block_number: receipt.blockNumber,
                        status: receipt.status,
                        gas_used: receipt.gasUsed?.toString(),
                        contract_address: receipt.contractAddress,
                    });
                    for (const log of receipt.logs ?? []) {
                        eventLogs.push({
                            record_id: `log:${tx.hash}:${log.index}`,
                            tx_hash: tx.hash,
                            block_number: log.blockNumber,
                            log_index: log.index,
                            address: log.address,
                            topics: log.topics,
                            data: log.data,
                        });
                    }
                }
            } catch (_) { }

            // Traces
            try {
                const trace = await provider.send('debug_traceTransaction', [tx.hash, { tracer: 'callTracer' }]);
                callTraces.push({ record_id: `trace:${tx.hash}`, tx_hash: tx.hash, trace });
            } catch (_) { }
        }
    }

    // Write NDJSON files
    const write = (path, records) => writeFileSync(path, records.map(r => JSON.stringify(r)).join('\n') + '\n');
    write(join(outRawDir, 'chain', 'block_headers_000001.ndjson'), blockHeaders);
    write(join(outRawDir, 'txs', 'transactions_raw_000001.ndjson'), transactions);
    write(join(outRawDir, 'txs', 'transaction_receipts_000001.ndjson'), receipts);
    write(join(outRawDir, 'txs', 'event_logs_raw_000001.ndjson'), eventLogs);
    write(join(outRawDir, 'traces', 'call_traces_raw_000001.ndjson'), callTraces);

    return {
        blockHeaders, transactions, receipts, eventLogs, callTraces,
        txCount: transactions.length, logCount: eventLogs.length, traceCount: callTraces.length,
        rawRoot: outRawDir, outputDir
    };
}
