import axios, { AxiosError } from 'axios'

const OLLAMA_CANDIDATES: string[] = [
  ...(process.env.OLLAMA_URL ? [process.env.OLLAMA_URL] : []),
  'http://host.docker.internal:11434',
  'http://192.168.1.5:11434',
  'http://localhost:11434',
]

const MODEL = process.env.OLLAMA_MODEL || 'gemma3:1b'
// Read at call-time so dotenv.config() in index.ts runs first
const getGeminiKey = () => process.env.GEMINI_API_KEY || ''
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent'
const TIMEOUT_MS = 60_000

const SYSTEM_PROMPT =
  'You are EVM.Forensics Copilot, an expert blockchain forensics analyst. ' +
  'Answer concisely with evidence-based reasoning.'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OllamaTagsResponse {
  models: Array<{ name: string; modified_at: string; size: number }>
}

interface OllamaChatResponse {
  message: { role: string; content: string }
}

async function resolveBaseUrl(): Promise<string | null> {
  for (const url of OLLAMA_CANDIDATES) {
    try {
      await axios.get(`${url}/api/tags`, { timeout: 4_000 })
      return url
    } catch { /* try next */ }
  }
  return null
}

async function chatViaGemini(prompt: string): Promise<string> {
  if (!getGeminiKey()) throw new Error('GEMINI_API_KEY not set')

  const res = await axios.post(
    GEMINI_URL,
    { contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1024, temperature: 0.7 } },
    { headers: { 'Content-Type': 'application/json', 'X-goog-api-key': getGeminiKey() }, timeout: TIMEOUT_MS }
  )
  const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned empty response')
  return text
}

export async function checkOllamaHealth(): Promise<{
  ok: boolean; url: string; models?: string[]; error?: string; geminiAvailable: boolean
}> {
  const geminiAvailable = !!getGeminiKey()

  for (const url of OLLAMA_CANDIDATES) {
    try {
      const res = await axios.get<OllamaTagsResponse>(`${url}/api/tags`, { timeout: 4_000 })
      const models = (res.data?.models ?? []).map(m => m.name)
      return { ok: true, url, models, geminiAvailable }
    } catch { /* try next */ }
  }

  return {
    ok: false,
    url: OLLAMA_CANDIDATES[0],
    geminiAvailable,
    error: geminiAvailable
      ? 'Ollama not reachable — using Gemini API fallback'
      : `Ollama not reachable. Set GEMINI_API_KEY in backend/.env for cloud fallback.`,
  }
}

export async function chat(messages: Message[], context: string = ''): Promise<string> {
  const baseUrl = await resolveBaseUrl()

  // ── Try Ollama first ─────────────────────────────────────────────────────
  if (baseUrl) {
    const systemContent = context ? `${context}\n\n${SYSTEM_PROMPT}` : SYSTEM_PROMPT
    const chatMessages = [
      { role: 'system', content: systemContent },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ]
    try {
      const response = await axios.post<OllamaChatResponse>(
        `${baseUrl}/api/chat`,
        { model: MODEL, messages: chatMessages, stream: false },
        { timeout: TIMEOUT_MS }
      )
      const reply = response.data?.message?.content
      if (reply) return reply
    } catch (err) {
      const status = (err as AxiosError)?.response?.status
      // 404 = model not pulled — fall through to Gemini rather than hard fail
      if (status !== 404) throw err
    }
  }

  // ── Gemini fallback ──────────────────────────────────────────────────────
  if (getGeminiKey()) {
    const lastMsg = messages[messages.length - 1]?.content ?? ''
    const prompt = context
      ? `SYSTEM: ${SYSTEM_PROMPT}\nCONTEXT: ${context}\n\nUSER: ${lastMsg}`
      : `SYSTEM: ${SYSTEM_PROMPT}\n\nUSER: ${lastMsg}`
    return chatViaGemini(prompt)
  }

  // ── Both unavailable ─────────────────────────────────────────────────────
  throw new Error(
    'Neither Ollama nor Gemini API is available.\n' +
    '  Option 1 (local): ollama serve && ollama pull gemma:1b\n' +
    '  Option 2 (cloud): Set GEMINI_API_KEY in backend/.env'
  )
}
