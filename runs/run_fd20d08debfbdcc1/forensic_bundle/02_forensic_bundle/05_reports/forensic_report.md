# Forensic Report

> **Deterministic Analysis** (No AI)

## Executive Summary

**Verdict**: CONFIRMED ATTACK
**Detected Attack Vectors**: Reentrancy, Flashloan Manipulation, Asset Draining
**Primary Suspect**: `0x71be63f3384f5fb98995898a86b02fb2426c5788`

### Analysis Overview
The forensic engine analyzed **44 transactions** and identified **2 incident clusters** involving **47 high-confidence signals**.

- **Confirmed Exploits**: 8 strong signals indicating theft or malicious state manipulation.
- **Setup/Funding Noise**: 7 signals indicating large capital movements (likely setup or funding).

---

**Generated**: 2026-02-18T15:07:39.983Z
**Total Signals Fired**: 47
**Incidents Detected**: 2
**Transactions Analyzed**: 44
**Event Logs**: 25
**Traces**: 44

## Incidents

### Incident 1 — `2d9ed1844454d8f5`

- **Severity**: HIGH
- **Transactions**: 5
- **Block Range**: 37 → 52
- **Signals Fired**: 34
- **Rules**: REENTRANCY_SAME_FUNCTION_LOOP, REENTRANCY_CROSS_FUNCTION, REENTRANCY_EXTERNAL_CALLBACK_BEFORE_STATE_UPDATE, MULTIPLE_WITHDRAWS_SINGLE_TX, FLASHLOAN_ENABLING_LARGE_PRICE_IMPACT, FLASHLOAN_WITH_EXTRACTION_OUTFLOW, STATE_DIFF_MULTI_CONTRACT_BALANCE_CHANGE, STATE_DIFF_VICTIM_LOSES_ATTACKER_GAINS, STATE_DIFF_UNEXPECTED_ETH_GAIN, STATE_DIFF_REENTRANCY_PATTERN_CONFIRMED, REVERT_AFTER_PARTIAL_STATE_CHANGE, FLASHLOAN_MULTI_POOL_HOPS, STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT, STATE_DIFF_CONTRACT_BALANCE_DRAINED
- **Suspect Addresses**:
  - `0x71be63f3384f5fb98995898a86b02fb2426c5788`
  - `0x72bb9c7ffbe2ed234e53bc64862dda6d9fff333b`
  - `0x33a61df860c1170c903f5ba1ef979570c962395e`
  - `0x937cf819746221324b7ffd131b4920234b9ede53`
  - `0x63e0e8cd1618d51d07e645d9e34326ca5ff714af`
- **Transactions**:
  - `0x317a0d2a62663ff8d66b5bd9ac6cb5364d8e54ec7106f4f1071c526ab9c7f658`
  - `0x6db1c5e28d405706dc56657bae89b861a7d57f365aef663982843329c7d93e7b`
  - `0xa64b2486b0c01b72808ff770ebedb2790ac6bdf748ef1b4b087a747e7004fac0`
  - `0xb917a6fb2c3cd90023f8c75ce05060c5b89813a09c57b018ca149a32e12d22a1`
  - `0xf633a5e7014572a8b4b9378f873c1bdf9adeb903f6c508b915e5b2da52e940fb`

### Incident 2 — `086c6eb1ba0c7309`

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
  - `0x0f0758ab376414150a386238d449395411575bc640b9974e254a1dda84241d63`
  - `0x251d558fe0f8a59161f8a2b03e7bdb0e60337692ff9e9bc13976defdfca2419b`
  - `0x7e8952d70ce7bdcd3c16d806a8963b6650340a3b5359ca48d6069f1f8fc542a4`
  - `0x9dabf79e884c66c44c14d0c3a8d3696b73abe5d29750eba8e6eefedece46a5ce`
  - `0xc14732bac5c1b1fd0ceed496881b3b7a5b7244c3e875fb9be26f308588d6a840`
  - `0xcbbb14a1587045c91f5bd6ee44a4362a5376db7c4b022da2df6132ce1aad66db`
  - `0xea272b1c2d06917f7612d267db63dc03ceb4a80e5f18a9732003fd1a26585836`

## Signal Summary

| Rule | Count |
|------|-------|
| REENTRANCY_SAME_FUNCTION_LOOP | 3 |
| REENTRANCY_CROSS_FUNCTION | 4 |
| REENTRANCY_EXTERNAL_CALLBACK_BEFORE_STATE_UPDATE | 4 |
| MULTIPLE_WITHDRAWS_SINGLE_TX | 4 |
| REVERT_AFTER_PARTIAL_STATE_CHANGE | 1 |
| FLASHLOAN_MULTI_POOL_HOPS | 1 |
| FLASHLOAN_ENABLING_LARGE_PRICE_IMPACT | 3 |
| FLASHLOAN_WITH_EXTRACTION_OUTFLOW | 4 |
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