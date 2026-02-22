# sathiAI

A beautiful, elegant React web app designed to help older users understand confusing messages (bank SMS, government notices, medical instructions, etc.) using OCR and AI explanations.

## Features

- **Image Upload with OCR**: Upload screenshots of messages and automatically extract text using Tesseract.js (runs in browser)
- **Direct Text Input**: Paste text messages directly
- **AI Explanation**: Backend securely calls HuggingFace Mistral 7B Instruct model
- **Accessible UI**: Large fonts, big buttons, and simple layout for older users
- **One Command**: Both frontend and backend run with `npm run dev`
- **Smart Formatting**: Displays explanations in a structured format

## Tech Stack

- **Frontend**: React 18 + JSX + Vite
- **Backend**: Express.js (handles API calls securely)
- **LLM**: Hugging Face Router → Mistral 7B Instruct v0.2
- **OCR**: Tesseract.js (browser-based)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Hugging Face API

Edit `.env` and add your Hugging Face API key:

```env
VITE_LLM_API_KEY=your_huggingface_api_key_here
```

**Get your API Key:**
1. Go to [huggingface.co](https://huggingface.co)
2. Sign up or log in
3. Go to Settings > Access Tokens
4. Create a new token with "read" access
5. Copy and paste into `.env` as `VITE_LLM_API_KEY`

### 3. Run Development (Frontend + Backend)

```bash
npm run dev
```

This starts both servers:
- **Backend**: `http://localhost:3001` (handles API calls)
- **Frontend**: `http://localhost:5173` (React app)

The browser will open to `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

## Project Structure

```
sathiAI/
├── src/
│   ├── App.jsx          # React component (frontend only)
│   └── main.jsx         # Entry point
├── backend.js           # Express backend handler
├── index.html           # HTML template
├── package.json         # Dependencies & scripts
├── vite.config.js       # Vite configuration
├── .env                 # API key (not committed)
└── public/
    └── favicon.ico
```

## How It Works

1. **User Input** → Upload image or paste text in React UI
2. **OCR Processing** → Tesseract.js extracts text from images (browser)
3. **Backend Call** → Frontend sends text to `/api/huggingface/chat/completions`
4. **API Proxy** → Backend forwards to HuggingFace Router with Bearer token auth
5. **AI Response** → HuggingFace returns explanation from Mistral 7B
6. **Display** → Frontend shows explanation in 4 sections

## Files Overview

### Frontend (App.jsx)
- 400 lines of React JSX
- Handles UI, OCR, and API calls to backend
- Sends chat completion format (messages array)

### Backend (backend.js)
- Express server on port 3001
- Receives requests at `/api/huggingface/chat/completions`
- Forwards to `https://router.huggingface.co/v1/chat/completions`
- Uses Bearer token auth with HuggingFace API key
- Returns chat completion response

### Environment
- `VITE_LLM_API_KEY`: Your HuggingFace token (kept secure on backend)
- `.env` file is in `.gitignore` (never committed)

## Key Points

✅ Both frontend and backend run with single `npm run dev` command  
✅ API key kept secure (only backend uses it)  
✅ Chat completion format compatible with many LLM providers  
✅ Tesseract.js for OCR (no additional services needed)  
✅ Clean separation: React frontend, Express backend  
✅ Easy to extend with other LLM providers or APIs
