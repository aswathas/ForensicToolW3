# Forensic Report

> **Deterministic Analysis** (No AI)

## Executive Summary

**Verdict**: CONFIRMED ATTACK
**Detected Attack Vectors**: Reentrancy, Flashloan Manipulation, Asset Draining
**Primary Suspect**: `0x15d34aaf54267db7d7c367839aaf71a00a2c6a65`

### Analysis Overview
The forensic engine analyzed **41 transactions** and identified **1 incident clusters** involving **52 high-confidence signals**.

- **Confirmed Exploits**: 9 strong signals indicating theft or malicious state manipulation.
- **Setup/Funding Noise**: 7 signals indicating large capital movements (likely setup or funding).

---

**Generated**: 2026-04-27T12:48:19.942Z
**Total Signals Fired**: 52
**Incidents Detected**: 1
**Transactions Analyzed**: 41
**Event Logs**: 21
**Traces**: 41

## Incidents

### Incident 1 — `aef7fb21d6db9264`

- **Severity**: HIGH
- **Transactions**: 14
- **Block Range**: 9 → 50
- **Signals Fired**: 48
- **Rules**: REENTRANCY_SAME_FUNCTION_LOOP, REENTRANCY_CROSS_FUNCTION, REENTRANCY_EXTERNAL_CALLBACK_BEFORE_STATE_UPDATE, MULTIPLE_WITHDRAWS_SINGLE_TX, FLASHLOAN_ENABLING_LARGE_PRICE_IMPACT, FLASHLOAN_WITH_EXTRACTION_OUTFLOW, STATE_DIFF_MULTI_CONTRACT_BALANCE_CHANGE, STATE_DIFF_VICTIM_LOSES_ATTACKER_GAINS, STATE_DIFF_UNEXPECTED_ETH_GAIN, STATE_DIFF_REENTRANCY_PATTERN_CONFIRMED, REVERT_AFTER_PARTIAL_STATE_CHANGE, FLASHLOAN_MULTI_POOL_HOPS, STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT, STATE_DIFF_CONTRACT_BALANCE_DRAINED
- **Suspect Addresses**:
  - `0x15d34aaf54267db7d7c367839aaf71a00a2c6a65`
  - `0xbded0d2bf404bdcba897a74e6657f1f12e5c6fb6`
  - `0x93c7a6d00849c44ef3e92e95dceffccd447909ae`
  - `0xb35d3c9b9f2fd72faab282e8dd56da31faa30e3d`
  - `0xb737dd8fc9b304a3520b3bb609cc7532f1425ad0`
  - `0x9cb7a24c844afd220f05eb1359691e6a4db80e3a`
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
  - `0x61f73813343a06a7e03246d765cc822d5e346a334234c53baadee431f5e2b867`
  - `0x74e3411a7b3376b1f3c187a016ac5156f370612cb9354c54fb7618864015a4ca`
  - `0x7e9694ca748148ee95a23a65db1c9f53f8a4cd030b2c0604e80a7284c1c6a1a1`
  - `0x9dabf79e884c66c44c14d0c3a8d3696b73abe5d29750eba8e6eefedece46a5ce`
  - `0xa4a4843e47f4789c830655ac6e39e475cac5b28adb537143dd4963e9632ff388`
  - `0xc6e8f4bf22d022aebb96bf5fb53ea3da0c747dba967b6651a47c49d40da9196d`
  - `0xcbbb14a1587045c91f5bd6ee44a4362a5376db7c4b022da2df6132ce1aad66db`
  - `0xd2e43a30999f23052037c2d250aec646f6ed770f585e9deb130d387ee7e73aa3`
  - `0xfa06d6ff1c5171d45a083432f0db4f729322e4e6589f96486a2306b0d471ff75`

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