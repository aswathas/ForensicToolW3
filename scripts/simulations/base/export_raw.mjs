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
 *   - Runtime bytecodes + PUSH4 selector extraction  ← NEW
 *   - ABI-decoded event logs (victim contracts only)  ← NEW (experimental/)
 */
import { ethers } from 'ethers';
import { mkdirSync, writeFileSync, appendFileSync, readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

function writeNdjson(filePath, records) {
    writeFileSync(filePath, records.map(r => JSON.stringify(r)).join('\n') + '\n');
    console.log(`[export] ${filePath.split(/[/\\]/).slice(-3).join('/')} — ${records.length} records`);
}

// ── Runtime bytecode + PUSH4 selector extraction ────────────────────────
/**
 * Fetches deployed (runtime) bytecode for every contract address provided.
 * Scans bytecode for PUSH4 opcodes (0x63) to extract 4-byte function selectors
 * WITHOUT needing ABI or source code. Works for attacker contracts too.
 *
 * How it works:
 *   Every Solidity function dispatcher includes: PUSH4 <selector> EQ JUMPI
 *   PUSH4 = opcode 0x63, followed by exactly 4 bytes (the selector).
 *   By scanning for 0x63 we recover all selectors the contract knows about.
 */
async function collectRuntimeBytecodes(provider, contractAddresses, rawDir) {
    const contractsDir = join(rawDir, 'contracts');
    mkdirSync(contractsDir, { recursive: true });

    const records = [];
    for (const addr of contractAddresses) {
        try {
            const bytecode = await provider.getCode(addr);
            // getCode returns '0x' for EOAs — skip those
            if (!bytecode || bytecode === '0x' || bytecode.length <= 2) continue;

            // ── PUSH4 opcode scan ─────────────────────────────────────────
            // Strip '0x', convert to bytes, look for opcode 0x63
            const hex = bytecode.slice(2);
            const bytes = Buffer.from(hex, 'hex');
            const selectors = new Set();
            for (let i = 0; i < bytes.length - 4; i++) {
                if (bytes[i] === 0x63) {
                    // Next 4 bytes are the selector
                    const sel = '0x' + bytes.slice(i + 1, i + 5).toString('hex');
                    selectors.add(sel);
                    i += 4; // skip past the 4 selector bytes
                }
            }

            records.push({
                record_id: `bytecode:${addr}`,
                address: addr,
                bytecode_hex: bytecode,
                bytecode_size_bytes: bytes.length,
                selectors_extracted: [...selectors],
                selector_count: selectors.size,
                collected_at: new Date().toISOString(),
            });
        } catch (e) {
            console.warn(`[export] Bytecode fetch failed for ${addr}: ${e.message}`);
        }
    }

    writeFileSync(
        join(contractsDir, 'runtime_bytecode_000001.ndjson'),
        records.map(r => JSON.stringify(r)).join('\n') + '\n'
    );
    console.log(`[export] contracts/runtime_bytecode_000001.ndjson — ${records.length} contracts | ${records.reduce((s, r) => s + r.selector_count, 0)} selectors extracted`);
    return records;
}

// ── ABI-based event log decoding (victim contracts only) ──────────────────
/**
 * Decodes event logs using ONLY the victim/client contract ABIs.
 *
 * How event log decoding works from scratch:
 *   - An event on-chain has: topics[0] = keccak256("EventName(type1,type2,...)"),
 *     topics[1..3] = indexed params (raw 32-byte padded), data = non-indexed params ABI-encoded.
 *   - If we have the ABI, we know the event signature, so we can:
 *     1. Compute keccak256(signature) and match against topics[0]
 *     2. Decode topics[1..3] (indexed) and data (non-indexed) into human-readable values
 *   - We ONLY decode logs emitted BY the victim contract address.
 *   - Attacker contract logs have topics[0] hashes we don't recognize → decoded = null.
 *
 * @param {Array} eventLogs - raw event logs from export
 * @param {string} artifactsDir - path to compiled contract JSON artifacts (victims + attackers)
 * @param {Object} victimContracts - map of { name: address } for victim contracts only
 * @param {string} experimentalDir - output directory path
 */
async function decodeEventLogsWithAbi(eventLogs, artifactsDir, victimContracts, experimentalDir) {
    mkdirSync(experimentalDir, { recursive: true });

    // ── Load victim ABIs only (never attacker ABIs) ───────────────────
    const VICTIM_NAMES = [
        'VaultVictim', 'TokenVaultVictim', 'ReadOnlyVictim', 'DependentProtocol',
        'ERC777VaultVictim', 'FlashloanPool', 'FlashloanVictim', 'SimpleDex',
    ];

    // Build: { address_lowercase → { contractName, iface } }
    const victimAddrMap = {};
    const victimAddrSet = new Set(Object.values(victimContracts).map(a => a.toLowerCase()));

    if (existsSync(artifactsDir)) {
        const files = readdirSync(artifactsDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
            const contractName = file.replace('.json', '');
            if (!VICTIM_NAMES.includes(contractName)) continue; // only victim ABIs
            try {
                const artifact = JSON.parse(readFileSync(join(artifactsDir, file), 'utf8'));
                if (!artifact.abi || !Array.isArray(artifact.abi)) continue;
                const iface = new ethers.Interface(artifact.abi);
                // Map each known victim address to this interface
                for (const [name, addr] of Object.entries(victimContracts)) {
                    // Match by contract name (e.g. victimContracts.vault1 → VaultVictim)
                    if (addr && contractName.toLowerCase().includes(name.toLowerCase().replace('vault1', 'vault').replace('vault2', 'tokenvault'))) {
                        victimAddrMap[addr.toLowerCase()] = { contractName, iface };
                    }
                }
                // Also register by contract name match against all victim addresses
                for (const addr of victimAddrSet) {
                    if (!victimAddrMap[addr]) {
                        // Try to match contract name against address by checking all entries
                        for (const [, knownAddr] of Object.entries(victimContracts)) {
                            if (knownAddr && knownAddr.toLowerCase() === addr) {
                                victimAddrMap[addr] = { contractName, iface };
                            }
                        }
                    }
                }
            } catch (_) { }
        }
    }

    // ── Build a universal topic0 → { eventName, iface } map from ALL victim ABIs ──
    // This is the key insight: topics[0] = keccak256(eventSignature) is deterministic.
    // We pre-compute all event topic0 hashes from the victim ABIs.
    const topic0Map = {}; // topic0_hex → { eventName, iface, contractName }
    for (const [, { contractName, iface }] of Object.entries(victimAddrMap)) {
        for (const fragment of iface.fragments) {
            if (fragment.type === 'event') {
                try {
                    const topic0 = iface.getEvent(fragment.name).topicHash;
                    topic0Map[topic0.toLowerCase()] = { eventName: fragment.name, iface, contractName };
                } catch (_) { }
            }
        }
    }

    // ── Decode each event log ───────────────────────────────────────
    const records = [];
    for (const log of eventLogs) {
        const logAddr = (log.address || '').toLowerCase();
        const topic0 = (log.topics?.[0] || '').toLowerCase();
        const isVictimContract = victimAddrSet.has(logAddr);
        const knownEvent = topic0Map[topic0];

        let decoded = null;
        let eventName = null;
        let contractName = null;
        let decodeSource = 'unknown';
        let decodeError = null;

        if (isVictimContract && knownEvent) {
            // We have both: the contract is a victim AND we know this event topic
            try {
                const parsed = knownEvent.iface.parseLog({
                    topics: log.topics || [],
                    data: log.data || '0x',
                });
                decoded = {};
                eventName = parsed.name;
                contractName = knownEvent.contractName;
                decodeSource = 'client_abi';
                // Convert each decoded param to a readable value
                for (const [key, val] of Object.entries(parsed.args)) {
                    if (typeof key === 'string' && isNaN(Number(key))) {
                        // Try to format ETH values nicely
                        if (typeof val === 'bigint') {
                            decoded[key] = val.toString();
                            // If it looks like a wei amount (> 1e15), also give ETH
                            if (val > 1000000000000000n) {
                                decoded[`${key}_eth`] = ethers.formatEther(val);
                            }
                        } else {
                            decoded[key] = val?.toString?.() ?? val;
                        }
                    }
                }
            } catch (e) {
                decodeError = e.message.slice(0, 100);
                decodeSource = 'client_abi_decode_failed';
            }
        } else if (!isVictimContract) {
            // Attacker or unknown contract — we intentionally don't decode
            decodeSource = 'unknown_contract';
        } else {
            // Victim contract but unknown event (custom internal event)
            decodeSource = 'unknown_event_signature';
        }

        records.push({
            record_id: log.record_id,
            tx_hash: log.tx_hash,
            block_number: log.block_number,
            log_index: log.log_index,
            contract_address: log.address,
            is_victim_contract: isVictimContract,
            contract_name: contractName,
            event_name: eventName,
            decoded,
            decode_source: decodeSource,
            decode_error: decodeError,
            // Keep raw data for reference
            raw_topics: log.topics,
            raw_data: log.data,
        });
    }

    const decodedCount = records.filter(r => r.decoded !== null).length;
    const victimLogCount = records.filter(r => r.is_victim_contract).length;
    const attackerLogCount = records.length - victimLogCount;

    writeFileSync(
        join(experimentalDir, 'decoded_events_000001.ndjson'),
        records.map(r => JSON.stringify(r)).join('\n') + '\n'
    );

    // Write a human-readable summary
    const summary = {
        total_logs: records.length,
        victim_contract_logs: victimLogCount,
        attacker_unknown_logs: attackerLogCount,
        successfully_decoded: decodedCount,
        decode_rate_pct: records.length > 0 ? ((decodedCount / records.length) * 100).toFixed(1) : '0',
        victim_contracts_seen: [...new Set(records.filter(r => r.contract_name).map(r => r.contract_name))],
        event_types_decoded: [...new Set(records.filter(r => r.event_name).map(r => r.event_name))],
        note: 'Attacker contract logs intentionally not decoded — no ABI available in real forensics.',
        generated_at: new Date().toISOString(),
    };
    writeFileSync(join(experimentalDir, 'decoded_events_summary.json'), JSON.stringify(summary, null, 2));

    console.log(`[export] experimental/decoded_events_000001.ndjson — ${records.length} logs total`);
    console.log(`[export]   ✓ Decoded  : ${decodedCount} victim contract events (client ABI)`);
    console.log(`[export]   ✗ Undecoded: ${attackerLogCount} attacker/unknown contract events (no ABI — expected)`);
    return records;
}

export async function exportRawBundle(provider, fromBlock, toBlock, clientDir, options = {}) {
    // options = { artifactsDir, victimContracts }
    const { artifactsDir = null, victimContracts = {} } = options;
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

    // ── Runtime bytecode collection ───────────────────────────────────
    // Collect all deployed contract addresses from receipts (newly deployed this run)
    const deployedContracts = [...new Set(
        receiptsRaw
            .filter(r => r.contract_address)
            .map(r => r.contract_address.toLowerCase())
    )];
    // Also include explicitly passed victim contracts
    const knownVictimAddresses = Object.values(victimContracts)
        .filter(Boolean)
        .map(a => a.toLowerCase());
    const allContractAddresses = [...new Set([...deployedContracts, ...knownVictimAddresses])];

    console.log(`\n[export] ── Runtime Bytecode Collection ───────────────────────`);
    console.log(`[export] Found ${allContractAddresses.length} contract addresses (${deployedContracts.length} from receipts + ${knownVictimAddresses.length} victim hints)`);
    const bytecodeRecords = await collectRuntimeBytecodes(provider, allContractAddresses, rawDir);

    // ── Experimental: ABI-decoded event logs ─────────────────────────
    // Uses victim contract ABIs ONLY — attacker events stay as raw hex.
    // This is what you would do in real forensics: client gives you their contract ABI,
    // you decode their events to understand what their contract was doing.
    const experimentalDir = join(clientDir, 'experimental');
    let decodedEventsRecords = [];
    if (artifactsDir && existsSync(artifactsDir) && Object.keys(victimContracts).length > 0) {
        console.log(`\n[export] ── ABI Event Log Decoding (Experimental) ─────────────`);
        console.log(`[export] Victim contracts: ${Object.keys(victimContracts).join(', ')}`);
        console.log(`[export] Attacker events will NOT be decoded (no ABI — real-world scenario)`);
        decodedEventsRecords = await decodeEventLogsWithAbi(
            eventLogsRaw, artifactsDir, victimContracts, experimentalDir
        );
    } else {
        console.log(`[export] Skipping ABI decoding (no artifactsDir or victimContracts provided)`);
    }

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
        bytecodes_collected: bytecodeRecords.length,
        selectors_extracted_total: bytecodeRecords.reduce((s, r) => s + r.selector_count, 0),
        experimental_decoded_events: decodedEventsRecords.filter(r => r.decoded !== null).length,
        trace_coverage_pct: txsRaw.length > 0 ? ((callTraceCount / txsRaw.length) * 100).toFixed(1) : '0',
        state_diff_coverage_pct: txsRaw.length > 0 ? ((stateDiffCount / txsRaw.length) * 100).toFixed(1) : '0',
        generated_at: new Date().toISOString(),
    };
    writeFileSync(
        join(rawDir, '00_quality', 'data_coverage_report_000001.ndjson'),
        JSON.stringify(coverage) + '\n'
    );

    console.log(`\n[export] ✓ Raw bundle complete: ${clientDir}`);
    return { rawDir, coverage, txsRaw, blockHeaders, balanceDiffs, storageDiffs, bytecodeRecords, decodedEventsRecords };
}

export function generateRunId() {
    return crypto.randomBytes(8).toString('hex');
}
