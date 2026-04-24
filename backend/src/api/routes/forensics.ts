import express from 'express'
import { loadForensicBundle, listRuns } from '../../services/forensicsService'

const router = express.Router()

router.get('/runs', async (req, res) => {
  try {
    const runs = await listRuns()
    res.json({ success: true, data: runs, timestamp: Date.now() })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, timestamp: Date.now() })
  }
})

router.get('/:runId', async (req, res) => {
  try {
    const bundle = await loadForensicBundle(req.params.runId)
    res.json({ success: true, data: bundle, timestamp: Date.now() })
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message, timestamp: Date.now() })
  }
})

export default router
