# Forensic Report

> **Deterministic Analysis** (No AI)

## Executive Summary

**Verdict**: CONFIRMED ATTACK
**Detected Attack Vectors**: Reentrancy, Flashloan Manipulation, Asset Draining
**Primary Suspect**: `0x09db0a93b389bef724429898f539aeb7ac2dd55f`

### Analysis Overview
The forensic engine analyzed **90 transactions** and identified **2 incident clusters** involving **52 high-confidence signals**.

- **Confirmed Exploits**: 9 strong signals indicating theft or malicious state manipulation.
- **Setup/Funding Noise**: 7 signals indicating large capital movements (likely setup or funding).

---

**Generated**: 2026-02-18T14:12:04.538Z
**Total Signals Fired**: 52
**Incidents Detected**: 2
**Transactions Analyzed**: 90
**Event Logs**: 70
**Traces**: 90

## Incidents

### Incident 1 — `38721188f679009b`

- **Severity**: HIGH
- **Transactions**: 6
- **Block Range**: 66 → 86
- **Signals Fired**: 39
- **Rules**: REENTRANCY_SAME_FUNCTION_LOOP, REENTRANCY_CROSS_FUNCTION, REENTRANCY_EXTERNAL_CALLBACK_BEFORE_STATE_UPDATE, MULTIPLE_WITHDRAWS_SINGLE_TX, FLASHLOAN_ENABLING_LARGE_PRICE_IMPACT, FLASHLOAN_WITH_EXTRACTION_OUTFLOW, STATE_DIFF_MULTI_CONTRACT_BALANCE_CHANGE, STATE_DIFF_VICTIM_LOSES_ATTACKER_GAINS, STATE_DIFF_UNEXPECTED_ETH_GAIN, STATE_DIFF_REENTRANCY_PATTERN_CONFIRMED, REVERT_AFTER_PARTIAL_STATE_CHANGE, FLASHLOAN_MULTI_POOL_HOPS, STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT, STATE_DIFF_CONTRACT_BALANCE_DRAINED
- **Suspect Addresses**:
  - `0x09db0a93b389bef724429898f539aeb7ac2dd55f`
  - `0x6d8da4b12d658a36909ec1c75f81e54b8db4ebf9`
  - `0x6fd09d4d9795a3e07eddbd9a82c882b46a5a6def`
  - `0xd71f5abb5f2aba60b8e32d9c3584e6a236df9fff`
  - `0x8439d9d900a59af7317de0881a286385bb32f99c`
  - `0x03e92f43514490de25089b6dbcf3379b986bc48b`
- **Transactions**:
  - `0x2bfaa0d8597d845ba8042c9d77e58309268b022a956bedc0fe465dfe595244e5`
  - `0x7f6e6c908614fb2f1dd66028f737df9eb6352f5151faf49f28f0ac622f1ea48d`
  - `0xbdf7c63911fff97914fc77599497b17a4677cb8ca86b881ba3aa78123127e370`
  - `0xbfbb2f54e197c77ca46098102ed5455420e447873a287d866088f3a125fb057c`
  - `0xc25a830be2ad4ab12fa491520dea2caee903140985cf0c6eed7a981ba4f782bf`
  - `0xeb428a419e1dc29dcad457ae24f558f9662981fcf2d327336bf3c8bd83aa4c1d`

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