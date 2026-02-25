# Forensic Report

> **Deterministic Analysis** (No AI)

## Executive Summary

**Verdict**: CONFIRMED ATTACK
**Detected Attack Vectors**: Reentrancy, Flashloan Manipulation, Asset Draining
**Primary Suspect**: `0x976ea74026e726554db657fa54763abd0c3a0aa9`

### Analysis Overview
The forensic engine analyzed **54 transactions** and identified **2 incident clusters** involving **52 high-confidence signals**.

- **Confirmed Exploits**: 9 strong signals indicating theft or malicious state manipulation.
- **Setup/Funding Noise**: 7 signals indicating large capital movements (likely setup or funding).

---

**Generated**: 2026-02-18T15:14:54.125Z
**Total Signals Fired**: 52
**Incidents Detected**: 2
**Transactions Analyzed**: 54
**Event Logs**: 34
**Traces**: 54

## Incidents

### Incident 1 — `98ddbc11eaf34c34`

- **Severity**: HIGH
- **Transactions**: 6
- **Block Range**: 38 → 64
- **Signals Fired**: 39
- **Rules**: REENTRANCY_SAME_FUNCTION_LOOP, REENTRANCY_CROSS_FUNCTION, REENTRANCY_EXTERNAL_CALLBACK_BEFORE_STATE_UPDATE, MULTIPLE_WITHDRAWS_SINGLE_TX, FLASHLOAN_ENABLING_LARGE_PRICE_IMPACT, FLASHLOAN_WITH_EXTRACTION_OUTFLOW, STATE_DIFF_MULTI_CONTRACT_BALANCE_CHANGE, STATE_DIFF_VICTIM_LOSES_ATTACKER_GAINS, STATE_DIFF_UNEXPECTED_ETH_GAIN, STATE_DIFF_REENTRANCY_PATTERN_CONFIRMED, REVERT_AFTER_PARTIAL_STATE_CHANGE, FLASHLOAN_MULTI_POOL_HOPS, STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT, STATE_DIFF_CONTRACT_BALANCE_DRAINED
- **Suspect Addresses**:
  - `0x976ea74026e726554db657fa54763abd0c3a0aa9`
  - `0x7ef8e99980da5bcedcf7c10f41e55f759f6a174b`
  - `0x66db6d191cd163f56197b767928a507df8b47aa7`
  - `0x973adb9de34c974c3a421a870203c5be9059e9fa`
  - `0x3200b3e272007a8685b0c66c84eb4c03e7e29ed1`
  - `0x781da48ea17664d0b53d7645d50c5dae93d27887`
- **Transactions**:
  - `0x08eca41c3924a704cf810ccfd9eda61aecbaecde346825ad2a4e1d589e221b91`
  - `0x42ba23efe75dfada208da6f05bb5b4c76dcc4dc57596f081c439e22ce6ea1731`
  - `0x5bd8d8b4afacbbbb228bff09183fe9f1a9d16ed4eaf72c54d4ce0812f105c421`
  - `0x964eb31db8ad8c7bfc0eb02fe849c278526789adde255b5ff2181e2d903a669f`
  - `0xa0b718d488d4e6ef3b5d6af68f50f843dcac576d6b40b447095df14feda9907b`
  - `0xaa970aeaf66409a719a6862c8cda83ecd6ed4da94322f439e4953f5ccdf4e7a4`

### Incident 2 — `b8ce447e4c901927`

- **Severity**: HIGH
- **Transactions**: 8
- **Block Range**: 9 → 20
- **Signals Fired**: 9
- **Rules**: STATE_DIFF_UNEXPECTED_ETH_GAIN, STATE_DIFF_REENTRANCY_PATTERN_CONFIRMED, STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT
- **Suspect Addresses**:
  - `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`
  - `0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0`
  - `0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9`
  - `0x0165878a594ca255338adfa4d48449f69242eb8f`
  - `0x8a791620dd6260079bf849dc5567adc3f2fdc318`
  - `0xdc64a140aa3e981100a9beca4e685f962f0cf6c9`
  - `0xa513e6e4b8f2a923d98304ec87f64353c4d5c853`
- **Transactions**:
  - `0x0da0a94da11195b318e54f2daebf3c1b86a4fe520cb7659dedbd725baa8e2b77`
  - `0x3456d95680261f617f8a93ad11d15371f6113abef51e68c5fc4edaa70e55ed56`
  - `0x34bc405843579c2b27adc232b41a11df0f9ee1af81a24766d0c4305cda093fb0`
  - `0x45654d5f528c5d7983e2902898f4b16909d97dbcb521f96378b732fd8210d500`
  - `0x4cfa10cfd38acb5350ac4c389c224bf79f903ae4b7119402f0095779cdbae9e9`
  - `0x9dabf79e884c66c44c14d0c3a8d3696b73abe5d29750eba8e6eefedece46a5ce`
  - `0xcbbb14a1587045c91f5bd6ee44a4362a5376db7c4b022da2df6132ce1aad66db`
  - `0xd2e43a30999f23052037c2d250aec646f6ed770f585e9deb130d387ee7e73aa3`

## Signal Summary

| Rule | Count |
|------|-------|
| REENTRANCY_SAME_FUNCTION_LOOP | 3 |
| REENTRANCY_CROSS_FUNCTION | 5 |
| REENTRANCY_EXTERNAL_CALLBACK_BEFORE_STATE_UPDATE | 5 |
| MULTIPLE_WITHDRAWS_SINGLE_TX | 4 |
| REVERT_AFTER_PARTIAL_STATE_CHANGE | 2 |
| FLASHLOAN_MULTI_POOL_HOPS | 1 |
| FLASHLOAN_ENABLING_LARGE_PRICE_IMPACT | 4 |
| FLASHLOAN_WITH_EXTRACTION_OUTFLOW | 5 |
| VICTIM_NET_OUTFLOW_SPIKE | 2 |
| CONSOLIDATION_TO_FEW_SINKS | 2 |
| STATE_DIFF_CONTRACT_BALANCE_DRAINED | 1 |
| STATE_DIFF_UNEXPECTED_ETH_GAIN | 3 |
| STATE_DIFF_MULTI_CONTRACT_BALANCE_CHANGE | 3 |
| STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT | 5 |
| STATE_DIFF_REENTRANCY_PATTERN_CONFIRMED | 6 |
| STATE_DIFF_VICTIM_LOSES_ATTACKER_GAINS | 1 |

## Limitations

- Traces available: YES
- ABI decoding: Standard ERC20/721 only — unknown contract selectors not decoded
- Oracle price data: Not available — Rules 15, 17 not evaluated
- IOC list: Not provided — Rule 27 not evaluated