/**
 * anvil_utils.mjs
 * Cross-platform Anvil spawn/stop helpers.
 * Checks .foundry/bin, .cargo/bin, and PATH. Windows-aware (.exe).
 */
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

const IS_WIN = os.platform() === 'win32';
const EXE = IS_WIN ? '.exe' : '';

function findAnvilBinary() {
  const candidates = [
    join(os.homedir(), '.foundry', 'bin', `anvil${EXE}`),
    join(os.homedir(), '.cargo', 'bin', `anvil${EXE}`),
    `anvil${EXE}`,
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  // Try plain 'anvil' from PATH (existsSync won't work for PATH entries)
  return `anvil${EXE}`;
}

export async function startAnvil({ port = 8545, accounts = 10, balance = 10000 } = {}) {
  const bin = findAnvilBinary();
  console.log(`[anvil] Starting with binary: ${bin}`);

  const args = [
    '--port', String(port),
    '--accounts', String(accounts),
    '--balance', String(balance),
    '--silent',
  ];

  const proc = spawn(bin, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: IS_WIN,
  });

  proc.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.error(`[anvil stderr] ${msg}`);
  });

  proc.on('error', (err) => {
    if (err.code === 'ENOENT') {
      throw new Error(
        `Anvil binary not found. Install Foundry: https://getfoundry.sh\n` +
        `Checked: ${findAnvilBinary()}`
      );
    }
    throw err;
  });

  // Wait for RPC to be ready
  const rpcUrl = `http://127.0.0.1:${port}`;
  await waitForRpc(rpcUrl, 15000);
  console.log(`[anvil] Ready at ${rpcUrl}`);
  return { proc, rpcUrl };
}

export function stopAnvil(proc) {
  if (!proc) return;
  try {
    proc.kill('SIGTERM');
    console.log('[anvil] Stopped.');
  } catch (e) {
    console.warn('[anvil] Could not stop process:', e.message);
  }
}

export async function waitForRpc(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      });
      if (res.ok) return true;
    } catch (_) {
      // not ready yet
    }
    await sleep(300);
  }
  throw new Error(`Anvil RPC not ready after ${timeoutMs}ms at ${url}`);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
