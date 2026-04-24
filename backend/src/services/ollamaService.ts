import axios from 'axios'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function chat(messages: Message[], context: string = ''): Promise<string> {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: 'phi3:mini',
      prompt: context
        ? `Context: ${context}\n\nUser: ${messages[messages.length - 1].content}`
        : messages[messages.length - 1].content,
      stream: false,
    })

    return response.data.response
  } catch (error: any) {
    throw new Error(`Ollama error: ${error.message}`)
  }
}
