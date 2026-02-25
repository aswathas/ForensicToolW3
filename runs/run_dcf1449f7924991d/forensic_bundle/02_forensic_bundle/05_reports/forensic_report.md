# Forensic Report

> **Deterministic Analysis** (No AI)

## Executive Summary

**Verdict**: Suspicious Activity Detected
**Detected Attack Vectors**: None
**Primary Suspect**: `0xcd3b766ccdd6ae721141f452c550ca635964ce71`

### Analysis Overview
The forensic engine analyzed **5035 transactions** and identified **1 incident clusters** involving **55 high-confidence signals**.

- **Confirmed Exploits**: 0 strong signals indicating theft or malicious state manipulation.
- **Setup/Funding Noise**: 3 signals indicating large capital movements (likely setup or funding).

---

**Generated**: 2026-02-18T13:56:13.035Z
**Total Signals Fired**: 55
**Incidents Detected**: 1
**Transactions Analyzed**: 5035
**Event Logs**: 5015
**Traces**: 3536

## Incidents

### Incident 1 — `710915d8be4eefe3`

- **Severity**: MEDIUM
- **Transactions**: 1
- **Block Range**: 1542 → 1542
- **Signals Fired**: 1
- **Rules**: STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT
- **Suspect Addresses**:
  - `0xcd3b766ccdd6ae721141f452c550ca635964ce71`
  - `0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0`
- **Transactions**:
  - `0x2059c838d431854a6390ef8c3f5e36a8dcf5c11c058b4b3714e1212b42271cd3`

## Signal Summary

| Rule | Count |
|------|-------|
| VICTIM_NET_OUTFLOW_SPIKE | 52 |
| CONSOLIDATION_TO_FEW_SINKS | 2 |
| STATE_DIFF_NET_GAINER_IS_NEW_CONTRACT | 1 |

## Limitations

- Traces available: YES
- ABI decoding: Standard ERC20/721 only — unknown contract selectors not decoded
- Oracle price data: Not available — Rules 15, 17 not evaluated
- IOC list: Not provided — Rule 27 not evaluated