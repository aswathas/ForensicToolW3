/**
 * ml_features.js — ML Feature Extractor
 *
 * Produces a per-transaction feature vector using ALL available data:
 *   - Raw tx fields (gas, value, input length)
 *   - Call trace features (depth, call count, reentrant calls)
 *   - State diff features (balance delta, storage changes) ← KEY
 *   - Signal features (which rules fired, how many)
 *   - Address profile features (is new contract, net gainer)
 *
 * Output: ml_features_000001.ndjson — one row per tx, ready for sklearn/XGBoost
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ethers } from 'ethers';

function ndjson(records) {
    return records.map(r => JSON.stringify(r)).join('\n') + '\n';
}

export async function extractMlFeatures(rawData, derived, signals, outputDir) {
    const bundleDir = join(outputDir, '02_forensic_bundle');
    const mlDir = join(bundleDir, '05_ml_features');
    mkdirSync(mlDir, { recursive: true });

    // ── Build lookup maps ─────────────────────────────────────────────
    const receiptMap = {};
    for (const r of rawData.receipts || []) receiptMap[r.tx_hash] = r;

    const traceMap = {};
    for (const t of rawData.callTraces || []) traceMap[t.tx_hash] = t.trace;

    // State diff maps (keyed by tx_hash)
    const balanceDiffsByTx = {};
    for (const d of rawData.balanceDiffs || []) {
        if (!balanceDiffsByTx[d.tx_hash]) balanceDiffsByTx[d.tx_hash] = [];
        balanceDiffsByTx[d.tx_hash].push(d);
    }
    const storageDiffsByTx = {};
    for (const d of rawData.storageDiffs || []) {
        if (!storageDiffsByTx[d.tx_hash]) storageDiffsByTx[d.tx_hash] = [];
        storageDiffsByTx[d.tx_hash].push(d);
    }

    // Signal map
    const signalsByTx = {};
    for (const s of signals.allSignals || []) {
        if (!signalsByTx[s.tx_hash]) signalsByTx[s.tx_hash] = [];
        signalsByTx[s.tx_hash].push(s);
    }

    // New contracts set
    const newContracts = new Set((derived.contractInventory || []).map(c => c.address));

    // Net balance map
    const netBalMap = {};
    for (const n of derived.netBalanceChanges || []) netBalMap[n.address] = n;

    // ── Per-tx feature extraction ─────────────────────────────────────
    const features = [];

    for (const tx of rawData.transactions || []) {
        const hash = tx.tx_hash;
        const receipt = receiptMap[hash] || {};
        const trace = traceMap[hash];
        const bDiffs = balanceDiffsByTx[hash] || [];
        const sDiffs = storageDiffsByTx[hash] || [];
        const txSignals = signalsByTx[hash] || [];

        // ── Raw tx features ──────────────────────────────────────────
        const valueWei = BigInt(tx.value || '0');
        const gasLimit = parseInt(tx.gas || '0');
        const gasUsed = parseInt(receipt.gas_used || '0');
        const gasEfficiency = gasLimit > 0 ? gasUsed / gasLimit : 0;
        const inputLen = tx.input ? Math.max(0, (tx.input.length - 2) / 2) : 0;
        const isContractCreation = !tx.to;
        const selector = tx.input && tx.input.length >= 10 ? tx.input.slice(0, 10) : null;

        // ── Call trace features ──────────────────────────────────────
        let traceDepthMax = 0;
        let traceCallCount = 0;
        let traceReentrantCalls = 0;
        let traceValueMovedWei = 0n;
        let traceDelegateCalls = 0;
        let traceFailedSubcalls = 0;
        let traceUniqueContracts = 0;

        if (trace) {
            const flatCalls = [];
            flattenTrace(trace, flatCalls, 0);
            traceCallCount = flatCalls.length;
            traceDepthMax = Math.max(...flatCalls.map(c => c.depth), 0);
            traceDelegateCalls = flatCalls.filter(c => c.type === 'DELEGATECALL').length;
            traceFailedSubcalls = flatCalls.filter(c => c.error).length;
            traceUniqueContracts = new Set(flatCalls.map(c => c.to).filter(Boolean)).size;

            // Detect reentrant calls: same (from, to, input[0:10]) at depth > 1
            const callSigs = {};
            for (const c of flatCalls) {
                const sig = `${c.from}|${c.to}|${(c.input || '').slice(0, 10)}`;
                callSigs[sig] = (callSigs[sig] || 0) + 1;
            }
            traceReentrantCalls = Object.values(callSigs).filter(n => n >= 2).length;

            // Total ETH moved through internal calls
            for (const c of flatCalls) {
                try { traceValueMovedWei += BigInt(c.value || '0'); } catch (_) { }
            }
        }

        // ── State diff features (THE KEY ONES) ──────────────────────
        const balLosers = bDiffs.filter(d => BigInt(d.balance_delta || '0') < 0n);
        const balGainers = bDiffs.filter(d => BigInt(d.balance_delta || '0') > 0n);
        const totalEthLostWei = balLosers.reduce((s, d) => s + (-BigInt(d.balance_delta || '0')), 0n);
        const totalEthGainedWei = balGainers.reduce((s, d) => s + BigInt(d.balance_delta || '0'), 0n);
        const maxSingleLossWei = balLosers.reduce((m, d) => {
            const v = -BigInt(d.balance_delta || '0');
            return v > m ? v : m;
        }, 0n);
        const newContractGains = balGainers.filter(d => newContracts.has(d.address));
        // Suspicious only if a loser is NOT the sender (who naturally pays/sends ETH)
        const victimLosesAttackerGains = balLosers.some(d => d.address.toLowerCase() !== tx.from?.toLowerCase()) && newContractGains.length > 0;

        // Storage diff features
        const storageSlotCount = sDiffs.length;
        const storageContractCount = new Set(sDiffs.map(d => d.contract)).size;
        const zeroedSlots = sDiffs.filter(d =>
            d.value_after === null ||
            d.value_after === '0x0000000000000000000000000000000000000000000000000000000000000000'
        ).length;
        let maxStorageDeltaWei = 0n;
        for (const d of sDiffs) {
            try {
                const before = BigInt(d.value_before || '0x0');
                const after = BigInt(d.value_after || '0x0');
                const delta = after > before ? after - before : before - after;
                if (delta > maxStorageDeltaWei) maxStorageDeltaWei = delta;
            } catch (_) { }
        }

        // ── Signal features ──────────────────────────────────────────
        const signalCount = txSignals.length;
        const highSignals = txSignals.filter(s => s.confidence === 'HIGH').length;
        const medSignals = txSignals.filter(s => s.confidence === 'MEDIUM').length;
        const hasReentrancySignal = txSignals.some(s => s.rule_id.includes('REENTRANCY'));
        const hasFlashloanSignal = txSignals.some(s => s.rule_id.includes('FLASHLOAN'));
        const hasStateDiffSignal = txSignals.some(s => s.rule_id.startsWith('STATE_DIFF'));
        const hasVictimLosesAttackerGainsSignal = txSignals.some(s => s.rule_id === 'STATE_DIFF_VICTIM_LOSES_ATTACKER_GAINS');

        // ── Address profile features ─────────────────────────────────
        const senderProfile = netBalMap[tx.from?.toLowerCase()] || {};
        const senderIsNetGainer = senderProfile.is_net_gainer || false;
        const senderTxCount = senderProfile.tx_count || 0;
        const recipientIsNewContract = tx.to ? newContracts.has(tx.to.toLowerCase()) : false;

        // ── Composite suspicion score ────────────────────────────────
        // Weighted combination of all features — higher = more suspicious
        const suspicionScore = (
            (traceReentrantCalls > 0 ? 3 : 0) +
            (traceDepthMax >= 3 ? 2 : 0) +
            (victimLosesAttackerGains ? 5 : 0) +
            (zeroedSlots > 0 ? 2 : 0) +
            (storageSlotCount > 3 ? 1 : 0) +
            (highSignals * 2) +
            (medSignals * 1) +
            (hasStateDiffSignal ? 3 : 0) +
            (hasVictimLosesAttackerGainsSignal ? 5 : 0) +
            (newContractGains.length > 0 ? 2 : 0)
        );

        features.push({
            // Identity
            tx_hash: hash,
            block_number: tx.block_number,
            from: tx.from?.toLowerCase(),
            to: tx.to?.toLowerCase(),

            // Raw tx features
            value_eth: parseFloat(ethers.formatEther(valueWei)),
            gas_limit: gasLimit,
            gas_used: gasUsed,
            gas_efficiency: parseFloat(gasEfficiency.toFixed(4)),
            input_len_bytes: inputLen,
            is_contract_creation: isContractCreation ? 1 : 0,
            tx_status: receipt.status ?? -1,
            selector,

            // Trace features
            trace_depth_max: traceDepthMax,
            trace_call_count: traceCallCount,
            trace_reentrant_calls: traceReentrantCalls,
            trace_value_moved_eth: parseFloat(ethers.formatEther(traceValueMovedWei)),
            trace_delegate_calls: traceDelegateCalls,
            trace_failed_subcalls: traceFailedSubcalls,
            trace_unique_contracts: traceUniqueContracts,

            // STATE DIFF FEATURES — the critical ones
            state_balance_losers: balLosers.length,
            state_balance_gainers: balGainers.length,
            state_total_eth_lost: parseFloat(ethers.formatEther(totalEthLostWei)),
            state_total_eth_gained: parseFloat(ethers.formatEther(totalEthGainedWei)),
            state_max_single_loss_eth: parseFloat(ethers.formatEther(maxSingleLossWei)),
            state_new_contract_gains: newContractGains.length,
            state_victim_loses_attacker_gains: victimLosesAttackerGains ? 1 : 0,
            state_storage_slot_count: storageSlotCount,
            state_storage_contract_count: storageContractCount,
            state_zeroed_slots: zeroedSlots,
            state_max_storage_delta_eth: parseFloat(ethers.formatEther(maxStorageDeltaWei)),

            // Signal features
            signal_count: signalCount,
            signal_high_count: highSignals,
            signal_medium_count: medSignals,
            signal_has_reentrancy: hasReentrancySignal ? 1 : 0,
            signal_has_flashloan: hasFlashloanSignal ? 1 : 0,
            signal_has_state_diff: hasStateDiffSignal ? 1 : 0,
            signal_victim_loses_attacker_gains: hasVictimLosesAttackerGainsSignal ? 1 : 0,

            // Address profile features
            sender_is_net_gainer: senderIsNetGainer ? 1 : 0,
            sender_tx_count: senderTxCount,
            recipient_is_new_contract: recipientIsNewContract ? 1 : 0,

            // Composite score (for ranking / threshold-based detection)
            suspicion_score: suspicionScore,

            // Label placeholder (for supervised training — filled by analyst)
            label: null,
        });
    }

    // Sort by suspicion score descending
    features.sort((a, b) => b.suspicion_score - a.suspicion_score);

    writeFileSync(join(mlDir, 'ml_features_000001.ndjson'), ndjson(features));

    // Also write a summary of top suspicious txs
    const topSuspicious = features.filter(f => f.suspicion_score >= 5);
    writeFileSync(join(mlDir, 'top_suspicious_txs.ndjson'), ndjson(topSuspicious));

    // Feature schema (for ML pipeline documentation)
    const schema = {
        feature_count: features.length > 0 ? Object.keys(features[0]).filter(k => k !== 'tx_hash' && k !== 'from' && k !== 'to' && k !== 'selector' && k !== 'label').length : 0,
        state_diff_features: [
            'state_balance_losers', 'state_balance_gainers', 'state_total_eth_lost',
            'state_total_eth_gained', 'state_max_single_loss_eth', 'state_new_contract_gains',
            'state_victim_loses_attacker_gains', 'state_storage_slot_count',
            'state_storage_contract_count', 'state_zeroed_slots', 'state_max_storage_delta_eth',
        ],
        trace_features: [
            'trace_depth_max', 'trace_call_count', 'trace_reentrant_calls',
            'trace_value_moved_eth', 'trace_delegate_calls', 'trace_failed_subcalls', 'trace_unique_contracts',
        ],
        signal_features: [
            'signal_count', 'signal_high_count', 'signal_medium_count',
            'signal_has_reentrancy', 'signal_has_flashloan', 'signal_has_state_diff',
            'signal_victim_loses_attacker_gains',
        ],
        top_suspicious_count: topSuspicious.length,
        generated_at: new Date().toISOString(),
    };
    writeFileSync(join(mlDir, 'ml_feature_schema.json'), JSON.stringify(schema, null, 2));

    console.log(`[ml] ✓ ${features.length} tx feature vectors | ${topSuspicious.length} high-suspicion txs (score ≥5)`);
    console.log(`[ml]   State diff features: ${schema.state_diff_features.length} | Trace: ${schema.trace_features.length} | Signal: ${schema.signal_features.length}`);
    return { features, topSuspicious, schema };
}

function flattenTrace(node, out, depth) {
    if (!node) return;
    out.push({ type: node.type, from: node.from, to: node.to, value: node.value, input: node.input, error: node.error, depth });
    for (const child of node.calls || []) flattenTrace(child, out, depth + 1);
}
