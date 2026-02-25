/**
 * window_resolver.js
 * Resolves the block window to analyze.
 *
 * Priority:
 * 1. CLI --from-block / --to-block (explicit)
 * 2. markers_onchain: scan for ForensicsMarker RunStart/RunEnd events
 * 3. since_mark: read run_markers.json from raw root
 * 4. lastN: last N blocks (dev fallback, warns)
 */
import { ethers } from 'ethers';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

// ForensicsMarker event topics
const RUN_START_TOPIC = ethers.id('RunStart(bytes32,string)');
const RUN_END_TOPIC = ethers.id('RunEnd(bytes32)');

export async function resolveWindow(args) {
    // ── Priority 1: Explicit CLI range ────────────────────────────
    if (args.fromBlock !== null && args.toBlock !== null) {
        console.log(`[window] Using explicit range: ${args.fromBlock} → ${args.toBlock}`);
        return { fromBlock: args.fromBlock, toBlock: args.toBlock, method: 'explicit' };
    }

    // ── Priority 2: markers_onchain (RPC mode) ─────────────────────
    if (args.mode === 'rpc_live' && args.window === 'markers_onchain') {
        return await resolveFromMarkers(args.rpcUrl);
    }

    // ── Priority 3: since_mark (read from raw_root) ────────────────
    if (args.rawRoot) {
        const markersFile = findMarkersFile(args.rawRoot);
        if (markersFile) {
            return resolveFromMarkersFile(markersFile);
        }

        // Try to infer from block_headers file
        const headersFile = findNdjsonFile(args.rawRoot, 'block_headers');
        if (headersFile) {
            return resolveFromBlockHeaders(headersFile);
        }
    }

    // ── Priority 4: lastN fallback ─────────────────────────────────
    console.warn(`[window] WARNING: Using lastN fallback (${args.lastN} blocks). Not recommended for production.`);
    if (args.rpcUrl) {
        const provider = new ethers.JsonRpcProvider(args.rpcUrl);
        const latest = await provider.getBlockNumber();
        return {
            fromBlock: Math.max(0, latest - args.lastN),
            toBlock: latest,
            method: 'lastN',
        };
    }

    throw new Error('Cannot resolve block window: no RPC URL and no raw data found.');
}

async function resolveFromMarkers(rpcUrl) {
    console.log('[window] Scanning for ForensicsMarker events on-chain...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const latest = await provider.getBlockNumber();

    // Scan last 10000 blocks for marker events
    const fromBlock = Math.max(0, latest - 10000);
    const logs = await provider.getLogs({
        fromBlock,
        toBlock: latest,
        topics: [[RUN_START_TOPIC, RUN_END_TOPIC]],
    });

    if (logs.length === 0) {
        throw new Error('No ForensicsMarker events found on-chain. Run simulation first or use --from-block/--to-block.');
    }

    const startLogs = logs.filter(l => l.topics[0] === RUN_START_TOPIC);
    const endLogs = logs.filter(l => l.topics[0] === RUN_END_TOPIC);

    // Use the latest RunStart
    const latestStart = startLogs[startLogs.length - 1];
    const runIdBytes = latestStart.topics[1];

    // Find matching RunEnd
    const matchingEnd = endLogs.find(l => l.topics[1] === runIdBytes);

    const result = {
        fromBlock: latestStart.blockNumber,
        toBlock: matchingEnd ? matchingEnd.blockNumber : latest,
        method: 'markers_onchain',
        runIdBytes,
        markerContract: latestStart.address,
    };

    console.log(`[window] Found RunStart at block ${result.fromBlock}, RunEnd at block ${result.toBlock}`);
    return result;
}

function resolveFromMarkersFile(filePath) {
    console.log(`[window] Reading markers from: ${filePath}`);
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    return {
        fromBlock: data.from_block,
        toBlock: data.to_block,
        method: 'since_mark',
        runId: data.run_id,
    };
}

function resolveFromBlockHeaders(filePath) {
    console.log(`[window] Inferring window from block headers: ${filePath}`);
    const lines = readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean);
    const blocks = lines.map(l => JSON.parse(l));
    const blockNums = blocks.map(b => b.block_number).filter(n => n !== undefined);
    return {
        fromBlock: Math.min(...blockNums),
        toBlock: Math.max(...blockNums),
        method: 'inferred_from_headers',
    };
}

function findMarkersFile(rawRoot) {
    // Look for run_meta.json one level up
    const candidates = [
        join(rawRoot, '..', 'run_meta.json'),
        join(rawRoot, 'run_meta.json'),
    ];
    for (const c of candidates) {
        if (existsSync(c)) return c;
    }
    return null;
}

function findNdjsonFile(rawRoot, pattern) {
    try {
        const chainDir = join(rawRoot, 'chain');
        if (!existsSync(chainDir)) return null;
        const files = readdirSync(chainDir).filter(f => f.includes(pattern));
        return files.length > 0 ? join(chainDir, files[0]) : null;
    } catch {
        return null;
    }
}
