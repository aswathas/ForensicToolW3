# Limitations and Gaps

| Item | Status | Impact |
|------|--------|--------|
| Call traces | ✅ Available | Reentrancy signals require traces for HIGH confidence |
| State diffs | ✅ Available (3536 txs) | Storage slot analysis and Group G heuristics |
| ABI decoding | Partial (ERC20/721 only) | Unknown selectors remain undecoded |
| Oracle data | ❌ Not available | Rules 15, 17 not evaluated |
| IOC list | ❌ Not provided | Rule 27 not evaluated |