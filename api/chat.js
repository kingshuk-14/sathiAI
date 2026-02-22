// Vercel Serverless Function for Chat API
// Handles Hugging Face API calls securely

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const apiKey = process.env.VITE_LLM_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' })
    }

    const { model, messages, max_tokens, temperature } = req.body

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Messages are required' })
    }

    // Call Hugging Face Router API
    const response = await fetch(
      'https://router.huggingface.co/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'mistralai/Mistral-7B-Instruct-v0.2',
          messages,
          max_tokens: max_tokens || 900,
          temperature: temperature || 0.7,
          stream: false
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Hugging Face API Error:', errorData)
      return res.status(response.status).json({
        error: errorData.error?.message || 'Error from Hugging Face API'
      })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error) {
    console.error('Error in chat handler:', error)
    return res.status(500).json({
      error: error.message || 'Internal server error'
    })
  }
}
