import { useEffect, useState } from 'react'
import api from '../utils/api'
import type { ForensicBundle, Transaction, Signal, FundFlow } from '../types/forensics'

export interface UseForensicDataResult {
  data: ForensicBundle | null
  loading: boolean
  error: string | null
}

export function useForensicData(runId: string | null): UseForensicDataResult {
  const [data, setData] = useState<ForensicBundle | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    api
      .getForensicRun(runId)
      .then((raw: any) => {
        if (cancelled) return
        setData(normalizeBundle(runId, raw))
      })
      .catch((err: any) => {
        if (cancelled) return
        setError(err?.message || 'Failed to load forensic data')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [runId])

  return { data, loading, error }
}

function normalizeBundle(runId: string, raw: any): ForensicBundle {
  const transactions: Transaction[] = Array.isArray(raw?.transactions) ? raw.transactions : []
  const signals: Signal[] = Array.isArray(raw?.signals) ? raw.signals : []
  const fundFlows: FundFlow[] = Array.isArray(raw?.fundFlows) ? raw.fundFlows : []
  const entities = Array.isArray(raw?.entities) ? raw.entities : []

  return {
    runId,
    transactions,
    signals,
    entities,
    fundFlows,
    coverage: raw?.coverage ?? {
      tracesAvailable: false,
      stateDiffsAvailable: false,
      decodedABIs: 0,
    },
  }
}
