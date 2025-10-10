# Quick Start Guide

Get your OneDrive monitoring bot running in 15 minutes!

## Step 1: Get Your Credentials (5 min)

### Slack Webhook
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "Wage Statement Monitor"
4. Go to "Incoming Webhooks" → Turn on
5. "Add New Webhook to Workspace" → Select your channel
6. Copy the webhook URL

### Microsoft Graph Access Token

**Quick Method (expires in 1 hour - good for testing):**
1. Go to https://developer.microsoft.com/en-us/graph/graph-explorer
2. Sign in with your Microsoft account
3. Click "Access Token" tab
4. Copy the token

**Production Method (see README.md for full Azure setup)**

## Step 2: Install & Deploy (5 min)

```bash
# Install dependencies
npm install

# Login to Vercel
npx vercel login

# Deploy
npx vercel
```

## Step 3: Set Environment Variables (3 min)

In Vercel Dashboard or via CLI:

```bash
npx vercel env add ONEDRIVE_ACCESS_TOKEN
# Paste your Microsoft Graph token

npx vercel env add SLACK_WEBHOOK_URL
# Paste your Slack webhook URL

npx vercel env add STATE_DATA
# Enter: {}

npx vercel env add CRON_SECRET
# Enter any random string (optional)
```

## Step 4: Deploy to Production (1 min)

```bash
npx vercel --prod
```

## Step 5: Test (1 min)

Visit: `https://your-project.vercel.app/api/test-notification`

You should see a message in your Slack channel!

## What's Next?

- The bot will automatically check folders daily at 9 AM UTC
- Manually test: Visit `/api/check-folders` endpoint
- View logs: Vercel Dashboard → Your Project → Logs
- For production setup with persistent tokens, see README.md

## Troubleshooting

**No Slack message?**
- Check webhook URL is correct
- Verify bot is in the right channel

**OneDrive errors?**
- Token may have expired (get a new one)
- Verify "Client Folders" exists in your OneDrive
- Check folder permissions

**Questions?**
See the full README.md for detailed instructions!

