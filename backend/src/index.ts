import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import forensicsRouter from './api/routes/forensics'
import ollamaRouter from './api/routes/ollama'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/forensics', forensicsRouter)
app.use('/api/chat', ollamaRouter)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err)
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: Date.now(),
  })
})

app.listen(PORT, () => {
  console.log(`Forensics API running on http://localhost:${PORT}`)
})
