/**
 * clusterer.js — Incident Clusterer
 * Groups suspicious transactions into incidents using deterministic connectivity:
 * shared victim contracts, shared suspect addresses, shared sinks, block proximity.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

export async function runIncidentClusterer(signals, derived, outputDir) {
    const bundleDir = join(outputDir, '02_forensic_bundle');
    const incidentsDir = join(bundleDir, '03_signals', 'rollups');
    mkdirSync(incidentsDir, { recursive: true });

    // Only cluster signals with real tx hashes
    const signalEvents = signals.allSignals.filter(s => s.tx_hash && s.tx_hash !== 'N/A');

    // Build tx → signals map
    const txSignals = {};
    for (const sig of signalEvents) {
        if (!txSignals[sig.tx_hash]) txSignals[sig.tx_hash] = [];
        txSignals[sig.tx_hash].push(sig);
    }

    // Build tx → addresses map (from + to from enriched txs)
    const txAddresses = {};
    for (const tx of derived.txEnriched || []) {
        txAddresses[tx.tx_hash] = new Set([tx.from, tx.to].filter(Boolean));
    }

    // Union-Find for clustering
    const parent = {};
    const find = (x) => {
        if (!parent[x]) parent[x] = x;
        if (parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
    };
    const union = (x, y) => {
        const px = find(x), py = find(y);
        if (px !== py) parent[px] = py;
    };

    const suspiciousTxs = Object.keys(txSignals);

    // Cluster by shared addresses
    for (let i = 0; i < suspiciousTxs.length; i++) {
        for (let j = i + 1; j < suspiciousTxs.length; j++) {
            const txA = suspiciousTxs[i];
            const txB = suspiciousTxs[j];
            const addrsA = txAddresses[txA] || new Set();
            const addrsB = txAddresses[txB] || new Set();
            const shared = [...addrsA].some(a => addrsB.has(a));

            // Also cluster by block proximity (within 10 blocks)
            const txAData = derived.txEnriched?.find(t => t.tx_hash === txA);
            const txBData = derived.txEnriched?.find(t => t.tx_hash === txB);
            const blockProximity = txAData && txBData &&
                Math.abs(txAData.block_number - txBData.block_number) <= 10;

            if (shared || blockProximity) {
                union(txA, txB);
            }
        }
    }

    // Group by cluster root
    const clusters = {};
    for (const tx of suspiciousTxs) {
        const root = find(tx);
        if (!clusters[root]) clusters[root] = [];
        clusters[root].push(tx);
    }

    // Build incident records
    const incidents = Object.entries(clusters).map(([root, txHashes], idx) => {
        const incidentSignals = txHashes.flatMap(h => txSignals[h] || []);
        const ruleIds = [...new Set(incidentSignals.map(s => s.rule_id))];
        const addresses = new Set(txHashes.flatMap(h => [...(txAddresses[h] || [])]));
        const blockNumbers = txHashes
            .map(h => derived.txEnriched?.find(t => t.tx_hash === h)?.block_number)
            .filter(Boolean);

        // Deterministic incident_id
        const incidentId = crypto
            .createHash('sha256')
            .update(txHashes.sort().join('|'))
            .digest('hex')
            .slice(0, 16);

        return {
            incident_id: incidentId,
            incident_index: idx + 1,
            tx_count: txHashes.length,
            tx_hashes: txHashes,
            signal_count: incidentSignals.length,
            rules_fired: ruleIds,
            suspect_addresses: [...addresses],
            block_range: blockNumbers.length > 0
                ? { from: Math.min(...blockNumbers), to: Math.max(...blockNumbers) }
                : null,
            severity: ruleIds.some(r => r.includes('REENTRANCY') || r.includes('FLASHLOAN')) ? 'HIGH' : 'MEDIUM',
            evidence_refs: incidentSignals.slice(0, 3).map(s => ({
                dataset: 'signals', record_id: s.record_id,
            })),
        };
    });

    // Write rollup
    writeFileSync(
        join(incidentsDir, 'signals_by_incident_000001.ndjson'),
        incidents.map(i => JSON.stringify(i)).join('\n') + '\n'
    );

    console.log(`[incidents] ${incidents.length} incidents clustered from ${suspiciousTxs.length} suspicious txs`);
    return incidents;
}
