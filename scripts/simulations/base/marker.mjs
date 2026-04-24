/**
 * marker.mjs
 * Deploys ForensicsMarker and emits RunStart / RunEnd.
 * These are the ONLY marker events — no attack labels.
 * The forensics tool uses these to auto-detect the block window.
 */
import { deployContract } from './deploy_utils.mjs';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function deployMarker(signer, artifactsDir) {
    const artifact = JSON.parse(
        readFileSync(join(artifactsDir, 'ForensicsMarker.json'), 'utf8')
    );
    const { contract, address } = await deployContract(signer, artifact, [], 'ForensicsMarker');
    return { contract, address };
}

export async function emitRunStart(markerContract, runId, scenario) {
    const runIdBytes = ethers.id(runId).slice(0, 66); // bytes32
    const tx = await markerContract.emitRunStart(runIdBytes, scenario);
    const receipt = await tx.wait();
    console.log(`[marker] RunStart emitted — block ${receipt.blockNumber}, runId: ${runId}`);
    return { blockNumber: receipt.blockNumber, runIdBytes };
}

export async function emitRunEnd(markerContract, runIdBytes) {
    const tx = await markerContract.emitRunEnd(runIdBytes);
    const receipt = await tx.wait();
    console.log(`[marker] RunEnd emitted — block ${receipt.blockNumber}`);
    return { blockNumber: receipt.blockNumber };
}
