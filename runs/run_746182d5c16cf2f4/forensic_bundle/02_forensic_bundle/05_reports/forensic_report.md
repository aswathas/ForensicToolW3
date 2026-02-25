# Forensic Report

> **Deterministic Analysis** (No AI)

## Executive Summary

**Verdict**: CONFIRMED ATTACK
**Detected Attack Vectors**: Reentrancy, Flashloan Manipulation, Asset Draining
**Primary Suspect**: `0x145e2dc5c8238d1be628f87076a37d4a26a78544`

### Analysis Overview
The forensic engine analyzed **383 transactions** and identified **2 incident clusters** involving **102 high-confidence signals**.

- **Confirmed Exploits**: 9 strong signals indicating theft or malicious state manipulation.
- **Setup/Funding Noise**: 7 signals indicating large capital movements (likely setup or funding).

---

**Generated**: 2026-02-18T13:02:34.605Z
**Total Signals Fired**: 102
**Incidents Detected**: 2
**Transactions Analyzed**: 383
**Event Logs**: 363
**Traces**: 383

## Incidents

### Incident 1 — `704c1192141ab952`

- **Severity**: HIGH
- **Transactions**: 6
- **Block Range**: 128 → 352
- **Signals Fired**: 39
- **Rules**: REENTRANCY_SAME_FUNCTION_LOOP, REENTRANCY_CROSS_FUNCTION, REENTRANCY_EXTERNAL_CALLBACK_BEFORE_STATE_UPDATE, MULTIPLE_WITHDRAWS_SINGLE_TX, FLASHLOAN_ENABLING_LARGE_PRICE_IMPACT, FLASHLOAN_WITH_EXTRACTION_OUTFLOW, STATE_DIFF_MULTI_CONTRACT_BALANCE_CHANGE, STATE_DIFF_VICTIM_LOSES_ATTACKER_GAINS, STATE_DIFF_UNEXPECTED_ETH_GAIN, STATE_DIFF_REENTRANCY_PATTERN_CONFIRMED, REVERT_AFTER_PARTIAL_STATE_CHANGE, FLASHLOAN_MULTI_POOL_HOPS, STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT, STATE_DIFF_CONTRACT_BALANCE_DRAINED
- **Suspect Addresses**:
  - `0x145e2dc5c8238d1be628f87076a37d4a26a78544`
  - `0x135246628485953e1a8f0644ad40582b4f502fc4`
  - `0x9bf0c965a698c0c7220038691ba2a80efa846963`
  - `0x71269aca27584a64644b91285755e2d7f6570aac`
  - `0x3c3d130ddb46cea1d99da821d44db44575f72569`
  - `0x5055a9eb688af472ed36aad8f8fcbbaea8455504`
- **Transactions**:
  - `0x0148057ce5a0fd1dea6d942fee35b824acb3734fce34bf44eeddfb6a3804841e`
  - `0x0b6d9f4ebe3656b62d5b2a704ecdc57006333ae5768cb5bb9099589e984c408d`
  - `0x5b5227fb90ff2b7fc530af67265ffeb2696cef587f285af900201198f332a04a`
  - `0x7f82603d95b2b9cf05a2610e65a11a2fce412cf8b32c58a90f03c7fe98d446b6`
  - `0xac1de3ef1c0d11fd733d4470da09e79005007369a15fb437c2f05633796f81a9`
  - `0xb8769b84a79110efda66fceafe2e79b7116a749dfac4d1adba789b8a8efdc88c`

### Incident 2 — `993149032ac8daef`

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
  - `0x9dabf79e884c66c44c14d0c3a8d3696b73abe5d29750eba8e6eefedece46a5ce`
  - `0xa707c910f20b2d1a10e967a58a2841c1195b04b927869bad23307e42c9eec82e`
  - `0xb6031534ccd2606c565c9ca3c980587045654e7022a41b4c77fd55e05b0bc827`
  - `0xbb2d0ba2e61e6f3818e744611b21768cd18bc630439dc0b33676a6869e028645`
  - `0xcb1b6cfae812bd66aba07447defd1603c74b2f8b82b654b0350f81844350a88b`
  - `0xcbbb14a1587045c91f5bd6ee44a4362a5376db7c4b022da2df6132ce1aad66db`
  - `0xe00b7227399e7b72668387cd345697e4306f871648a6a116f0c747f7f8660221`

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
| VICTIM_NET_OUTFLOW_SPIKE | 52 |
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