/**
 * engine.js — Signals Engine (Layer 2)
 * Evaluates all 28 heuristic rules against derived datasets.
 * Each signal event includes evidence_refs pointing to source records.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { ethers } from 'ethers';
import { join } from 'path';

// ── Signal helpers ────────────────────────────────────────────────
function makeSignal(ruleId, ruleName, txHash, confidence, details, evidenceRefs) {
    return {
        record_id: `signal:${ruleId}:${txHash}:${Date.now()}`,
        rule_id: ruleId,
        rule_name: ruleName,
        tx_hash: txHash,
        confidence,        // 'HIGH' | 'MEDIUM' | 'LOW'
        details,
        evidence_refs: evidenceRefs,
        fired_at: new Date().toISOString(),
    };
}

export async function runSignalsEngine(derived, rawData, outputDir) {
    const bundleDir = join(outputDir, '02_forensic_bundle');
    const signalsDir = join(bundleDir, '03_signals');
    const metaDir = join(signalsDir, '_meta');
    const rollupDir = join(signalsDir, 'rollups');
    mkdirSync(metaDir, { recursive: true });
    mkdirSync(rollupDir, { recursive: true });

    const allSignals = [];

    // ════════════════════════════════════════════════════════════════
    // GROUP A: Reentrancy & Control-flow (6 rules)
    // ════════════════════════════════════════════════════════════════

    // Rule 1: REENTRANCY_SAME_FUNCTION_LOOP
    // Detect: same (from, to, selector) appears multiple times in trace at increasing depth
    if (derived.traceEdges?.length > 0) {
        const txGroups = groupBy(derived.traceEdges, 'tx_hash');
        for (const [txHash, edges] of Object.entries(txGroups)) {
            const callKey = (e) => `${e.from}|${e.to}|${e.selector}`;
            const seen = {};
            let maxDepth = 0;
            for (const e of edges) {
                const k = callKey(e);
                seen[k] = (seen[k] || 0) + 1;
                if (e.depth > maxDepth) maxDepth = e.depth;
            }
            const loops = Object.entries(seen).filter(([, count]) => count >= 2);
            if (loops.length > 0 && maxDepth >= 2) {
                allSignals.push(makeSignal(
                    'REENTRANCY_SAME_FUNCTION_LOOP', 'Reentrancy: Same Function Loop',
                    txHash, 'HIGH',
                    { repeated_calls: loops.map(([k, c]) => ({ call: k, count: c })), max_depth: maxDepth },
                    edges.slice(0, 3).map(e => ({ dataset: 'trace_edges', record_id: e.record_id }))
                ));
            }
        }
    }

    // Rule 2: REENTRANCY_CROSS_FUNCTION
    // Detect: tx has calls to 2+ different selectors on same contract, with depth > 1
    if (derived.traceEdges?.length > 0) {
        const txGroups = groupBy(derived.traceEdges, 'tx_hash');
        for (const [txHash, edges] of Object.entries(txGroups)) {
            const contractCalls = {};
            for (const e of edges) {
                if (!e.to || !e.selector) continue;
                if (!contractCalls[e.to]) contractCalls[e.to] = new Set();
                contractCalls[e.to].add(e.selector);
            }
            const crossFunc = Object.entries(contractCalls).filter(([, selectors]) => selectors.size >= 2);
            const hasDepth = edges.some(e => e.depth >= 2);
            if (crossFunc.length > 0 && hasDepth) {
                allSignals.push(makeSignal(
                    'REENTRANCY_CROSS_FUNCTION', 'Reentrancy: Cross-Function',
                    txHash, 'MEDIUM',
                    { contracts_with_multi_selectors: crossFunc.map(([addr, s]) => ({ addr, selectors: [...s] })) },
                    edges.slice(0, 2).map(e => ({ dataset: 'trace_edges', record_id: e.record_id }))
                ));
            }
        }
    }

    // Rule 3: REENTRANCY_EXTERNAL_CALLBACK_BEFORE_STATE_UPDATE
    // Detect: a CALL at depth > 0 followed by another CALL to same contract (state update pattern)
    if (derived.traceCallsFlat?.length > 0) {
        const txGroups = groupBy(derived.traceCallsFlat, 'tx_hash');
        for (const [txHash, calls] of Object.entries(txGroups)) {
            const deepCalls = calls.filter(c => c.depth >= 1 && c.call_type === 'CALL');
            if (deepCalls.length >= 2) {
                allSignals.push(makeSignal(
                    'REENTRANCY_EXTERNAL_CALLBACK_BEFORE_STATE_UPDATE',
                    'Reentrancy: External Callback Before State Update',
                    txHash, 'MEDIUM',
                    { deep_call_count: deepCalls.length },
                    deepCalls.slice(0, 2).map(c => ({ dataset: 'trace_calls_flat', record_id: c.record_id }))
                ));
            }
        }
    }

    // Rule 4: DELEGATECALL_IN_SENSITIVE_PATH
    if (derived.traceCallsFlat?.length > 0) {
        const delegateCalls = derived.traceCallsFlat.filter(c => c.call_type === 'DELEGATECALL');
        const txsWithDelegate = [...new Set(delegateCalls.map(c => c.tx_hash))];
        for (const txHash of txsWithDelegate) {
            const dcs = delegateCalls.filter(c => c.tx_hash === txHash);
            allSignals.push(makeSignal(
                'DELEGATECALL_IN_SENSITIVE_PATH', 'DELEGATECALL in Sensitive Path',
                txHash, 'MEDIUM',
                { delegatecall_count: dcs.length, targets: [...new Set(dcs.map(c => c.to))] },
                dcs.slice(0, 2).map(c => ({ dataset: 'trace_calls_flat', record_id: c.record_id }))
            ));
        }
    }

    // Rule 5: MULTIPLE_WITHDRAWS_SINGLE_TX
    // Detect: tx has multiple calls to same selector on same contract (withdraw pattern)
    if (derived.traceEdges?.length > 0) {
        const txGroups = groupBy(derived.traceEdges, 'tx_hash');
        for (const [txHash, edges] of Object.entries(txGroups)) {
            const callCounts = {};
            for (const e of edges) {
                const k = `${e.to}|${e.selector}`;
                callCounts[k] = (callCounts[k] || 0) + 1;
            }
            const multiWithdraws = Object.entries(callCounts).filter(([, c]) => c >= 2);
            if (multiWithdraws.length > 0) {
                allSignals.push(makeSignal(
                    'MULTIPLE_WITHDRAWS_SINGLE_TX', 'Multiple Withdraws in Single TX',
                    txHash, 'HIGH',
                    { repeated_calls: multiWithdraws.map(([k, c]) => ({ call: k, count: c })) },
                    edges.slice(0, 2).map(e => ({ dataset: 'trace_edges', record_id: e.record_id }))
                ));
            }
        }
    }

    // Rule 6: REVERT_AFTER_PARTIAL_STATE_CHANGE
    if (derived.traceCallsFlat?.length > 0) {
        const txGroups = groupBy(derived.traceCallsFlat, 'tx_hash');
        for (const [txHash, calls] of Object.entries(txGroups)) {
            const hasRevert = calls.some(c => c.error || c.revert_reason);
            const hasSuccess = calls.some(c => !c.error && c.depth > 0);
            if (hasRevert && hasSuccess) {
                const revertedCalls = calls.filter(c => c.error);
                allSignals.push(makeSignal(
                    'REVERT_AFTER_PARTIAL_STATE_CHANGE', 'Revert After Partial State Change',
                    txHash, 'LOW',
                    { reverted_calls: revertedCalls.length },
                    revertedCalls.slice(0, 1).map(c => ({ dataset: 'trace_calls_flat', record_id: c.record_id }))
                ));
            }
        }
    }

    // ════════════════════════════════════════════════════════════════
    // GROUP B: Approvals & Allowance Abuse (4 rules)
    // ════════════════════════════════════════════════════════════════

    // Rule 7: APPROVAL_UNLIMITED_TO_NEW_SPENDER
    if (derived.approvals?.length > 0) {
        const unlimitedApprovals = derived.approvals.filter(a => a.is_unlimited);
        for (const approval of unlimitedApprovals) {
            allSignals.push(makeSignal(
                'APPROVAL_UNLIMITED_TO_NEW_SPENDER', 'Unlimited Approval to New Spender',
                approval.tx_hash, 'MEDIUM',
                { token: approval.token_address, owner: approval.owner, spender: approval.spender },
                [{ dataset: 'approvals_unified', record_id: approval.record_id }]
            ));
        }
    }

    // Rule 8: ALLOWANCE_DRAIN_BURST_TRANSFERFROM
    // Detect: multiple ERC20 transfers from same spender in short window
    if (derived.erc20Transfers?.length > 0) {
        const spenderGroups = groupBy(derived.erc20Transfers, 'from');
        for (const [spender, transfers] of Object.entries(spenderGroups)) {
            if (transfers.length >= 3) {
                const totalAmount = transfers.reduce((s, t) => s + BigInt(t.amount || 0), 0n);
                allSignals.push(makeSignal(
                    'ALLOWANCE_DRAIN_BURST_TRANSFERFROM', 'Allowance Drain Burst TransferFrom',
                    transfers[0].tx_hash, 'HIGH',
                    { spender, transfer_count: transfers.length, total_amount: totalAmount.toString() },
                    transfers.slice(0, 2).map(t => ({ dataset: 'token_transfers_erc20', record_id: t.record_id }))
                ));
            }
        }
    }

    // Rule 9: APPROVAL_AND_DRAIN_WITHIN_SHORT_WINDOW
    if (derived.approvals?.length > 0 && derived.erc20Transfers?.length > 0) {
        for (const approval of derived.approvals) {
            const drains = derived.erc20Transfers.filter(
                t => t.from === approval.spender &&
                    Math.abs(t.block_number - approval.block_number) <= 5
            );
            if (drains.length > 0) {
                allSignals.push(makeSignal(
                    'APPROVAL_AND_DRAIN_WITHIN_SHORT_WINDOW', 'Approval and Drain Within Short Window',
                    approval.tx_hash, 'HIGH',
                    { spender: approval.spender, drain_txs: drains.map(d => d.tx_hash) },
                    [
                        { dataset: 'approvals_unified', record_id: approval.record_id },
                        ...drains.slice(0, 1).map(d => ({ dataset: 'token_transfers_erc20', record_id: d.record_id })),
                    ]
                ));
            }
        }
    }

    // Rule 10: ALLOWANCE_SPENDER_ROLE_ANOMALY
    // Detect: spender is a newly deployed contract (in contractInventory)
    if (derived.approvals?.length > 0 && derived.contractInventory?.length > 0) {
        const newContracts = new Set(derived.contractInventory.map(c => c.address));
        for (const approval of derived.approvals) {
            if (newContracts.has(approval.spender)) {
                allSignals.push(makeSignal(
                    'ALLOWANCE_SPENDER_ROLE_ANOMALY', 'Allowance Spender Role Anomaly',
                    approval.tx_hash, 'MEDIUM',
                    { spender: approval.spender, note: 'spender is a newly deployed contract' },
                    [{ dataset: 'approvals_unified', record_id: approval.record_id }]
                ));
            }
        }
    }

    // ════════════════════════════════════════════════════════════════
    // GROUP C: Flashloan Patterns (4 rules)
    // ════════════════════════════════════════════════════════════════

    // Rule 11: FLASHLOAN_BORROW_REPAY_SAME_TX
    // Detect: tx has large ETH inflow AND outflow (net ~0), with deep call tree
    if (derived.traceCallsFlat?.length > 0 && derived.txEnriched?.length > 0) {
        const txGroups = groupBy(derived.traceCallsFlat, 'tx_hash');
        for (const [txHash, calls] of Object.entries(txGroups)) {
            const tx = derived.txEnriched.find(t => t.tx_hash === txHash);
            if (!tx) continue;
            const maxDepth = Math.max(...calls.map(c => c.depth));
            const callsWithValue = calls.filter(c => c.value && BigInt(c.value) > 0n);
            const totalCallValue = callsWithValue.reduce((s, c) => s + BigInt(c.value), 0n);
            // Flashloan heuristic: deep call tree + large value movement + tx value ~0
            if (maxDepth >= 3 && totalCallValue > ethers.parseEther('1') && BigInt(tx.value_wei || 0) < ethers.parseEther('0.1')) {
                allSignals.push(makeSignal(
                    'FLASHLOAN_BORROW_REPAY_SAME_TX', 'Flashloan: Borrow and Repay in Same TX',
                    txHash, 'HIGH',
                    { max_depth: maxDepth, total_call_value_wei: totalCallValue.toString(), tx_value_wei: tx.value_wei },
                    calls.slice(0, 3).map(c => ({ dataset: 'trace_calls_flat', record_id: c.record_id }))
                ));
            }
        }
    }

    // Rule 12: FLASHLOAN_MULTI_POOL_HOPS
    // Detect: tx calls 3+ distinct contracts with value transfers
    if (derived.traceEdges?.length > 0) {
        const txGroups = groupBy(derived.traceEdges, 'tx_hash');
        for (const [txHash, edges] of Object.entries(txGroups)) {
            const contractsWithValue = new Set(
                edges.filter(e => e.value && BigInt(e.value) > 0n).map(e => e.to)
            );
            if (contractsWithValue.size >= 3) {
                allSignals.push(makeSignal(
                    'FLASHLOAN_MULTI_POOL_HOPS', 'Flashloan: Multi-Pool Hops',
                    txHash, 'MEDIUM',
                    { pool_count: contractsWithValue.size, pools: [...contractsWithValue] },
                    edges.slice(0, 2).map(e => ({ dataset: 'trace_edges', record_id: e.record_id }))
                ));
            }
        }
    }

    // Rule 13: FLASHLOAN_ENABLING_LARGE_PRICE_IMPACT
    // Detect: tx with very deep calls + large value movement (proxy for price manipulation)
    if (derived.traceCallsFlat?.length > 0) {
        const txGroups = groupBy(derived.traceCallsFlat, 'tx_hash');
        for (const [txHash, calls] of Object.entries(txGroups)) {
            const maxDepth = Math.max(...calls.map(c => c.depth));
            const valueMovement = calls
                .filter(c => c.value && BigInt(c.value) > 0n)
                .reduce((s, c) => s + BigInt(c.value), 0n);
            if (maxDepth >= 4 && valueMovement > ethers.parseEther('5')) {
                allSignals.push(makeSignal(
                    'FLASHLOAN_ENABLING_LARGE_PRICE_IMPACT', 'Flashloan Enabling Large Price Impact',
                    txHash, 'MEDIUM',
                    { max_depth: maxDepth, value_moved_wei: valueMovement.toString() },
                    calls.slice(0, 2).map(c => ({ dataset: 'trace_calls_flat', record_id: c.record_id }))
                ));
            }
        }
    }

    // Rule 14: FLASHLOAN_WITH_EXTRACTION_OUTFLOW
    // Detect: tx where a new contract receives ETH AND call depth >= 3 (not just a deploy)
    // Without depth check this fires on every contract deployment funded by deployer.
    if (derived.fundFlowEdges?.length > 0 && derived.contractInventory?.length > 0 && derived.traceCallsFlat?.length > 0) {
        const newContracts = new Set(derived.contractInventory.map(c => c.address));
        const deepTxs = new Set(
            derived.traceCallsFlat.filter(c => c.depth >= 3).map(c => c.tx_hash)
        );
        const txGroups = groupBy(derived.fundFlowEdges, 'tx_hash');
        for (const [txHash, edges] of Object.entries(txGroups)) {
            if (!deepTxs.has(txHash)) continue; // skip shallow txs (deploys, simple transfers)
            const extractionEdges = edges.filter(e => newContracts.has(e.to) && BigInt(e.amount_wei || 0) > ethers.parseEther('0.5'));
            if (extractionEdges.length > 0) {
                allSignals.push(makeSignal(
                    'FLASHLOAN_WITH_EXTRACTION_OUTFLOW', 'Flashloan with Extraction Outflow',
                    txHash, 'HIGH',
                    { extraction_targets: extractionEdges.map(e => e.to) },
                    extractionEdges.slice(0, 2).map(e => ({ dataset: 'fund_flow_edges', record_id: e.record_id }))
                ));
            }
        }
    }

    // ════════════════════════════════════════════════════════════════
    // GROUP D: Oracle / Price Manipulation (4 rules) — simplified
    // ════════════════════════════════════════════════════════════════

    // Rule 15: ORACLE_PRICE_DEVIATION_SAME_BLOCK — requires oracle data (best-effort)
    // Rule 16: DEX_SPOT_PRICE_IMPACT_SPIKE — detect large single-tx ETH swap (>20 ETH to avoid noise)
    if (derived.nativeTransfers?.length > 0 && derived.txEnriched?.length > 0) {
        const txMap = {};
        for (const tx of derived.txEnriched) txMap[tx.tx_hash] = tx;

        const blockGroups = groupBy(derived.nativeTransfers, 'block_number');
        for (const [blockNum, transfers] of Object.entries(blockGroups)) {
            const largeTransfers = transfers.filter(t => {
                // Filter out transfers where sender is the tx origin (Funding)
                const tx = txMap[t.tx_hash];
                if (tx && t.from.toLowerCase() === tx.from?.toLowerCase()) return false;
                return BigInt(t.value_wei || 0) > ethers.parseEther('20');
            });

            if (largeTransfers.length > 0) {
                allSignals.push(makeSignal(
                    'DEX_SPOT_PRICE_IMPACT_SPIKE', 'DEX Spot Price Impact Spike',
                    largeTransfers[0].tx_hash, 'MEDIUM',
                    { block: blockNum, large_transfer_count: largeTransfers.length },
                    largeTransfers.slice(0, 1).map(t => ({ dataset: 'native_internal_transfers', record_id: t.record_id }))
                ));
            }
        }
    }

    // Rule 17: SANDWICH_LIKE_PRICE_IMPACT_AROUND_TARGET — needs ordering context (skip if no traces)
    // Rule 18: ARBITRAGE_LOOP_WITH_VICTIM_INTERACTION — detect circular fund flow
    if (derived.fundFlowEdges?.length > 0) {
        const txGroups = groupBy(derived.fundFlowEdges, 'tx_hash');
        for (const [txHash, edges] of Object.entries(txGroups)) {
            const addresses = edges.map(e => e.from).concat(edges.map(e => e.to));
            const duplicates = addresses.filter((a, i) => addresses.indexOf(a) !== i);
            if (duplicates.length >= 2) {
                allSignals.push(makeSignal(
                    'ARBITRAGE_LOOP_WITH_VICTIM_INTERACTION', 'Arbitrage Loop with Victim Interaction',
                    txHash, 'LOW',
                    { circular_addresses: [...new Set(duplicates)] },
                    edges.slice(0, 2).map(e => ({ dataset: 'fund_flow_edges', record_id: e.record_id }))
                ));
            }
        }
    }

    // ════════════════════════════════════════════════════════════════
    // GROUP E: Admin / Upgrade / Config Abuse (4 rules)
    // ════════════════════════════════════════════════════════════════
    // Rules 19-22 require proxy/admin events — emit coverage gap if no relevant events found
    const adminSignalsCoverage = { note: 'No proxy/admin events detected in this dataset. Rules 19-22 not fired.' };

    // ════════════════════════════════════════════════════════════════
    // GROUP F: Fund Flow Anomalies (6 rules)
    // ════════════════════════════════════════════════════════════════

    // Rule 23: VICTIM_NET_OUTFLOW_SPIKE
    if (derived.addressProfiles?.length > 0) {
        const largeOutflows = derived.addressProfiles.filter(p => {
            const outflow = BigInt(p.total_outflow_wei || 0);
            const inflow = BigInt(p.total_inflow_wei || 0);
            return outflow > ethers.parseEther('5') && outflow > inflow * 2n;
        });
        for (const profile of largeOutflows) {
            allSignals.push(makeSignal(
                'VICTIM_NET_OUTFLOW_SPIKE', 'Victim Net Outflow Spike',
                'N/A', 'HIGH',
                { address: profile.address, outflow_eth: ethers.formatEther(BigInt(profile.total_outflow_wei)), net_flow_wei: profile.net_flow_wei },
                [{ dataset: 'address_profile', record_id: profile.record_id }]
            ));
        }
    }

    // Rule 24: NEW_RECEIVER_FIRST_SEEN_AND_LARGE_INFLOW
    // Refined: Exclusion logic — if sender is the tx origin, it's likely funding/setup.
    // We strictly want to detect: Contract/Victim -> New Receiver (Theft)
    if (derived.contractInventory?.length > 0 && derived.fundFlowEdges?.length > 0 && derived.txEnriched?.length > 0) {
        const txMap = {};
        for (const tx of derived.txEnriched) txMap[tx.tx_hash] = tx;

        const newContracts = new Set(derived.contractInventory.map(c => c.address));
        const newContractInflows = derived.fundFlowEdges.filter(
            e => newContracts.has(e.to) && BigInt(e.amount_wei || 0) > ethers.parseEther('1')
        );
        for (const edge of newContractInflows) {
            const tx = txMap[edge.tx_hash];
            if (!tx) continue;
            // False Positive Filter: If sender is the transaction origin, it's EOA funding a contract (Setup)
            if (edge.from.toLowerCase() === tx.from.toLowerCase()) continue;

            allSignals.push(makeSignal(
                'NEW_RECEIVER_FIRST_SEEN_AND_LARGE_INFLOW', 'New Receiver First Seen with Large Inflow',
                edge.tx_hash, 'HIGH',
                { receiver: edge.to, amount_wei: edge.amount_wei, sender: edge.from },
                [{ dataset: 'fund_flow_edges', record_id: edge.record_id }]
            ));
        }
    }

    // Rule 25: PEEL_CHAIN_PATTERN
    // Detect: A→B→C→D linear chain of transfers
    if (derived.fundFlowEdges?.length > 0) {
        const outMap = {};
        for (const e of derived.fundFlowEdges) {
            if (!outMap[e.from]) outMap[e.from] = [];
            outMap[e.from].push(e.to);
        }
        for (const [start, nexts] of Object.entries(outMap)) {
            if (nexts.length === 1 && outMap[nexts[0]]?.length === 1) {
                allSignals.push(makeSignal(
                    'PEEL_CHAIN_PATTERN', 'Peel Chain Pattern',
                    'N/A', 'LOW',
                    { chain_start: start, chain: [start, nexts[0], outMap[nexts[0]][0]] },
                    []
                ));
            }
        }
    }

    // Rule 26: CONSOLIDATION_TO_FEW_SINKS
    if (derived.fundFlowEdges?.length > 0) {
        const sinkCounts = {};
        for (const e of derived.fundFlowEdges) {
            sinkCounts[e.to] = (sinkCounts[e.to] || 0) + 1;
        }
        const hotSinks = Object.entries(sinkCounts).filter(([, c]) => c >= 3);
        for (const [sink, count] of hotSinks) {
            allSignals.push(makeSignal(
                'CONSOLIDATION_TO_FEW_SINKS', 'Consolidation to Few Sinks',
                'N/A', 'MEDIUM',
                { sink, inflow_count: count },
                []
            ));
        }
    }

    // Rule 27: HOP_TO_KNOWN_RISKY_DESTINATION — only if IOCs provided (skip)
    // Rule 28: ASSET_DIVERSIFICATION_POST_EXPLOIT
    if (derived.erc20Transfers?.length > 0 && derived.nativeTransfers?.length > 0) {
        const txsWithBoth = new Set(
            derived.erc20Transfers.map(t => t.tx_hash).filter(
                h => derived.nativeTransfers.some(t => t.tx_hash === h)
            )
        );
        for (const txHash of txsWithBoth) {
            allSignals.push(makeSignal(
                'ASSET_DIVERSIFICATION_POST_EXPLOIT', 'Asset Diversification Post Exploit',
                txHash, 'MEDIUM',
                { note: 'TX contains both native ETH and ERC20 transfers — possible diversification' },
                []
            ));
        }
    }

    // ════════════════════════════════════════════════════════════════
    // GROUP G: State Diff Analysis (8 rules) — uses balance/storage diffs
    // These rules fire on evidence that ONLY exists in state diffs,
    // not in traces or logs. Critical for reentrancy and oracle attacks.
    // ════════════════════════════════════════════════════════════════

    // Rule G1: STATE_DIFF_CONTRACT_BALANCE_DRAINED
    // Contract loses >70% of its ETH balance in a single tx (raised from 50% to reduce noise)
    // Also requires minimum balance of 2 ETH to avoid noise on tiny balances
    if (derived.balanceDiffs?.length > 0) {
        const contractLosses = derived.balanceDiffs.filter(d =>
            d.is_loss && BigInt(d.balance_before || '0') > ethers.parseEther('2')
        );
        for (const d of contractLosses) {
            const before = BigInt(d.balance_before);
            const delta = BigInt(d.balance_delta);
            const pct = before > 0n ? Number((-delta * 100n) / before) : 0;
            if (pct >= 70) {
                allSignals.push(makeSignal(
                    'STATE_DIFF_CONTRACT_BALANCE_DRAINED', 'State Diff: Contract Balance Drained ≥70%',
                    d.tx_hash, 'HIGH',
                    { address: d.address, balance_before_eth: ethers.formatEther(before), drained_pct: pct, delta_eth: d.balance_delta_eth },
                    [{ dataset: 'balance_diffs', record_id: d.record_id }]
                ));
            }
        }
    }

    // Rule G2: STATE_DIFF_UNEXPECTED_ETH_GAIN
    // An address gains ETH without being the tx.to — internal transfer via callback
    // Threshold: >=1 ETH gain (raised from 0.5 to avoid noise on gas refunds / small transfers)
    // Also: skip if the gainer is the tx.from (attacker sending ETH to themselves is normal)
    if (derived.balanceDiffs?.length > 0 && derived.txEnriched?.length > 0) {
        const txMap = {};
        for (const tx of derived.txEnriched) txMap[tx.tx_hash] = tx;
        for (const d of derived.balanceDiffs) {
            if (!d.is_gain) continue;
            const tx = txMap[d.tx_hash];
            if (!tx) continue;
            const gain = BigInt(d.balance_delta);
            // Not the direct recipient, not the sender, gain >= 1 ETH
            if (d.address !== tx.to && d.address !== tx.from && gain >= ethers.parseEther('1')) {
                allSignals.push(makeSignal(
                    'STATE_DIFF_UNEXPECTED_ETH_GAIN', 'State Diff: Unexpected ETH Gain (Not TX Recipient)',
                    d.tx_hash, 'HIGH',
                    { gainer: d.address, tx_recipient: tx.to, gain_eth: d.balance_delta_eth },
                    [{ dataset: 'balance_diffs', record_id: d.record_id }]
                ));
            }
        }
    }

    // Rule G3: STATE_DIFF_STORAGE_SLOT_ZEROED_THEN_REFILLED
    // A storage slot goes from non-zero → zero (balance cleared) — reentrancy signature
    if (derived.storageDiffs?.length > 0) {
        const zeroedSlots = derived.storageDiffs.filter(d => {
            const before = d.value_before;
            const after = d.value_after;
            return before && before !== '0x0000000000000000000000000000000000000000000000000000000000000000'
                && (after === null || after === '0x0000000000000000000000000000000000000000000000000000000000000000');
        });
        const byTx = groupBy(zeroedSlots, 'tx_hash');
        for (const [txHash, slots] of Object.entries(byTx)) {
            allSignals.push(makeSignal(
                'STATE_DIFF_STORAGE_SLOT_ZEROED', 'State Diff: Storage Slot Zeroed (Balance Cleared)',
                txHash, 'MEDIUM',
                { zeroed_slot_count: slots.length, contracts: [...new Set(slots.map(s => s.contract))] },
                slots.slice(0, 2).map(s => ({ dataset: 'storage_diffs', record_id: s.record_id }))
            ));
        }
    }

    // Rule G4: STATE_DIFF_MULTI_CONTRACT_BALANCE_CHANGE_SINGLE_TX
    // 3+ addresses have ETH balance changes in one tx — complex multi-hop attack
    // Requires: at least 1 loser with >1 ETH loss AND 1 gainer — avoids noise on simple deposits
    if (derived.balanceDiffs?.length > 0) {
        const byTx = groupBy(derived.balanceDiffs, 'tx_hash');
        for (const [txHash, diffs] of Object.entries(byTx)) {
            if (diffs.length >= 3) {
                const losers = diffs.filter(d => d.is_loss && BigInt(d.balance_delta || '0') < -ethers.parseEther('1'));
                const gainers = diffs.filter(d => d.is_gain);
                if (losers.length >= 1 && gainers.length >= 1) {
                    allSignals.push(makeSignal(
                        'STATE_DIFF_MULTI_CONTRACT_BALANCE_CHANGE', 'State Diff: Multi-Contract Balance Change (Complex Attack)',
                        txHash, 'HIGH',
                        {
                            total_addresses_changed: diffs.length,
                            losers: losers.map(d => ({ addr: d.address, delta_eth: d.balance_delta_eth })),
                            gainers: gainers.map(d => ({ addr: d.address, delta_eth: d.balance_delta_eth })),
                        },
                        diffs.slice(0, 3).map(d => ({ dataset: 'balance_diffs', record_id: d.record_id }))
                    ));
                }
            }
        }
    }

    // Rule G5: STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT
    // Refined: Check if gains are only from deployer (Funding)
    if (derived.netBalanceChanges?.length > 0 && derived.contractInventory?.length > 0 && derived.txEnriched?.length > 0) {
        const txMap = {};
        for (const tx of derived.txEnriched) txMap[tx.tx_hash] = tx;

        // Map contract -> deployer
        const deployerMap = {};
        for (const c of derived.contractInventory) deployerMap[c.address.toLowerCase()] = c.deployed_by?.toLowerCase();

        const newContracts = new Set(derived.contractInventory.map(c => c.address));
        const newContractGainers = derived.netBalanceChanges.filter(n =>
            n.is_net_gainer && newContracts.has(n.address) && BigInt(n.total_delta_wei) > ethers.parseEther('0.5')
        );

        for (const gainer of newContractGainers) {
            const deployer = deployerMap[gainer.address.toLowerCase()];
            const gainTxs = gainer.tx_hashes || [];

            // Check if ANY gain tx is from someone OTHER than deployer
            // We need to look at specific txs. But here we only have list of txs involved in balance change.
            // We assume if ALL txs involved are from deployer, it's funding.
            let hasExternalFunding = false;
            for (const h of gainTxs) {
                const tx = txMap[h];
                if (tx && tx.from.toLowerCase() !== deployer) {
                    hasExternalFunding = true; // Found a non-deployer interaction
                    break;
                }
            }

            // Filter: If all balance-changing txs are from deployer, skip (it's safely setup)
            if (!hasExternalFunding && deployer) continue;

            allSignals.push(makeSignal(
                'STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT', 'State Diff: New Contract is Net ETH Gainer (Attacker Extraction)',
                gainer.tx_hashes?.[0] || 'N/A', 'HIGH',
                { contract: gainer.address, net_gain_eth: gainer.total_delta_eth, tx_count: gainer.tx_count, note: 'Contains non-deployer funding' },
                [{ dataset: 'net_balance_changes', record_id: gainer.record_id }]
            ));
        }
    }

    // Rule G6: STATE_DIFF_REENTRANCY_PATTERN_CONFIRMED
    // Uses reentrancy_patterns derived dataset.
    // Tightened: requires suspicion_score >= 4 AND at least 2 storage changes
    // (a simple deposit+withdraw has score ~2 and 1 storage change)
    if (derived.reentrantPatterns?.length > 0) {
        for (const pattern of derived.reentrantPatterns) {
            if (pattern.suspicion_score < 4 || pattern.storage_changes < 2) continue;
            // Also require at least 0.5 ETH lost
            const totalLost = pattern.eth_losers.reduce((s, e) => {
                try { return s + Math.abs(parseFloat(e.delta_eth)); } catch { return s; }
            }, 0);
            if (totalLost < 0.5) continue;
            allSignals.push(makeSignal(
                'STATE_DIFF_REENTRANCY_PATTERN_CONFIRMED', 'State Diff: Reentrancy Pattern Confirmed',
                pattern.tx_hash, 'HIGH',
                {
                    suspicion_score: pattern.suspicion_score,
                    eth_losers: pattern.eth_losers,
                    eth_gainers: pattern.eth_gainers,
                    storage_changes: pattern.storage_changes,
                    contracts_with_storage_change: pattern.contracts_with_storage_change,
                    total_eth_lost: totalLost,
                },
                pattern.evidence_refs
            ));
        }
    }

    // Rule G7: STATE_DIFF_STORAGE_MANIPULATION_LARGE_DELTA
    // Refined: Only fire if before value was NOT zero (ignore initialization)
    if (derived.storageDiffs?.length > 0) {
        for (const d of derived.storageDiffs) {
            try {
                const before = BigInt(d.value_before || '0x0');
                const after = BigInt(d.value_after || '0x0');
                const delta = after > before ? after - before : before - after;

                // Ignore initialization (0 -> X)
                if (before === 0n) continue;

                // If slot value changes by more than 1e18 (1 ETH in wei, typical for balance mappings)
                if (delta > ethers.parseEther('10')) {
                    allSignals.push(makeSignal(
                        'STATE_DIFF_STORAGE_LARGE_VALUE_CHANGE', 'State Diff: Storage Slot Large Value Change (Oracle/Balance Manipulation)',
                        d.tx_hash, 'MEDIUM',
                        { contract: d.contract, slot: d.slot, delta_wei: delta.toString() },
                        [{ dataset: 'storage_diffs', record_id: d.record_id }]
                    ));
                }
            } catch (_) { /* non-numeric slot value, skip */ }
        }
    }

    // Rule G8: STATE_DIFF_VICTIM_LOSES_ATTACKER_GAINS_SAME_TX
    // Refined: Requires loser != sender
    if (derived.balanceDiffs?.length > 0 && derived.storageDiffs?.length > 0 && derived.contractInventory?.length > 0 && derived.txEnriched?.length > 0) {
        const txMap = {};
        for (const tx of derived.txEnriched) txMap[tx.tx_hash] = tx;

        const newContracts = new Set(derived.contractInventory.map(c => c.address));
        const byTx = groupBy(derived.balanceDiffs, 'tx_hash');
        const storageTxs = new Set(derived.storageDiffs.map(d => d.tx_hash));

        for (const [txHash, diffs] of Object.entries(byTx)) {
            if (!storageTxs.has(txHash)) continue;
            const tx = txMap[txHash];
            if (!tx) continue;

            const losers = diffs.filter(d => d.is_loss && d.address.toLowerCase() !== tx.from.toLowerCase());
            const newContractGainers = diffs.filter(d => d.is_gain && newContracts.has(d.address));

            if (losers.length > 0 && newContractGainers.length > 0) {
                allSignals.push(makeSignal(
                    'STATE_DIFF_VICTIM_LOSES_ATTACKER_GAINS', 'State Diff: Victim Loses ETH, New Contract Gains (Confirmed Exploit)',
                    txHash, 'HIGH',
                    {
                        victim_losers: losers.map(d => ({ addr: d.address, delta_eth: d.balance_delta_eth })),
                        attacker_gainers: newContractGainers.map(d => ({ addr: d.address, delta_eth: d.balance_delta_eth })),
                        storage_changes_in_tx: derived.storageDiffs.filter(d => d.tx_hash === txHash).length,
                    },
                    [
                        ...losers.slice(0, 1).map(d => ({ dataset: 'balance_diffs', record_id: d.record_id })),
                        ...newContractGainers.slice(0, 1).map(d => ({ dataset: 'balance_diffs', record_id: d.record_id })),
                    ]
                ));
            }
        }
    }

    // ── Write outputs ────────────────────────────────────────────────
    writeFileSync(
        join(signalsDir, 'signals_000001.ndjson'),
        allSignals.map(s => JSON.stringify(s)).join('\n') + '\n'
    );

    // Rollups
    const byTx = groupBy(allSignals.filter(s => s.tx_hash !== 'N/A'), 'tx_hash');
    writeFileSync(
        join(rollupDir, 'signals_by_tx_000001.ndjson'),
        Object.entries(byTx).map(([tx, sigs]) =>
            JSON.stringify({ tx_hash: tx, signal_count: sigs.length, rules: sigs.map(s => s.rule_id) })
        ).join('\n') + '\n'
    );

    // Signals catalog
    const catalog = SIGNAL_CATALOG;
    writeFileSync(join(metaDir, 'signals_catalog.json'), JSON.stringify(catalog, null, 2));

    // Coverage report
    const firedRules = new Set(allSignals.map(s => s.rule_id));
    const coverageReport = catalog.map(rule => ({
        rule_id: rule.rule_id,
        fired: firedRules.has(rule.rule_id),
        count: allSignals.filter(s => s.rule_id === rule.rule_id).length,
    }));
    writeFileSync(join(metaDir, 'signals_coverage_report.json'), JSON.stringify(coverageReport, null, 2));

    console.log(`[signals] Fired ${allSignals.length} signal events across ${firedRules.size}/36 rules`);
    return { allSignals, totalFired: allSignals.length, firedRules: [...firedRules] };
}

