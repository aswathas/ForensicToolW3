import fs from 'fs'
import path from 'path'

const RUNS_DIR = process.env.RUNS_DIR || '../runs'

export interface ForensicBundleLoaded {
  runId: string
  data: any
}

export async function loadForensicBundle(runId: string): Promise<any> {
  const runPath = path.join(RUNS_DIR, runId, 'forensic_bundle')

  try {
    const reportPath = path.join(runPath, '05_reports', 'forensic_report.json')
    if (!fs.existsSync(reportPath)) {
      throw new Error(`Forensic bundle not found for run ${runId}`)
    }

    const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))

    const signalsPath = path.join(runPath, '03_signals', '_meta', 'signals_coverage_report.json')
    const signals = fs.existsSync(signalsPath) ? JSON.parse(fs.readFileSync(signalsPath, 'utf-8')) : {}

    return {
      runId,
      report: reportData,
      signals,
      timestamp: Date.now(),
    }
  } catch (error: any) {
    throw new Error(`Failed to load forensic bundle: ${error.message}`)
  }
}

export async function listRuns(): Promise<string[]> {
  try {
    const runs = fs.readdirSync(RUNS_DIR)
      .filter(f => f.startsWith('run_'))
      .sort()
      .reverse()
    return runs
  } catch {
    return []
  }
}
