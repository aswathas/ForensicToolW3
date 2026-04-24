export interface ForensicRun {
  runId: string
  timestamp: number
  scenario: string
  confidence: number
  status: 'CONFIRMED' | 'SUSPECTED' | 'NEEDS_REVIEW'
  metadata: {
    totalTransactions: number
    suspiciousTransactions: number
    attackType: string
    attackVector: string
    stolenAmount: string
    stolenAsset: string
    attacker: string
    victim: string
  }
}

export interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  gasUsed: string
  gasPrice: string
  timestamp: number
  blockNumber: number
  status: 'success' | 'reverted'
  isAnomaly: boolean
  anomalyScore: number
}

export interface Signal {
  id: string
  name: string
  category: 'reentrancy' | 'approval' | 'flashloan' | 'oracle' | 'admin' | 'fundflow'
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
  description: string
  sourceDataPath: string
  recordIds: string[]
  affectedTransactions: string[]
  falsePositiveProbability: number
}

export interface Entity {
  address: string
  type: 'contract' | 'externally_owned_account'
  label?: string
  role?: 'attacker' | 'victim' | 'intermediary' | 'sink'
  riskScore: number
  firstSeen: number
  lastSeen: number
  transactionCount: number
  balance?: string
  bytecode?: string
}

export interface FundFlow {
  fromEntity: string
  toEntity: string
  amount: string
  asset: string
  transaction: string
  timestamp: number
  isAnomaly: boolean
}

export interface ForensicBundle {
  runId: string
  transactions: Transaction[]
  signals: Signal[]
  entities: Entity[]
  fundFlows: FundFlow[]
  coverage: {
    tracesAvailable: boolean
    stateDiffsAvailable: boolean
    decodedABIs: number
  }
}
