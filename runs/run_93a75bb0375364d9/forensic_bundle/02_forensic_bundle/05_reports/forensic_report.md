# Forensic Report

> **Deterministic Analysis** (No AI)

## Executive Summary

**Verdict**: CONFIRMED ATTACK
**Detected Attack Vectors**: Reentrancy, Flashloan Manipulation, Asset Draining
**Primary Suspect**: `0x71be63f3384f5fb98995898a86b02fb2426c5788`

### Analysis Overview
The forensic engine analyzed **105 transactions** and identified **2 incident clusters** involving **62 high-confidence signals**.

- **Confirmed Exploits**: 9 strong signals indicating theft or malicious state manipulation.
- **Setup/Funding Noise**: 7 signals indicating large capital movements (likely setup or funding).

---

**Generated**: 2026-02-18T10:31:15.969Z
**Total Signals Fired**: 62
**Incidents Detected**: 2
**Transactions Analyzed**: 105
**Event Logs**: 85
**Traces**: 105

## Incidents

### Incident 1 — `2b303bffb9ca7a7d`

- **Severity**: HIGH
- **Transactions**: 6
- **Block Range**: 48 → 112
- **Signals Fired**: 39
- **Rules**: REENTRANCY_SAME_FUNCTION_LOOP, REENTRANCY_CROSS_FUNCTION, REENTRANCY_EXTERNAL_CALLBACK_BEFORE_STATE_UPDATE, MULTIPLE_WITHDRAWS_SINGLE_TX, FLASHLOAN_ENABLING_LARGE_PRICE_IMPACT, FLASHLOAN_WITH_EXTRACTION_OUTFLOW, STATE_DIFF_MULTI_CONTRACT_BALANCE_CHANGE, STATE_DIFF_VICTIM_LOSES_ATTACKER_GAINS, STATE_DIFF_UNEXPECTED_ETH_GAIN, STATE_DIFF_REENTRANCY_PATTERN_CONFIRMED, REVERT_AFTER_PARTIAL_STATE_CHANGE, FLASHLOAN_MULTI_POOL_HOPS, STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT, STATE_DIFF_CONTRACT_BALANCE_DRAINED
- **Suspect Addresses**:
  - `0x71be63f3384f5fb98995898a86b02fb2426c5788`
  - `0x72bb9c7ffbe2ed234e53bc64862dda6d9fff333b`
  - `0x33a61df860c1170c903f5ba1ef979570c962395e`
  - `0x937cf819746221324b7ffd131b4920234b9ede53`
  - `0x63e0e8cd1618d51d07e645d9e34326ca5ff714af`
  - `0x954c90761d6cb86cd0ef6f2785904ed439fb580d`
- **Transactions**:
  - `0x2f7c6a462c51ca8aec7b4f5a4250e3ca332f0e9ce706a92485fd4c7430b8a5c5`
  - `0x718353cf002a3e6a120d95227b43da5b6b20a10ef78b3e24fcb9b3004c720e61`
  - `0x8e25e74c10c69066f5ad7ed9ca192c0ed4fb541a63de49b02407b56a8ed6f48c`
  - `0xac454721ab934e16ea14083f90b10b09ad7a59d856d464f4f45d4eec5301d527`
  - `0xd8c95bdc69ae8f5dcdec2d18e6c41dd59797cd155fccc78cb0b3d1c8ddb56455`
  - `0xdd9c9229d080bf93017db9f7c45281b65d95157874c3dbeafe57e41003026d1a`

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
| VICTIM_NET_OUTFLOW_SPIKE | 12 |
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