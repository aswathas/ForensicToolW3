import express from 'express'
import { chat } from '../../services/ollamaService'

const router = express.Router()

interface ChatRequest {
  runId: string
  message: string
  context?: { selectedTx?: string; selectedEntity?: string }
}

router.post('/', async (req, res) => {
  const { runId, message, context } = req.body as ChatRequest

  try {
    const contextStr = context
      ? `Run: ${runId}, Entity: ${context.selectedEntity || 'N/A'}, Tx: ${context.selectedTx || 'N/A'}`
      : ''
    const response = await chat([{ role: 'user', content: message }], contextStr)

    res.json({
      success: true,
      data: {
        messages: [
          { role: 'user', content: message, timestamp: Date.now() },
          { role: 'assistant', content: response, timestamp: Date.now() },
        ],
        context: { runId, selectedEntity: context?.selectedEntity, selectedTransaction: context?.selectedTx },
      },
      timestamp: Date.now(),
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, timestamp: Date.now() })
  }
})

export default router
