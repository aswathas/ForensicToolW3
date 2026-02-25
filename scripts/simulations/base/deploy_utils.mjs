/**
 * deploy_utils.mjs
 * Shared deployment helpers: deploy contracts, fund wallets, get signers.
 */
import { ethers } from 'ethers';

export function getProvider(rpcUrl) {
    return new ethers.JsonRpcProvider(rpcUrl);
}

export async function getSigners(provider, count = 5) {
    const signers = [];
    for (let i = 0; i < count; i++) {
        const signer = await provider.getSigner(i);
        signers.push(signer);
    }
    return signers;
}

export async function deployContract(signer, artifact, constructorArgs = [], label = '') {
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
    const contract = await factory.deploy(...constructorArgs);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`[deploy] ${label || artifact.contractName} → ${address}`);
    return { contract, address };
}

export async function fundAddress(signer, toAddress, ethAmount) {
    const tx = await signer.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(String(ethAmount)),
    });
    await tx.wait();
    console.log(`[fund] Sent ${ethAmount} ETH to ${toAddress}`);
    return tx;
}

export async function getBalance(provider, address) {
    const bal = await provider.getBalance(address);
    return ethers.formatEther(bal);
}

export async function mineBlocks(provider, count) {
    for (let i = 0; i < count; i++) {
        await provider.send('evm_mine', []);
    }
    console.log(`[chain] Mined ${count} blocks`);
}
