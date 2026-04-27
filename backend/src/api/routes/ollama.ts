import express from 'express'
import { chat, checkOllamaHealth } from '../../services/ollamaService'

const router = express.Router()

// ── Types ──────────────────────────────────────────────────────────────────
interface ChatRequestBody {
  runId?: string
  message: string
  /** Full system-context string built by the frontend (buildSystemContext) */
  systemContext?: string
  /** Last N conversation turns for multi-turn context */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

// ── GET /status ─────────────────────────────────────────────────────────────
// Returns Ollama reachability + available models.
router.get('/status', async (_req, res) => {
  try {
    const health = await checkOllamaHealth()
    const statusCode = health.ok ? 200 : 503
    res.status(statusCode).json({
      success: health.ok,
      data: health,
      timestamp: Date.now(),
    })
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message ?? 'Unexpected error checking Ollama health',
      timestamp: Date.now(),
    })
  }
})

// ── POST / ───────────────────────────────────────────────────────────────────
// Main chat endpoint.
// Body: { message, systemContext?, history?, runId? }
router.post('/', async (req, res) => {
  const { runId, message, systemContext, history = [] } =
    req.body as ChatRequestBody

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({
      success: false,
      error: 'Request body must include a non-empty "message" string.',
      timestamp: Date.now(),
    })
    return
  }

  // Build conversation: history turns + the new user message
  const conversationMessages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }> = [
    ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user' as const, content: message.trim() },
  ]

  try {
    const reply = await chat(conversationMessages, systemContext ?? '')

    res.json({
      success: true,
      data: {
        reply,
        runId: runId ?? null,
      },
      timestamp: Date.now(),
    })
  } catch (err: any) {
    const msg: string = err?.message ?? 'Unknown error'

    // Distinguish Ollama-down (502) from other server errors (500)
    const isOllamaDown =
      msg.includes('ECONNREFUSED') ||
      msg.includes('ENOTFOUND') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('not reachable') ||
      msg.includes('ollama serve')

    const statusCode = isOllamaDown ? 502 : 500

    res.status(statusCode).json({
      success: false,
      error: msg,
      timestamp: Date.now(),
    })
  }
})

export default router