function groupBy(arr, key) {
    const result = {};
    for (const item of arr) {
        const k = item[key];
        if (!result[k]) result[k] = [];
        result[k].push(item);
    }
    return result;
}



const SIGNAL_CATALOG = [
    { rule_id: 'REENTRANCY_SAME_FUNCTION_LOOP', group: 'A', description: 'Same function called recursively in single tx' },
    { rule_id: 'REENTRANCY_CROSS_FUNCTION', group: 'A', description: 'Two different functions on same contract called in reentrant pattern' },
    { rule_id: 'REENTRANCY_EXTERNAL_CALLBACK_BEFORE_STATE_UPDATE', group: 'A', description: 'External call at depth > 0 before state finalized' },
    { rule_id: 'DELEGATECALL_IN_SENSITIVE_PATH', group: 'A', description: 'DELEGATECALL detected in call trace' },
    { rule_id: 'MULTIPLE_WITHDRAWS_SINGLE_TX', group: 'A', description: 'Same withdraw selector called multiple times in one tx' },
    { rule_id: 'REVERT_AFTER_PARTIAL_STATE_CHANGE', group: 'A', description: 'Sub-call reverted after other sub-calls succeeded' },
    { rule_id: 'APPROVAL_UNLIMITED_TO_NEW_SPENDER', group: 'B', description: 'Max uint256 approval granted to an address' },
    { rule_id: 'ALLOWANCE_DRAIN_BURST_TRANSFERFROM', group: 'B', description: 'Burst of ERC20 TransferFrom from same spender' },
    { rule_id: 'APPROVAL_AND_DRAIN_WITHIN_SHORT_WINDOW', group: 'B', description: 'Approval followed by drain within 5 blocks' },
    { rule_id: 'ALLOWANCE_SPENDER_ROLE_ANOMALY', group: 'B', description: 'Spender is a newly deployed contract' },
    { rule_id: 'FLASHLOAN_BORROW_REPAY_SAME_TX', group: 'C', description: 'Large value movement with deep call tree and near-zero tx value' },
    { rule_id: 'FLASHLOAN_MULTI_POOL_HOPS', group: 'C', description: 'Value sent to 3+ distinct contracts in one tx' },
    { rule_id: 'FLASHLOAN_ENABLING_LARGE_PRICE_IMPACT', group: 'C', description: 'Deep call tree with large value movement' },
    { rule_id: 'FLASHLOAN_WITH_EXTRACTION_OUTFLOW', group: 'C', description: 'New contract receives ETH in same tx as flashloan pattern' },
    { rule_id: 'ORACLE_PRICE_DEVIATION_SAME_BLOCK', group: 'D', description: 'Oracle price deviates significantly within same block' },
    { rule_id: 'DEX_SPOT_PRICE_IMPACT_SPIKE', group: 'D', description: 'Large single-tx ETH transfer suggesting price impact' },
    { rule_id: 'SANDWICH_LIKE_PRICE_IMPACT_AROUND_TARGET', group: 'D', description: 'Tx sandwiched by same-address txs with price impact' },
    { rule_id: 'ARBITRAGE_LOOP_WITH_VICTIM_INTERACTION', group: 'D', description: 'Circular fund flow in single tx' },
    { rule_id: 'PROXY_IMPLEMENTATION_CHANGED', group: 'E', description: 'Proxy upgrade event detected' },
    { rule_id: 'PRIVILEGED_ROLE_CHANGED', group: 'E', description: 'Admin/owner role change event detected' },
    { rule_id: 'SUSPICIOUS_ADMIN_CALL_SEQUENCE', group: 'E', description: 'Admin calls followed by asset movement' },
    { rule_id: 'UPGRADE_FOLLOWED_BY_ASSET_OUTFLOW', group: 'E', description: 'Proxy upgrade followed by large outflow' },
    { rule_id: 'VICTIM_NET_OUTFLOW_SPIKE', group: 'F', description: 'Address has large net outflow relative to inflow' },
    { rule_id: 'NEW_RECEIVER_FIRST_SEEN_AND_LARGE_INFLOW', group: 'F', description: 'Newly deployed contract receives large ETH inflow' },
    { rule_id: 'PEEL_CHAIN_PATTERN', group: 'F', description: 'Linear A→B→C→D fund transfer chain' },
    { rule_id: 'CONSOLIDATION_TO_FEW_SINKS', group: 'F', description: 'Multiple sources consolidate to same address' },
    { rule_id: 'HOP_TO_KNOWN_RISKY_DESTINATION', group: 'F', description: 'Fund hop to IOC-listed address (requires IOC input)' },
    { rule_id: 'ASSET_DIVERSIFICATION_POST_EXPLOIT', group: 'F', description: 'TX contains both native ETH and ERC20 transfers' },
    // Group G: State Diff Analysis
    { rule_id: 'STATE_DIFF_CONTRACT_BALANCE_DRAINED', group: 'G', description: 'Contract loses ≥50% ETH balance in single tx (state diff)' },
    { rule_id: 'STATE_DIFF_UNEXPECTED_ETH_GAIN', group: 'G', description: 'Address gains ETH without being tx.to — internal callback (state diff)' },
    { rule_id: 'STATE_DIFF_STORAGE_SLOT_ZEROED', group: 'G', description: 'Storage slot zeroed — balance mapping cleared before state update (state diff)' },
    { rule_id: 'STATE_DIFF_MULTI_CONTRACT_BALANCE_CHANGE', group: 'G', description: '3+ contracts have ETH balance changes in one tx — complex multi-hop (state diff)' },
    { rule_id: 'STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT', group: 'G', description: 'Newly deployed contract is net ETH gainer — attacker extraction (state diff)' },
    { rule_id: 'STATE_DIFF_REENTRANCY_PATTERN_CONFIRMED', group: 'G', description: 'Balance loss + storage change in same tx — reentrancy confirmed (state diff)' },
    { rule_id: 'STATE_DIFF_STORAGE_LARGE_VALUE_CHANGE', group: 'G', description: 'Storage slot changes by >10 ETH — oracle/balance manipulation (state diff)' },
    { rule_id: 'STATE_DIFF_VICTIM_LOSES_ATTACKER_GAINS', group: 'G', description: 'Victim loses ETH, new contract gains, storage changed — confirmed exploit (state diff)' },
];
