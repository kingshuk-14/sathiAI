import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// HuggingFace Router Chat Completion Endpoint
app.post('/api/huggingface/chat/completions', async (req, res) => {
  try {
    const { messages } = req.body
    const apiKey = process.env.VITE_LLM_API_KEY

    if (!apiKey) {
      return res.status(400).json({ error: 'API key not configured' })
    }

    if (!messages) {
      return res.status(400).json({ error: 'Messages are required' })
    }

    console.log('Forwarding to HuggingFace Router...')

    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('HuggingFace API error:', response.status, errorText)
      return res.status(response.status).json({ 
        error: `HuggingFace API error: ${response.status}`,
        details: errorText 
      })
    }

    const data = await response.json()
    console.log('HuggingFace response received')

    res.json(data)
  } catch (error) {
    console.error('Backend error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
})
