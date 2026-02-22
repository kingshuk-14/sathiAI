# Deploying sathiAI to Vercel

This guide will help you deploy sathiAI to Vercel with both frontend and serverless backend functions.

## Prerequisites

- **Vercel Account**: Sign up at https://vercel.com
- **GitHub Account**: Project must be pushed to GitHub
- **Hugging Face API Key**: Get it from https://huggingface.co/settings/tokens

## Step-by-Step Deployment

### 1. Push Code to GitHub

Make sure your project is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Connect GitHub to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub account and the `sathiAI` repository
4. Click "Import"

### 3. Configure Environment Variables

In the Vercel import screen, add your environment variables:

| Variable | Value |
|----------|-------|
| `VITE_LLM_API_KEY` | Your Hugging Face API key |

Click "Deploy"

### 4. Wait for Deployment

Vercel will automatically:
- Build your React frontend with Vite
- Create serverless functions from the `/api` directory
- Deploy everything to a live URL

### 5. Access Your App

Once deployed, you'll see your live URL. Click it to view the app!

## Project Structure for Vercel

```
sathiAI/
├── api/
│   └── chat.js              # Serverless function for chat API
├── src/
│   ├── App.jsx              # Main React component
│   └── main.jsx             # Entry point
├── public/
│   └── logo.png             # sathiAI logo
├── vercel.json              # Vercel configuration
├── vite.config.js           # Vite build config
├── package.json             # Dependencies
└── .env.example             # Environment variables template
```

## How It Works

### Frontend
- **Framework**: React 18 with Vite
- **Build**: `npm run build` creates optimized bundle
- **Deployment**: Hosted on Vercel's CDN

### Backend
- **Type**: Serverless functions
- **Location**: `/api/chat.js`
- **Runtime**: Node.js
- **Endpoint**: `https://your-app.vercel.app/api/chat`

### API Flow

1. **Frontend** sends message → `/api/chat` (Vercel function)
2. **Serverless function** calls Hugging Face API
3. **Response** returned to frontend
4. **UI** displays result in card format

## Development vs Production

### Local Development
- Frontend runs on `http://localhost:5173`
- Backend proxy forwards `/api` to `http://localhost:3001`
- Start with: `npm run dev`

### Production (Vercel)
- Frontend and backend both run on Vercel
- `/api/chat` automatically routes to `api/chat.js`
- No proxy needed

## Troubleshooting

### Build Fails

Check Vercel logs:
1. Go to your Vercel dashboard
2. Click the failed deployment
3. Check build logs for errors

Common issues:
- Missing API key → Add `VITE_LLM_API_KEY` in Vercel project settings
- Node version mismatch → Vercel uses Node 18 by default

### API Returns 500 Error

1. Check serverless function logs in Vercel
2. Verify `VITE_LLM_API_KEY` is set correctly
3. Check Hugging Face API status: https://huggingface.co/status

### CORS Issues

Not applicable with Vercel - same origin for frontend and backend (both on `vercel.app`)

## Environment Variables

Required variables in Vercel project settings:

```
VITE_LLM_API_KEY=hf_your_hugging_face_api_key
```

Get your API key:
1. Go to https://huggingface.co/settings/tokens
2. Create new token with "read" permissions
3. Copy the token
4. Paste in Vercel environment variables

## Redeploy Your App

To redeploy after making changes:

```bash
git add .
git commit -m "Update message"
git push origin main
```

Vercel automatically redeploys on push to main branch.

## Performance Tips

- Reviews are fast (React + Vite = optimized bundle)
- Serverless functions cold start in ~500ms
- Responses cached by Vercel CDN

## Support

For issues:
- **Vercel Help**: https://vercel.com/support
- **Hugging Face Issues**: https://huggingface.co/support
- **GitHub Issues**: Create an issue in your repo

---

**Happy deploying! 🚀**
