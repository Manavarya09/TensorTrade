# Vercel Deployment Guide

## 🚨 Current Issue: Missing API Keys

Your app is getting 500 errors because the environment variables are not set in Vercel.

## ✅ Fix Steps

### 1. Add Environment Variables to Vercel

Run these commands **one by one** in your terminal:

```bash
vercel env add GROQ_API_KEY
# When prompted:
# - Paste your Groq API key
# - Select: Production, Preview, Development (use spacebar to multi-select)
# - Press Enter

vercel env add OPENROUTER_API_KEY
# When prompted:
# - Paste your OpenRouter API key
# - Select: Production, Preview, Development
# - Press Enter

vercel env add MISTRAL_API_KEY
# When prompted:
# - Paste your Mistral API key
# - Select: Production, Preview, Development
# - Press Enter
```

### 2. Deploy Updated Code

```bash
# Commit the changes
git add .
git commit -m "Add error handling and diagnostics for Vercel deployment"
git push

# Deploy to Vercel
vercel --prod
```

### 3. Verify Deployment

After deployment completes, visit: **https://tensor-trade-umber.vercel.app/health**

You should see:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "environment": {
    "api_keys": {
      "groq": "✓",
      "openrouter": "✓",
      "mistral": "✓",
      "gemini": "✗"
    },
    "llm_available": true
  }
}
```

### 4. Test the App

Visit: **https://tensor-trade-umber.vercel.app/**

Try analyzing AAPL, SPY, or TSLA.

## 📝 Where to Get API Keys

### Free Tier API Keys:

1. **Groq** (Fast, Free)
   - Visit: https://console.groq.com/
   - Sign up and get API key from dashboard

2. **OpenRouter** (Multiple Models, Free Tier)
   - Visit: https://openrouter.ai/
   - Sign up and get API key
   - Supports multiple free models

3. **Mistral** (Optional, Free Tier Available)
   - Visit: https://console.mistral.ai/
   - Sign up and get API key

## 🔍 Troubleshooting

### Still seeing 500 errors?

Check the Vercel deployment logs:
```bash
vercel logs --prod
```

### Environment variables not working?

Verify they're set:
```bash
vercel env ls
```

### Need to update an environment variable?

```bash
vercel env rm GROQ_API_KEY production
vercel env add GROQ_API_KEY
# Then redeploy
vercel --prod
```

## 📊 What Changed

The updated code now:
- ✅ Validates API keys on startup
- ✅ Shows detailed diagnostics in /health endpoint
- ✅ Provides helpful error messages instead of generic 500 errors
- ✅ Logs environment status for debugging
- ✅ Gracefully handles missing API keys

## 🎯 Quick Deploy Commands

```bash
# One-time setup (if not done already)
npm install -g vercel
vercel login

# Every deployment
git add .
git commit -m "Update"
git push
vercel --prod
```
