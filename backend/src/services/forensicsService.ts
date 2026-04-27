import fs from 'fs'
import path from 'path'

const RUNS_DIR = process.env.RUNS_DIR || '../runs'

// ── Helpers ───────────────────────────────────────────────────────────────────

function readJsonSafe(filePath: string, fallback: any = null): any {
  try {
    return fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      : fallback
  } catch {
    return fallback
  }
}

/**
 * Read all lines from an ndjson file and parse each line as JSON.
 * Returns an empty array on any error.
 */
function readNdjson(filePath: string): any[] {
  try {
    if (!fs.existsSync(filePath)) return []
    return fs
      .readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch {
    return []
  }
}

/**
 * Glob-style find of the first file matching a name pattern inside a directory.
 */
function findFirstFile(dir: string, nameSuffix: string): string | null {
  try {
    if (!fs.existsSync(dir)) return null
    const match = fs.readdirSync(dir).find((f) => f.endsWith(nameSuffix))
    return match ? path.join(dir, match) : null
  } catch {
    return null
  }
}

// ── Category mapping for signal rule IDs ────────────────────────────────────

function ruleCategory(
  ruleId: string
): 'reentrancy' | 'approval' | 'flashloan' | 'oracle' | 'admin' | 'fundflow' {
  const id = ruleId.toUpperCase()
  if (id.includes('REENTRANCY') || id.includes('REVERT_AFTER_PARTIAL')) return 'reentrancy'
  if (id.includes('APPROVAL') || id.includes('ALLOWANCE') || id.includes('SPENDER')) return 'approval'
  if (id.includes('FLASHLOAN') || id.includes('FLASH')) return 'flashloan'
  if (id.includes('ORACLE') || id.includes('PRICE') || id.includes('SANDWICH')) return 'oracle'
  if (id.includes('ADMIN') || id.includes('PROXY') || id.includes('UPGRADE') || id.includes('ROLE')) return 'admin'
  return 'fundflow'
}

function confidenceToSeverity(
  confidence: string
): 'critical' | 'high' | 'medium' | 'low' {
  switch ((confidence || '').toUpperCase()) {
    case 'CRITICAL': return 'critical'
    case 'HIGH': return 'high'
    case 'MEDIUM': return 'medium'
    default: return 'low'
  }
}

// ── Main loader ───────────────────────────────────────────────────────────────

export async function loadForensicBundle(runId: string): Promise<any> {
  const runPath = path.join(RUNS_DIR, runId)

  // ── run_meta.json (top-level) ──────────────────────────────────────────────
  const run_meta = readJsonSafe(path.join(runPath, 'run_meta.json'))

  // ── Locate the forensic bundle root ───────────────────────────────────────
  // The forensics pipeline writes to:
  //   <runPath>/forensic_bundle/02_forensic_bundle/
  // but also accepts direct placement at <runPath>/forensic_bundle/
  const candidates = [
    path.join(runPath, 'forensic_bundle', '02_forensic_bundle'),
    path.join(runPath, 'forensic_bundle'),
    path.join(runPath, '02_forensic_bundle'),
  ]
  const bundleRoot = candidates.find((c) =>
    fs.existsSync(path.join(c, '05_reports', 'forensic_report.json'))
  ) ?? null

  // ── No forensic analysis yet — return meta-only ────────────────────────────
  if (!bundleRoot) {
    if (run_meta) {
      return {
        runId,
        run_meta,
        transactions: [],
        signals: [],
        entities: [],
        fundFlows: [],
        coverage: { tracesAvailable: false, stateDiffsAvailable: false, decodedABIs: 0 },
        report_summary: null,
        timestamp: Date.now(),
      }
    }
    throw new Error(`Forensic bundle not found for run ${runId}`)
  }

  // ── 1. Forensic report ─────────────────────────────────────────────────────
  const reportData = readJsonSafe(path.join(bundleRoot, '05_reports', 'forensic_report.json'), {})
  const summary = reportData?.summary ?? null

  // ── 2. Signal events → Signal[] ────────────────────────────────────────────
  const signalsNdjsonPath = findFirstFile(path.join(bundleRoot, '03_signals'), 'signals_000001.ndjson')
  const rawSignalEvents: any[] = signalsNdjsonPath ? readNdjson(signalsNdjsonPath) : []

  // Also collect from signals_by_rule in the report (already aggregated)
  const signalsByRule: any[] = Array.isArray(reportData?.signals_by_rule)
    ? reportData.signals_by_rule
    : []

  // Build Signal[] from raw events (prefer those; fall back to report aggregation)
  let signals: any[]
  if (rawSignalEvents.length > 0) {
    signals = rawSignalEvents.map((ev) => ({
      id: ev.record_id ?? `${ev.rule_id}:${ev.tx_hash}`,
      name: ev.rule_name ?? ev.rule_id,
      category: ruleCategory(ev.rule_id ?? ''),
      severity: confidenceToSeverity(ev.confidence),
      confidence: ev.confidence === 'HIGH' ? 0.9 : ev.confidence === 'MEDIUM' ? 0.6 : 0.3,
      description: ev.details ? JSON.stringify(ev.details).slice(0, 200) : ev.rule_name,
      sourceDataPath: `03_signals/signals_000001.ndjson`,
      recordIds: [ev.record_id ?? ''],
      affectedTransactions: ev.tx_hash ? [ev.tx_hash] : [],
      falsePositiveProbability: ev.confidence === 'LOW' ? 0.4 : ev.confidence === 'MEDIUM' ? 0.2 : 0.05,
    }))
  } else {
    // Flatten from report aggregation
    signals = signalsByRule.flatMap((rule: any) =>
      (rule.signals ?? []).map((ev: any) => ({
        id: ev.record_id ?? `${rule.rule_id}:${ev.tx_hash}`,
        name: ev.rule_name ?? rule.rule_id,
        category: ruleCategory(rule.rule_id ?? ''),
        severity: confidenceToSeverity(ev.confidence),
        confidence: ev.confidence === 'HIGH' ? 0.9 : ev.confidence === 'MEDIUM' ? 0.6 : 0.3,
        description: ev.details ? JSON.stringify(ev.details).slice(0, 200) : rule.rule_id,
        sourceDataPath: `03_signals/signals_000001.ndjson`,
        recordIds: [ev.record_id ?? ''],
        affectedTransactions: ev.tx_hash ? [ev.tx_hash] : [],
        falsePositiveProbability: ev.confidence === 'LOW' ? 0.4 : ev.confidence === 'MEDIUM' ? 0.2 : 0.05,
      }))
    )
  }

  // ── 3. Enriched transactions → Transaction[] ───────────────────────────────
  const txStructDir = path.join(bundleRoot, '02_derived', 'tx_structural')
  const txNdjsonPath = findFirstFile(txStructDir, 'transaction_enriched_000001.ndjson')
  const rawTxs: any[] = txNdjsonPath ? readNdjson(txNdjsonPath) : []

  // Build a suspicion-score map from ML top suspicious txs
  const mlDir = path.join(bundleRoot, '05_ml_features')
  const topSuspiciousPath = path.join(mlDir, 'top_suspicious_txs.ndjson')
  const topSuspicious: any[] = readNdjson(topSuspiciousPath)
  const suspicionMap = new Map<string, number>(
    topSuspicious.map((t) => [t.tx_hash, t.suspicion_score ?? 0])
  )

  const transactions: any[] = rawTxs.map((tx) => {
    const score = suspicionMap.get(tx.tx_hash) ?? 0
    return {
      hash: tx.tx_hash,
      from: tx.from ?? '',
      to: tx.to ?? '',
      value: tx.value_eth != null ? String(tx.value_eth) : String(tx.value_wei ?? '0'),
      gasUsed: String(tx.gas_used ?? '0'),
      gasPrice: '0',
      timestamp: 0,
      blockNumber: tx.block_number ?? 0,
      status: tx.status === 1 || tx.status === true ? 'success' : 'reverted',
      isAnomaly: score >= 5,
      anomalyScore: score,
    }
  })

  // ── 4. Address profiles → Entity[] ────────────────────────────────────────
  const invDir = path.join(bundleRoot, '02_derived', 'inventory_profiling')
  const addrNdjsonPath = findFirstFile(invDir, 'address_profile_000001.ndjson')
  const rawAddrs: any[] = addrNdjsonPath ? readNdjson(addrNdjsonPath) : []

  // Attacker/victim sets from run_meta
  const attackerSet = new Set<string>(
    (run_meta?.attacks ?? [])
      .filter((a: any) => a.attacker)
      .map((a: any) => (a.attacker as string).toLowerCase())
  )
  const victimSet = new Set<string>(
    (run_meta?.attacks ?? [])
      .filter((a: any) => a.victim)
      .map((a: any) => (a.victim as string).toLowerCase())
  )

  const entities: any[] = rawAddrs.map((addr) => {
    const lc = (addr.address ?? '').toLowerCase()
    const role = attackerSet.has(lc) ? 'attacker' : victimSet.has(lc) ? 'victim' : undefined
    return {
      address: addr.address ?? '',
      type: addr.is_contract_creator ? 'contract' : 'externally_owned_account',
      role,
      riskScore: role === 'attacker' ? 0.95 : role === 'victim' ? 0.1 : 0.2,
      firstSeen: 0,
      lastSeen: 0,
      transactionCount: (addr.txs_sent ?? 0) + (addr.txs_received ?? 0),
      balance: addr.net_flow_wei != null ? String(addr.net_flow_wei) : undefined,
    }
  })

  // ── 5. Fund flow edges → FundFlow[] ───────────────────────────────────────
  const flowDir = path.join(bundleRoot, '02_derived', 'value_movement')
  const flowNdjsonPath = findFirstFile(flowDir, 'fund_flow_edges_000001.ndjson')
  const rawFlows: any[] = flowNdjsonPath ? readNdjson(flowNdjsonPath) : []

  const fundFlows: any[] = rawFlows.map((flow) => ({
    fromEntity: flow.from ?? '',
    toEntity: flow.to ?? '',
    amount: flow.amount_wei != null ? String(flow.amount_wei) : '0',
    asset: flow.asset_type ?? 'ETH',
    transaction: flow.tx_hash ?? '',
    timestamp: 0,
    isAnomaly: suspicionMap.has(flow.tx_hash),
  }))

  // ── 6. Coverage metadata ───────────────────────────────────────────────────
  const qualityPath = findFirstFile(path.join(bundleRoot, '..', '00_quality'), '.json') ??
                       findFirstFile(path.join(bundleRoot, '00_quality'), '.json')
  const tracesDir = path.join(bundleRoot, '02_derived', 'execution_trace')
  const tracesAvailable = fs.existsSync(tracesDir) && fs.readdirSync(tracesDir).length > 0

  const stateDiffDir = path.join(bundleRoot, '02_derived', 'state_analysis')
  const stateDiffsAvailable = fs.existsSync(stateDiffDir) && fs.readdirSync(stateDiffDir).length > 0

  const selectorPath = findFirstFile(
    path.join(bundleRoot, '02_derived', 'tx_structural'),
    'selector_registry_000001.ndjson'
  )
  const selectors: any[] = selectorPath ? readNdjson(selectorPath) : []
  const decodedABIs = selectors.filter((s) => s.resolved_name != null).length

  const coverage = { tracesAvailable, stateDiffsAvailable, decodedABIs }

  // ── 7. Signals coverage report (for raw diagnostics) ──────────────────────
  const coveragePath = path.join(bundleRoot, '03_signals', '_meta', 'signals_coverage_report.json')
  const signalsCoverage = readJsonSafe(coveragePath, [])

  return {
    runId,
    run_meta,
    transactions,
    signals,
    entities,
    fundFlows,
    coverage,
    report_summary: summary,
    signals_coverage: signalsCoverage,
    timestamp: Date.now(),
  }
}

export async function listRuns(): Promise<string[]> {
  try {
    const runs = fs.readdirSync(RUNS_DIR)
      .filter((f) => f.startsWith('run_'))
      .sort()
      .reverse()
    return runs
  } catch {
    return []
  }
}
