/**
 * export_raw.mjs
 * After simulation completes, fetches all on-chain data and writes
 * it as NDJSON files to client/01_raw/
 *
 * Data collected per transaction:
 *   - Block headers
 *   - Raw transactions
 *   - Transaction receipts
 *   - Event logs
 *   - Call traces (callTracer)
 *   - State diffs (prestateTracer with diffMode) ← MANDATORY for derived pipeline
 *   - Balance diffs (extracted from state diffs)
 *   - Storage diffs (extracted from state diffs)
 */
import { ethers } from 'ethers';
import { mkdirSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

function writeNdjson(filePath, records) {
    writeFileSync(filePath, records.map(r => JSON.stringify(r)).join('\n') + '\n');
    console.log(`[export] ${filePath.split(/[/\\]/).slice(-3).join('/')} — ${records.length} records`);
}

export async function exportRawBundle(provider, fromBlock, toBlock, clientDir) {
    console.log(`\n[export] Exporting blocks ${fromBlock}→${toBlock}`);
    console.log(`[export] Output: ${clientDir}`);

    const rawDir = join(clientDir, '01_raw');
    const dirs = [
        join(rawDir, '00_quality'),
        join(rawDir, 'chain'),
        join(rawDir, 'txs'),
        join(rawDir, 'traces'),
        join(rawDir, 'state'),   // ← state diffs live here
    ];
    dirs.forEach(d => mkdirSync(d, { recursive: true }));

    // ── Collect blocks, txs, receipts, logs ──────────────────────────
    const blockHeaders = [];
    const txsRaw = [];
    const receiptsRaw = [];
    const eventLogsRaw = [];

    for (let bn = fromBlock; bn <= toBlock; bn++) {
        const block = await provider.getBlock(bn, true);
        if (!block) continue;

        blockHeaders.push({
            record_id: `block:${block.hash}`,
            block_number: block.number,
            block_hash: block.hash,
            parent_hash: block.parentHash,
            timestamp: block.timestamp,
            miner: block.miner,
            gas_limit: block.gasLimit?.toString(),
            gas_used: block.gasUsed?.toString(),
            tx_count: block.transactions?.length ?? 0,
        });

        for (const tx of block.prefetchedTransactions ?? []) {
            txsRaw.push({
                record_id: `tx:${tx.hash}`,
                tx_hash: tx.hash,
                block_number: block.number,
                block_hash: block.hash,
                tx_index: tx.index,
                from: tx.from,
                to: tx.to,
                value: tx.value?.toString(),
                gas: tx.gasLimit?.toString(),
                gas_price: tx.gasPrice?.toString(),
                nonce: tx.nonce,
                input: tx.data,
                type: tx.type,
            });

            try {
                const receipt = await provider.getTransactionReceipt(tx.hash);
                if (receipt) {
                    receiptsRaw.push({
                        record_id: `receipt:${tx.hash}`,
                        tx_hash: tx.hash,
                        block_number: receipt.blockNumber,
                        status: receipt.status,
                        gas_used: receipt.gasUsed?.toString(),
                        cumulative_gas_used: receipt.cumulativeGasUsed?.toString(),
                        contract_address: receipt.contractAddress,
                        logs_count: receipt.logs?.length ?? 0,
                    });

                    for (const log of receipt.logs ?? []) {
                        eventLogsRaw.push({
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
            } catch (e) {
                console.warn(`[export] Receipt error for ${tx.hash}: ${e.message}`);
            }
        }
    }

    writeNdjson(join(rawDir, 'chain', 'block_headers_000001.ndjson'), blockHeaders);
    writeNdjson(join(rawDir, 'txs', 'transactions_raw_000001.ndjson'), txsRaw);
    writeNdjson(join(rawDir, 'txs', 'transaction_receipts_000001.ndjson'), receiptsRaw);
    writeNdjson(join(rawDir, 'txs', 'event_logs_raw_000001.ndjson'), eventLogsRaw);

    // ── Call traces ───────────────────────────────────────────────────
    const callTracesPath = join(rawDir, 'traces', 'call_traces_raw_000001.ndjson');
    let callTraceCount = 0, callTraceErrors = 0;
    writeFileSync(callTracesPath, '');

    for (const tx of txsRaw) {
        try {
            const trace = await provider.send('debug_traceTransaction', [
                tx.tx_hash, { tracer: 'callTracer' },
            ]);
            appendFileSync(callTracesPath,
                JSON.stringify({ record_id: `trace:${tx.tx_hash}`, tx_hash: tx.tx_hash, trace }) + '\n'
            );
            callTraceCount++;
        } catch (_) { callTraceErrors++; }
    }
    console.log(`[export] traces/call_traces_raw_000001.ndjson — ${callTraceCount} traces (${callTraceErrors} errors)`);

    // ── STATE DIFFS (prestateTracer diffMode) ─────────────────────────
    // This is MANDATORY: captures every balance/storage/nonce change per tx.
    // Used by the derived pipeline to detect:
    //   - Unexpected ETH outflows (reentrancy)
    //   - Storage slot manipulation (price oracle attacks)
    //   - Balance inflation patterns (cross-function reentrancy)
    const stateDiffsPath = join(rawDir, 'state', 'state_diffs_000001.ndjson');
    const balanceDiffsPath = join(rawDir, 'state', 'balance_diffs_000001.ndjson');
    const storageDiffsPath = join(rawDir, 'state', 'storage_diffs_000001.ndjson');

    writeFileSync(stateDiffsPath, '');
    writeFileSync(balanceDiffsPath, '');
    writeFileSync(storageDiffsPath, '');

    let stateDiffCount = 0, stateDiffErrors = 0;
    const balanceDiffs = [];
    const storageDiffs = [];

    for (const tx of txsRaw) {
        try {
            // prestateTracer with diffMode=true gives us pre/post state for every touched account
            const stateDiff = await provider.send('debug_traceTransaction', [
                tx.tx_hash,
                { tracer: 'prestateTracer', tracerConfig: { diffMode: true } },
            ]);

            const record = {
                record_id: `statediff:${tx.tx_hash}`,
                tx_hash: tx.tx_hash,
                block_number: tx.block_number,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                pre: stateDiff.pre,
                post: stateDiff.post,
            };
            appendFileSync(stateDiffsPath, JSON.stringify(record) + '\n');
            stateDiffCount++;

            // ── Extract balance diffs ──────────────────────────────────
            const allAddrs = new Set([
                ...Object.keys(stateDiff.pre || {}),
                ...Object.keys(stateDiff.post || {}),
            ]);
            for (const addr of allAddrs) {
                const pre = stateDiff.pre?.[addr];
                const post = stateDiff.post?.[addr];
                const preBalance = BigInt(pre?.balance ?? '0x0');
                const postBalance = BigInt(post?.balance ?? '0x0');
                if (preBalance !== postBalance) {
                    const diff = {
                        record_id: `baldiff:${tx.tx_hash}:${addr}`,
                        tx_hash: tx.tx_hash,
                        block_number: tx.block_number,
                        address: addr,
                        balance_before: preBalance.toString(),
                        balance_after: postBalance.toString(),
                        balance_delta: (postBalance - preBalance).toString(),
                        balance_delta_eth: ethers.formatEther(postBalance - preBalance),
                    };
                    balanceDiffs.push(diff);
                    appendFileSync(balanceDiffsPath, JSON.stringify(diff) + '\n');
                }

                // ── Extract storage diffs ──────────────────────────────
                const preStorage = pre?.storage ?? {};
                const postStorage = post?.storage ?? {};
                const allSlots = new Set([
                    ...Object.keys(preStorage),
                    ...Object.keys(postStorage),
                ]);
                for (const slot of allSlots) {
                    const slotBefore = preStorage[slot] ?? null;
                    const slotAfter = postStorage[slot] ?? null;
                    if (slotBefore !== slotAfter) {
                        const sdiff = {
                            record_id: `storediff:${tx.tx_hash}:${addr}:${slot}`,
                            tx_hash: tx.tx_hash,
                            block_number: tx.block_number,
                            contract: addr,
                            slot,
                            value_before: slotBefore,
                            value_after: slotAfter,
                        };
                        storageDiffs.push(sdiff);
                        appendFileSync(storageDiffsPath, JSON.stringify(sdiff) + '\n');
                    }
                }
            }
        } catch (e) {
            stateDiffErrors++;
        }
    }

    console.log(`[export] state/state_diffs_000001.ndjson — ${stateDiffCount} records (${stateDiffErrors} errors)`);
    console.log(`[export] state/balance_diffs_000001.ndjson — ${balanceDiffs.length} records`);
    console.log(`[export] state/storage_diffs_000001.ndjson — ${storageDiffs.length} records`);

    // ── Coverage report ───────────────────────────────────────────────
    const coverage = {
        from_block: fromBlock,
        to_block: toBlock,
        blocks_fetched: blockHeaders.length,
        txs_fetched: txsRaw.length,
        receipts_fetched: receiptsRaw.length,
        event_logs_fetched: eventLogsRaw.length,
        call_traces_fetched: callTraceCount,
        call_trace_errors: callTraceErrors,
        state_diffs_fetched: stateDiffCount,
        state_diff_errors: stateDiffErrors,
        balance_diffs_extracted: balanceDiffs.length,
        storage_diffs_extracted: storageDiffs.length,
        trace_coverage_pct: txsRaw.length > 0 ? ((callTraceCount / txsRaw.length) * 100).toFixed(1) : '0',
        state_diff_coverage_pct: txsRaw.length > 0 ? ((stateDiffCount / txsRaw.length) * 100).toFixed(1) : '0',
        generated_at: new Date().toISOString(),
    };
    writeFileSync(
        join(rawDir, '00_quality', 'data_coverage_report_000001.ndjson'),
        JSON.stringify(coverage) + '\n'
    );

    console.log(`[export] ✓ Raw bundle complete: ${clientDir}`);
    return { rawDir, coverage, txsRaw, blockHeaders, balanceDiffs, storageDiffs };
}

export function generateRunId() {
    return crypto.randomBytes(8).toString('hex');
}
