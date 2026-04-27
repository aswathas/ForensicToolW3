import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, X, Send, Loader2, WifiOff, ChevronRight,
  AlertTriangle, Zap, Activity, MessageSquare,
} from 'lucide-react'
import type { ForensicBundle } from '../../types/forensics'

// ── Types ──────────────────────────────────────────────────────────────────
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isError?: boolean
}

interface CopilotPanelProps {
  runId?: string
  runData?: ForensicBundle | null
  /** Raw run meta from Dashboard (when ForensicBundle isn't available) */
  runMeta?: {
    scenario?: string
    blockRange?: string
    timestamp?: string
    attacksTotal?: number
    attacksSucceeded?: number
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function buildSystemContext(
  runId: string | undefined,
  runData: ForensicBundle | null | undefined,
  runMeta: CopilotPanelProps['runMeta']
): string {
  if (!runId) {
    return `You are EVM.Forensics Copilot, an AI assistant specialising in EVM blockchain forensics. No run is currently selected. Help the user understand how to use the tool or answer general questions about blockchain security.`
  }

  const lines: string[] = [
    `You are EVM.Forensics Copilot, an AI assistant specialising in EVM blockchain forensics.`,
    `You are analysing run ID: ${runId}.`,
  ]

  if (runMeta) {
    if (runMeta.scenario) lines.push(`Scenario: ${runMeta.scenario}`)
    if (runMeta.blockRange) lines.push(`Block range: ${runMeta.blockRange}`)
    if (runMeta.timestamp) lines.push(`Run timestamp: ${runMeta.timestamp}`)
    if (runMeta.attacksTotal !== undefined) {
      lines.push(
        `Attack summary: ${runMeta.attacksSucceeded ?? 0} of ${runMeta.attacksTotal} attacks succeeded.`
      )
    }
  }

  if (runData) {
    lines.push(`Total transactions: ${runData.transactions.length}`)
    lines.push(`Suspicious transactions: ${runData.transactions.filter(t => t.isAnomaly).length}`)
    lines.push(`Signals fired: ${runData.signals.length}`)
    lines.push(`Entities detected: ${runData.entities.length}`)

    if (runData.signals.length > 0) {
      const sigSummary = runData.signals
        .slice(0, 6)
        .map(s => `  • [${s.severity.toUpperCase()}] ${s.name} (confidence ${Math.round(s.confidence * 100)}%)`)
        .join('\n')
      lines.push(`Top signals:\n${sigSummary}`)
    }

    const highRisk = runData.entities
      .filter(e => e.riskScore >= 0.7)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 4)
    if (highRisk.length > 0) {
      const entitySummary = highRisk
        .map(e => `  • ${e.address.slice(0, 12)}… role=${e.role ?? 'unknown'} risk=${(e.riskScore * 100).toFixed(0)}%`)
        .join('\n')
      lines.push(`High-risk entities:\n${entitySummary}`)
    }
  }

  lines.push(
    `Answer concisely. Cite specific signals, transactions, or entities when relevant. If you are unsure, say so — do not fabricate evidence.`
  )

  return lines.join('\n')
}

// ── Quick prompts shown when chat is empty ─────────────────────────────────
const QUICK_PROMPTS = [
  'Summarise the top threats in this run',
  'Which entities are highest risk?',
  'Explain the reentrancy signals detected',
  'What fund flows look suspicious?',
]

// ── Health state ───────────────────────────────────────────────────────────
interface OllamaHealth {
  checked: boolean
  ok: boolean
  url: string
  models?: string[]
  error?: string
  geminiAvailable?: boolean
}

// ── Main component ─────────────────────────────────────────────────────────
export const CopilotPanel: React.FC<CopilotPanelProps> = ({ runId, runData, runMeta }) => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ollamaOffline, setOllamaOffline] = useState(false)
  const [ollamaHealth, setOllamaHealth] = useState<OllamaHealth>({
    checked: false,
    ok: false,
    url: 'http://host.docker.internal:11434',
  })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 350)
    }
  }, [open])

  // Health check when panel opens for the first time
  useEffect(() => {
    if (!open || ollamaHealth.checked) return

    const API_BASE =
      (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:3001'

    fetch(`${API_BASE}/api/chat/status`, { signal: AbortSignal.timeout(6_000) })
      .then(async (res) => {
        const json = await res.json()
        const data = json?.data ?? {}
        const health: OllamaHealth = {
          checked: true,
          ok: data.ok === true,
          url: data.url ?? 'http://host.docker.internal:11434',
          models: data.models,
          error: data.error,
          geminiAvailable: data.geminiAvailable === true,
        }
        setOllamaHealth(health)
        // If Gemini is available as fallback, don't show offline — AI still works
        if (!health.ok && !health.geminiAvailable) setOllamaOffline(true)
      })
      .catch(() => {
        setOllamaHealth({
          checked: true,
          ok: false,
          url: 'http://host.docker.internal:11434',
          error: 'Backend unreachable',
        })
        setOllamaOffline(true)
      })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prime with system context when panel opens for first time
  useEffect(() => {
    if (open && messages.length === 0) {
      const systemCtx = buildSystemContext(runId, runData, runMeta)
      setMessages([
        {
          id: uid(),
          role: 'assistant',
          content: runId
            ? `Copilot online. I have loaded context for **run_${runId}**.\n\nI can see ${runData?.signals.length ?? 0} signals and ${runData?.transactions.filter(t => t.isAnomaly).length ?? 0} suspicious transactions. What would you like to investigate?`
            : `Copilot online. No run is selected — navigate to an investigation to get run-specific analysis, or ask me anything about EVM forensics.`,
          timestamp: Date.now(),
        },
      ])
      // Store system context as hidden first message reference (not displayed)
      void systemCtx
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return

      const userMsg: Message = {
        id: uid(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      }

      setMessages(prev => [...prev, userMsg])
      setInput('')
      setLoading(true)
      setOllamaOffline(false)

      try {
        const API_BASE =
          (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:3001'

        const systemContext = buildSystemContext(runId, runData, runMeta)

        const res = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId,
            message: text.trim(),
            systemContext,
            history: messages
              .filter(m => m.role !== 'system')
              .slice(-6)
              .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          }),
          signal: AbortSignal.timeout(60_000),
        })

        const json = await res.json()

        if (!res.ok) {
          // 502 means Ollama is down; surface the backend error message
          const isOllamaDown = res.status === 502
          if (isOllamaDown) setOllamaOffline(true)
          throw new Error(json?.error ?? `HTTP ${res.status}`)
        }

        const reply = json?.data?.reply ?? ''
        if (!reply) throw new Error('Empty response from Ollama')

        // Health confirmed — clear offline flag
        setOllamaOffline(false)

        setMessages(prev => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: reply,
            timestamp: Date.now(),
          },
        ])
      } catch (err: any) {
        const msg: string = err?.message ?? 'Unknown error'
        const isNetworkError =
          err?.name === 'TypeError' ||
          msg.includes('Failed to fetch') ||
          msg.includes('ECONNREFUSED') ||
          msg.includes('not reachable') ||
          msg.includes('ollama serve') ||
          msg.includes('HTTP 502') ||
          msg.includes('HTTP 503')

        if (isNetworkError) {
          setOllamaOffline(true)
          const triedUrl = ollamaHealth.url || 'host.docker.internal:11434'
          const hasGemini = ollamaHealth.geminiAvailable
          setMessages(prev => [
            ...prev,
            {
              id: uid(),
              role: 'assistant',
              content: hasGemini
                ? `Ollama offline — switched to **Gemini API** (cloud).\n\nYou can still use the copilot. To use local AI instead:\n1. Run: \`ollama serve\`\n2. Run: \`ollama pull gemma:1b\``
                : `Ollama is offline (tried: ${triedUrl}).\n\nTo fix:\n1. Run: \`ollama serve\`\n2. Run: \`ollama pull gemma:1b\`\n\nOr set \`GEMINI_API_KEY\` in backend/.env for cloud fallback.`,
              timestamp: Date.now(),
              isError: !hasGemini,
            },
          ])
        } else {
          setMessages(prev => [
            ...prev,
            {
              id: uid(),
              role: 'assistant',
              content: `Unable to process your request. ${msg}`,
              timestamp: Date.now(),
              isError: true,
            },
          ])
        }
      } finally {
        setLoading(false)
      }
    },
    [loading, messages, runId, runData, runMeta]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* ── Floating trigger button ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="copilot-trigger"
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={() => setOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5
                       py-4 px-2.5 rounded-l-xl border border-r-0 border-border-neon
                       bg-bg-card cursor-pointer group"
            style={{ boxShadow: '-4px 0 20px rgba(220,20,60,0.2)' }}
            aria-label="Open Copilot"
          >
            <Bot
              size={18}
              className="text-ferrari-500 group-hover:text-ferrari-400 transition-colors"
              style={{ filter: 'drop-shadow(0 0 6px rgba(220,20,60,0.6))' }}
            />
            <span
              className="text-[10px] font-mono font-bold text-ferrari-400 tracking-widest"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
            >
              COPILOT
            </span>
            <ChevronRight size={12} className="text-text-muted group-hover:text-ferrari-400 transition-colors" />

            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-l-xl border border-ferrari-500/40"
              animate={{ opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Backdrop (mobile-friendly) ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="copilot-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-bg-void/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sliding drawer ── */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="copilot-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            className="fixed top-0 right-0 h-full z-50 flex flex-col"
            style={{ width: 380 }}
            aria-label="Copilot chat panel"
          >
            {/* Glass panel */}
            <div
              className="flex flex-col h-full bg-bg-card border-l border-border-dim"
              style={{ boxShadow: '-8px 0 40px rgba(0,0,0,0.6), -2px 0 0 rgba(220,20,60,0.15)' }}
            >

              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b border-border-dim shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(220,20,60,0.08) 0%, transparent 60%)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Bot
                      size={18}
                      className="text-ferrari-500"
                      style={{ filter: 'drop-shadow(0 0 6px rgba(220,20,60,0.7))' }}
                    />
                    <motion.div
                      className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${ollamaOffline ? 'bg-gold-400' : 'bg-green-500'}`}
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-mono font-bold text-text-primary tracking-wide">
                      EVM<span className="text-ferrari-500">.</span>Forensics Copilot
                    </p>
                    {runId && (
                      <p className="text-[10px] font-mono text-text-muted">
                        run_{runId}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ollamaHealth.checked && ollamaHealth.ok && ollamaHealth.models && ollamaHealth.models.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded" title={`Available: ${ollamaHealth.models.join(', ')}`}>
                      <Activity size={10} />
                      {ollamaHealth.models[0]}
                    </div>
                  )}
                  {ollamaOffline && (
                    <div
                      className="flex items-center gap-1 text-[10px] font-mono text-gold-400 border border-gold-500/30 px-1.5 py-0.5 rounded cursor-help"
                      title={`Tried: ${ollamaHealth.url}\nSet OLLAMA_HOST=0.0.0.0 on Windows, then: ollama serve && ollama pull gemma:1b`}
                    >
                      <WifiOff size={10} />
                      Offline
                    </div>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded flex items-center justify-center text-text-muted
                               hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                    aria-label="Close copilot"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Context strip */}
              {runData && (
                <div className="flex gap-3 px-4 py-2 border-b border-border-dim bg-bg-void/40 shrink-0">
                  {[
                    { icon: Zap,           label: 'Signals',  value: runData.signals.length,                                       color: 'text-ferrari-400' },
                    { icon: AlertTriangle, label: 'Anomalies', value: runData.transactions.filter(t => t.isAnomaly).length,        color: 'text-gold-400' },
                    { icon: Activity,      label: 'Entities',  value: runData.entities.length,                                     color: 'text-sky-400' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-center gap-1.5 text-[10px] font-mono">
                      <Icon size={10} className={color} />
                      <span className="text-text-muted">{label}:</span>
                      <span className={`font-bold ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                    <MessageSquare size={28} className="text-text-dim" />
                    <p className="text-xs font-mono text-text-muted">Loading context...</p>
                  </div>
                )}

                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`
                        max-w-[90%] rounded-lg px-3 py-2 text-xs font-mono leading-relaxed whitespace-pre-wrap
                        ${msg.role === 'user'
                          ? 'bg-ferrari-600/20 border border-ferrari-600/30 text-text-primary'
                          : msg.isError
                            ? 'bg-gold-500/10 border border-gold-500/30 text-gold-300'
                            : 'bg-bg-secondary border border-border-dim text-text-secondary'
                        }
                      `}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[9px] font-mono text-text-dim px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-start gap-2">
                    <div className="bg-bg-secondary border border-border-dim rounded-lg px-3 py-2 flex items-center gap-2">
                      <Loader2 size={12} className="text-ferrari-500 animate-spin" />
                      <span className="text-xs font-mono text-text-muted">Thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Quick prompts (show when chat has at most 1 message) */}
              {messages.length <= 1 && !loading && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                  {QUICK_PROMPTS.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="text-[10px] font-mono px-2 py-1 rounded border border-border-dim
                                 text-text-muted hover:border-ferrari-500/50 hover:text-ferrari-400
                                 bg-bg-void transition-colors duration-150 text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Input bar */}
              <div className="px-4 py-3 border-t border-border-dim shrink-0">
                <div className="flex gap-2 items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about this run..."
                    disabled={loading}
                    className="flex-1 bg-bg-void border border-border-dim rounded px-3 py-2
                               text-xs font-mono text-text-primary placeholder-text-dim
                               focus:border-ferrari-500/60 focus:outline-none transition-colors
                               disabled:opacity-50"
                  />
                  <motion.button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    className="w-8 h-8 rounded flex items-center justify-center shrink-0
                               bg-ferrari-600 hover:bg-ferrari-500 disabled:opacity-40
                               disabled:cursor-not-allowed transition-colors"
                    style={{ boxShadow: '0 0 12px rgba(220,20,60,0.3)' }}
                    whileTap={{ scale: 0.92 }}
                    aria-label="Send message"
                  >
                    <Send size={13} className="text-white" />
                  </motion.button>
                </div>
                <p className="text-[9px] font-mono text-text-dim mt-1.5 text-center">
                  Powered by Ollama · Evidence-grounded responses only
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
