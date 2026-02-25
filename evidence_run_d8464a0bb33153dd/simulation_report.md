# Simulation Report

- **Run ID**: `d8464a0bb33153dd`
- **Scenario**: reentrancy
- **Blocks**: 2 → 42
- **Generated**: 2026-02-18T08:50:36.985Z

## Coverage

| Metric | Value |
|--------|-------|
| Blocks | 41 |
| Transactions | 33 |
| Event Logs | 13 |
| Traces | 33 (100.0%) |

## Deployed Contracts

- **vault1**: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
- **vault2**: `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`
- **readOnlyVault**: `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`
- **dependent**: `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`
- **erc777Vault**: `0x0165878A594ca255338adfa4d48449f69242Eb8F`
- **flashPool**: `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`
- **dex**: `0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6`
- **flashVictim**: `0x8A791620dd6260079BF849Dc5567aDC3F2FdC318`

## What the Forensics Tool Should Find

> The forensics tool must discover these independently from raw chain data.
> This section is for validation only — not fed to the tool.

| # | Pattern | Expected Signal |
|---|---------|----------------|
| 1 | Classic single-function reentrancy | REENTRANCY_SAME_FUNCTION_LOOP |
| 2 | Cross-function reentrancy | REENTRANCY_CROSS_FUNCTION |
| 3 | Read-only reentrancy | REENTRANCY_EXTERNAL_CALLBACK_BEFORE_STATE_UPDATE |
| 4 | ERC777 hook reentrancy | REENTRANCY_SAME_FUNCTION_LOOP |
| 5 | Flashloan + price manipulation | FLASHLOAN_BORROW_REPAY_SAME_TX, FLASHLOAN_ENABLING_LARGE_PRICE_IMPACT |

## Next Step

```bash
node src/index.js --mode raw_import --raw-root ./evidence_run_d8464a0bb33153dd/01_raw
```