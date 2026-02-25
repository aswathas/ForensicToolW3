/**
 * pipeline.js — Derived Pipeline (Layer 1)
 * Produces deterministic datasets from raw data.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ethers } from 'ethers';

// Known ERC20 Transfer / Approval topics
const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ERC20_APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

function ndjson(records) {
    return records.map(r => JSON.stringify(r)).join('\n') + '\n';
}

export async function runDerivedPipeline(rawData, outputDir) {
    const bundleDir = join(outputDir, '02_forensic_bundle');
    const derivedDir = join(bundleDir, '02_derived');

    const dirs = [
        join(derivedDir, 'tx_structural'),
        join(derivedDir, 'execution_trace'),
        join(derivedDir, 'events_logs'),
        join(derivedDir, 'value_movement'),
        join(derivedDir, 'permissions_governance'),
        join(derivedDir, 'inventory_profiling'),
    ];
    dirs.forEach(d => mkdirSync(d, { recursive: true }));

    const datasets = {};

    // ── 1. Transaction enriched ──────────────────────────────────
    const txEnriched = rawData.transactions.map(tx => {
        const receipt = rawData.receipts.find(r => r.tx_hash === tx.tx_hash) || {};
        return {
            record_id: tx.record_id,
            tx_hash: tx.tx_hash,
            block_number: tx.block_number,
            from: tx.from?.toLowerCase(),
            to: tx.to?.toLowerCase(),
            value_wei: tx.value,
            value_eth: tx.value ? ethers.formatEther(BigInt(tx.value)) : '0',
            gas_limit: tx.gas,
            gas_used: receipt.gas_used,
            status: receipt.status,
            is_contract_creation: !tx.to,
            contract_created: receipt.contract_address?.toLowerCase(),
            input_len: tx.input ? (tx.input.length - 2) / 2 : 0,
            selector: tx.input && tx.input.length >= 10 ? tx.input.slice(0, 10) : null,
            nonce: tx.nonce,
            evidence_refs: [{ dataset: 'transactions_raw', record_id: tx.record_id }],
        };
    });
    datasets.txEnriched = txEnriched;
    writeFileSync(join(derivedDir, 'tx_structural', 'transaction_enriched_000001.ndjson'), ndjson(txEnriched));

    // ── 2. Method selectors ──────────────────────────────────────
    const selectorMap = {};
    for (const tx of txEnriched) {
        if (tx.selector) {
            selectorMap[tx.selector] = (selectorMap[tx.selector] || 0) + 1;
        }
    }
    const methodSelectors = Object.entries(selectorMap).map(([selector, count]) => ({
        record_id: `selector:${selector}`,
        selector,
        count,
        evidence_refs: [],
    }));
    datasets.methodSelectors = methodSelectors;
    writeFileSync(join(derivedDir, 'tx_structural', 'method_selectors_000001.ndjson'), ndjson(methodSelectors));

    // ── 3. Events normalized ─────────────────────────────────────
    const eventsNormalized = rawData.eventLogs.map(log => ({
        record_id: log.record_id,
        tx_hash: log.tx_hash,
        block_number: log.block_number,
        log_index: log.log_index,
        address: log.address?.toLowerCase(),
        topic0: log.topics?.[0],
        topic1: log.topics?.[1],
        topic2: log.topics?.[2],
        topic3: log.topics?.[3],
        data: log.data,
        evidence_refs: [{ dataset: 'event_logs_raw', record_id: log.record_id }],
    }));
    datasets.eventsNormalized = eventsNormalized;
    writeFileSync(join(derivedDir, 'events_logs', 'events_normalized_000001.ndjson'), ndjson(eventsNormalized));

    // ── 4. Token transfers ERC20 ─────────────────────────────────
    const erc20Transfers = eventsNormalized
        .filter(e => e.topic0 === ERC20_TRANSFER_TOPIC && e.topic1 && e.topic2)
        .map(e => {
            const from = '0x' + (e.topic1 || '').slice(26);
            const to = '0x' + (e.topic2 || '').slice(26);
            let amount = '0';
            try { amount = BigInt(e.data || '0x0').toString(); } catch { }
            return {
                record_id: `erc20transfer:${e.tx_hash}:${e.log_index}`,
                tx_hash: e.tx_hash,
                block_number: e.block_number,
                token_address: e.address,
                from: from.toLowerCase(),
                to: to.toLowerCase(),
                amount,
                evidence_refs: [{ dataset: 'events_normalized', record_id: e.record_id }],
            };
        });
    datasets.erc20Transfers = erc20Transfers;
    writeFileSync(join(derivedDir, 'value_movement', 'token_transfers_erc20_000001.ndjson'), ndjson(erc20Transfers));

    // ── 5. Approvals ─────────────────────────────────────────────
    const approvals = eventsNormalized
        .filter(e => e.topic0 === ERC20_APPROVAL_TOPIC && e.topic1 && e.topic2)
        .map(e => {
            const owner = '0x' + (e.topic1 || '').slice(26);
            const spender = '0x' + (e.topic2 || '').slice(26);
            let amount = '0';
            try { amount = BigInt(e.data || '0x0').toString(); } catch { }
            const isUnlimited = amount === (2n ** 256n - 1n).toString();
            return {
                record_id: `approval:${e.tx_hash}:${e.log_index}`,
                tx_hash: e.tx_hash,
                block_number: e.block_number,
                token_address: e.address,
                owner: owner.toLowerCase(),
                spender: spender.toLowerCase(),
                amount,
                is_unlimited: isUnlimited,
                evidence_refs: [{ dataset: 'events_normalized', record_id: e.record_id }],
            };
        });
    datasets.approvals = approvals;
    writeFileSync(join(derivedDir, 'permissions_governance', 'approvals_unified_000001.ndjson'), ndjson(approvals));

    // ── 6. Native ETH transfers (from tx value) ──────────────────
    const nativeTransfers = txEnriched
        .filter(tx => tx.value_wei && BigInt(tx.value_wei) > 0n && tx.to)
        .map(tx => ({
            record_id: `native:${tx.tx_hash}`,
            tx_hash: tx.tx_hash,
            block_number: tx.block_number,
            from: tx.from,
            to: tx.to,
            value_wei: tx.value_wei,
            value_eth: tx.value_eth,
            evidence_refs: [{ dataset: 'transaction_enriched', record_id: tx.record_id }],
        }));
    datasets.nativeTransfers = nativeTransfers;
    writeFileSync(join(derivedDir, 'value_movement', 'native_internal_transfers_000001.ndjson'), ndjson(nativeTransfers));

    // ── 7. Fund flow edges ───────────────────────────────────────
    const fundFlowEdges = [
        ...nativeTransfers.map(t => ({
            record_id: `flow:native:${t.tx_hash}`,
            tx_hash: t.tx_hash,
            block_number: t.block_number,
            from: t.from,
            to: t.to,
            asset_type: 'native_eth',
            amount_wei: t.value_wei,
            evidence_refs: t.evidence_refs,
        })),
        ...erc20Transfers.map(t => ({
            record_id: `flow:erc20:${t.tx_hash}:${t.record_id}`,
            tx_hash: t.tx_hash,
            block_number: t.block_number,
            from: t.from,
            to: t.to,
            asset_type: 'erc20',
            token_address: t.token_address,
            amount_wei: t.amount,
            evidence_refs: t.evidence_refs,
        })),
    ];
    datasets.fundFlowEdges = fundFlowEdges;
    writeFileSync(join(derivedDir, 'value_movement', 'fund_flow_edges_000001.ndjson'), ndjson(fundFlowEdges));

    // ── 8. Address profiles ──────────────────────────────────────
    const addressSet = new Set();
    for (const tx of txEnriched) {
        if (tx.from) addressSet.add(tx.from);
        if (tx.to) addressSet.add(tx.to);
        if (tx.contract_created) addressSet.add(tx.contract_created);
    }
    const addressProfiles = Array.from(addressSet).map(addr => {
        const txsSent = txEnriched.filter(t => t.from === addr).length;
        const txsReceived = txEnriched.filter(t => t.to === addr).length;
        const isContractCreator = txEnriched.some(t => t.from === addr && t.is_contract_creation);
        const contractsCreated = txEnriched.filter(t => t.from === addr && t.contract_created).map(t => t.contract_created);
        const totalOutflowWei = txEnriched
            .filter(t => t.from === addr && t.value_wei)
            .reduce((sum, t) => sum + BigInt(t.value_wei), 0n).toString();
        const totalInflowWei = txEnriched
            .filter(t => t.to === addr && t.value_wei)
            .reduce((sum, t) => sum + BigInt(t.value_wei), 0n).toString();

        return {
            record_id: `profile:${addr}`,
            address: addr,
            txs_sent: txsSent,
            txs_received: txsReceived,
            is_contract_creator: isContractCreator,
            contracts_created: contractsCreated,
            total_outflow_wei: totalOutflowWei,
            total_inflow_wei: totalInflowWei,
            net_flow_wei: (BigInt(totalInflowWei) - BigInt(totalOutflowWei)).toString(),
            evidence_refs: [{ dataset: 'transaction_enriched', note: 'aggregated' }],
        };
    });
    datasets.addressProfiles = addressProfiles;
    writeFileSync(join(derivedDir, 'inventory_profiling', 'address_profile_000001.ndjson'), ndjson(addressProfiles));

    // ── 9. Trace calls flat ──────────────────────────────────────
    const traceCallsFlat = [];
    for (const traceRecord of rawData.callTraces) {
        flattenTrace(traceRecord.tx_hash, traceRecord.trace, traceCallsFlat, 0, '0');
    }
    datasets.traceCallsFlat = traceCallsFlat;
    writeFileSync(join(derivedDir, 'execution_trace', 'trace_calls_flat_000001.ndjson'), ndjson(traceCallsFlat));

    // ── 10. Trace edges ──────────────────────────────────────────
    const traceEdges = buildTraceEdges(traceCallsFlat);
    datasets.traceEdges = traceEdges;
    writeFileSync(join(derivedDir, 'execution_trace', 'trace_edges_000001.ndjson'), ndjson(traceEdges));

    // ── 11. Contract inventory ───────────────────────────────────
    const contractInventory = txEnriched
        .filter(tx => tx.contract_created)
        .map(tx => ({
            record_id: `contract:${tx.contract_created}`,
            address: tx.contract_created,
            deployed_by: tx.from,
            deploy_tx: tx.tx_hash,
            block_number: tx.block_number,
            evidence_refs: [{ dataset: 'transaction_enriched', record_id: tx.record_id }],
        }));
    datasets.contractInventory = contractInventory;
    writeFileSync(join(derivedDir, 'inventory_profiling', 'contract_inventory_000001.ndjson'), ndjson(contractInventory));

    // ── 12. Balance diffs (from state diffs) ─────────────────────
    // Each record = one address whose ETH balance changed in a tx.
    // Critical for detecting: unexpected outflows, reentrancy drains,
    // flashloan profit extraction.
    const balanceDiffs = (rawData.balanceDiffs || []).map(d => ({
        record_id: d.record_id,
        tx_hash: d.tx_hash,
        block_number: d.block_number,
        address: d.address?.toLowerCase(),
        balance_before: d.balance_before,
        balance_after: d.balance_after,
        balance_delta: d.balance_delta,
        balance_delta_eth: d.balance_delta_eth,
        is_loss: BigInt(d.balance_delta || '0') < 0n,
        is_gain: BigInt(d.balance_delta || '0') > 0n,
        evidence_refs: [{ dataset: 'state_diffs', record_id: d.record_id }],
    }));
    datasets.balanceDiffs = balanceDiffs;
    mkdirSync(join(derivedDir, 'state_analysis'), { recursive: true });
    writeFileSync(join(derivedDir, 'state_analysis', 'balance_diffs_000001.ndjson'), ndjson(balanceDiffs));

    // ── 13. Storage diffs (from state diffs) ─────────────────────
    // Each record = one storage slot that changed in a tx.
    // Critical for detecting: balance mapping manipulation (reentrancy),
    // oracle price slot changes (price manipulation), reentrancy guard bypass.
    const storageDiffs = (rawData.storageDiffs || []).map(d => ({
        record_id: d.record_id,
        tx_hash: d.tx_hash,
        block_number: d.block_number,
        contract: d.contract?.toLowerCase(),
        slot: d.slot,
        value_before: d.value_before,
        value_after: d.value_after,
        evidence_refs: [{ dataset: 'state_diffs', record_id: d.record_id }],
    }));
    datasets.storageDiffs = storageDiffs;
    writeFileSync(join(derivedDir, 'state_analysis', 'storage_diffs_000001.ndjson'), ndjson(storageDiffs));

    // ── 14. Net balance changes per address ───────────────────────
    // Aggregates all balance diffs per address across all txs.
    // Reveals: who gained ETH, who lost ETH, net profit of attackers.
    const netBalanceMap = {};
    for (const d of balanceDiffs) {
        const addr = d.address;
        if (!netBalanceMap[addr]) {
            netBalanceMap[addr] = { address: addr, total_delta: 0n, tx_count: 0, gains: 0, losses: 0, txs: [] };
        }
        const delta = BigInt(d.balance_delta || '0');
        netBalanceMap[addr].total_delta += delta;
        netBalanceMap[addr].tx_count++;
        if (delta > 0n) netBalanceMap[addr].gains++;
        if (delta < 0n) netBalanceMap[addr].losses++;
        netBalanceMap[addr].txs.push(d.tx_hash);
    }
    const netBalanceChanges = Object.values(netBalanceMap).map(e => ({
        record_id: `netbal:${e.address}`,
        address: e.address,
        total_delta_wei: e.total_delta.toString(),
        total_delta_eth: ethers.formatEther(e.total_delta),
        tx_count: e.tx_count,
        gain_txs: e.gains,
        loss_txs: e.losses,
        is_net_gainer: e.total_delta > 0n,
        is_net_loser: e.total_delta < 0n,
        tx_hashes: e.txs,
        evidence_refs: [{ dataset: 'balance_diffs', note: 'aggregated' }],
    }));
    datasets.netBalanceChanges = netBalanceChanges;
    writeFileSync(join(derivedDir, 'state_analysis', 'net_balance_changes_000001.ndjson'), ndjson(netBalanceChanges));

    // ── 15. Reentrancy patterns from state diffs ──────────────────
    // Detects txs where: a contract's ETH balance decreases AND
    // a storage slot (likely a balance mapping) changes multiple times
    // in the same tx — signature of reentrancy.
    const reentrantPatterns = [];
    const storageDiffsByTx = {};
    for (const d of storageDiffs) {
        if (!storageDiffsByTx[d.tx_hash]) storageDiffsByTx[d.tx_hash] = [];
        storageDiffsByTx[d.tx_hash].push(d);
    }
    const balanceDiffsByTx = {};
    for (const d of balanceDiffs) {
        if (!balanceDiffsByTx[d.tx_hash]) balanceDiffsByTx[d.tx_hash] = [];
        balanceDiffsByTx[d.tx_hash].push(d);
    }
    for (const [txHash, bDiffs] of Object.entries(balanceDiffsByTx)) {
        const losers = bDiffs.filter(d => d.is_loss);
        const gainers = bDiffs.filter(d => d.is_gain);
        const sDiffs = storageDiffsByTx[txHash] || [];
        // Pattern: at least one contract loses ETH AND another gains AND storage changed
        if (losers.length > 0 && gainers.length > 0 && sDiffs.length > 0) {
            // Compute total ETH lost (absolute value)
            const totalEthLost = losers.reduce((s, d) => {
                try { return s + Math.abs(parseFloat(d.balance_delta_eth || '0')); } catch { return s; }
            }, 0);
            const totalEthGained = gainers.reduce((s, d) => {
                try { return s + Math.abs(parseFloat(d.balance_delta_eth || '0')); } catch { return s; }
            }, 0);
            // Suspicion score:
            //   +2 per loser with >1 ETH loss (significant drain, not just gas)
            //   +1 per gainer
            //   +1 per storage change (capped at 6)
            //   +3 if >2 ETH total lost (real attack, not just a small deposit)
            //   +2 if multiple losers (multi-victim attack)
            const significantLosers = losers.filter(d => Math.abs(parseFloat(d.balance_delta_eth || '0')) > 1);
            const suspicionScore =
                (significantLosers.length * 2) +
                gainers.length +
                Math.min(sDiffs.length, 6) +
                (totalEthLost > 2 ? 3 : 0) +
                (losers.length > 1 ? 2 : 0);

            reentrantPatterns.push({
                record_id: `reentrant_pattern:${txHash}`,
                tx_hash: txHash,
                block_number: bDiffs[0].block_number,
                eth_losers: losers.map(d => ({ address: d.address, delta_eth: d.balance_delta_eth })),
                eth_gainers: gainers.map(d => ({ address: d.address, delta_eth: d.balance_delta_eth })),
                storage_changes: sDiffs.length,
                contracts_with_storage_change: [...new Set(sDiffs.map(d => d.contract))],
                total_eth_lost: totalEthLost,
                total_eth_gained: totalEthGained,
                suspicion_score: suspicionScore,
                evidence_refs: [
                    { dataset: 'balance_diffs', tx_hash: txHash },
                    { dataset: 'storage_diffs', tx_hash: txHash },
                ],
            });
        }
    }
    datasets.reentrantPatterns = reentrantPatterns;
    writeFileSync(join(derivedDir, 'state_analysis', 'reentrancy_patterns_000001.ndjson'), ndjson(reentrantPatterns));

    console.log(`[derived] Produced ${Object.keys(datasets).length} datasets`);
    console.log(`[derived]   balance_diffs: ${balanceDiffs.length} | storage_diffs: ${storageDiffs.length} | reentrancy_patterns: ${reentrantPatterns.length}`);
    return datasets;
}

function flattenTrace(txHash, node, out, depth, path) {
    if (!node) return;
    const record = {
        record_id: `tracecall:${txHash}:${path}`,
        tx_hash: txHash,
        depth,
        path,
        call_type: node.type,
        from: node.from?.toLowerCase(),
        to: node.to?.toLowerCase(),
        value: node.value,
        input: node.input,
        output: node.output,
        gas: node.gas,
        gas_used: node.gasUsed,
        error: node.error,
        revert_reason: node.revertReason,
        evidence_refs: [{ dataset: 'call_traces_raw', tx_hash: txHash }],
    };
    out.push(record);
    if (node.calls) {
        node.calls.forEach((child, i) => flattenTrace(txHash, child, out, depth + 1, `${path}.${i}`));
    }
}

function buildTraceEdges(flatCalls) {
    return flatCalls
        .filter(c => c.from && c.to)
        .map(c => ({
            record_id: `edge:${c.tx_hash}:${c.path}`,
            tx_hash: c.tx_hash,
            from: c.from,
            to: c.to,
            call_type: c.call_type,
            depth: c.depth,
            path: c.path,
            value: c.value,
            selector: c.input && c.input.length >= 10 ? c.input.slice(0, 10) : null,
            evidence_refs: [{ dataset: 'trace_calls_flat', record_id: c.record_id }],
        }));
}
