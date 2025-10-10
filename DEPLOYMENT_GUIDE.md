# Step-by-Step Deployment Guide

## Prerequisites Checklist
- ✅ Microsoft Graph API set up with `Files.Read.All` and `Sites.Read.All` permissions
- ⏳ Microsoft Graph API access token (we'll get this)
- ⏳ Slack webhook URL (we'll get this)
- ⏳ Vercel account (free tier is fine)

---

## Step 1: Get Your Microsoft Graph API Access Token

Since you have the Graph API set up with the right permissions, let's get your access token.

### Option A: Quick Test Token (expires in 1 hour - good for initial testing)

1. Go to [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Click **Sign in with Microsoft** (top right)
3. Sign in with your account that has access to the OneDrive
4. Once signed in, you'll see a query interface
5. Run any query (the default `/me` is fine)
6. Click on the **Access Token** tab (next to Request headers)
7. Click **Copy** to copy your access token
8. **Save this token** - you'll need it in Step 4

### Option B: Production Token (recommended after testing)

Use the interactive setup script I've provided:

```bash
npm install
npm run setup
```

Follow the prompts to get a longer-lasting token.

---

## Step 2: Set Up Slack Webhook

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App**
3. Select **From scratch**
4. Name it: **Wage Statement Monitor**
5. Select your workspace
6. Click **Create App**

Now configure the webhook:

7. In the left sidebar, click **Incoming Webhooks**
8. Toggle **Activate Incoming Webhooks** to **On**
9. Scroll down and click **Add New Webhook to Workspace**
10. Select your private channel where you want notifications
11. Click **Allow**
12. **Copy the Webhook URL** (starts with `https://hooks.slack.com/services/...`)
13. **Save this URL** - you'll need it in Step 4

---

## Step 3: Install Dependencies & Login to Vercel

Open your terminal in the "Wage Statement Notifs" folder:

```bash
# Install project dependencies
npm install

# Install Vercel CLI globally (if you haven't already)
npm install -g vercel

# Login to Vercel
vercel login
```

Follow the prompts to authenticate (usually via email or GitHub).

---

## Step 4: Deploy to Vercel (Preview)

First, let's do a preview deployment to test:

```bash
vercel
```

You'll see prompts like:

```
? Set up and deploy "~/Downloads/Wage Statement Notifs"? [Y/n] Y
? Which scope do you want to deploy to? Your Name
? Link to existing project? [y/N] N
? What's your project's name? wage-statement-monitor
? In which directory is your code located? ./
```

Just press Enter for most of these (accept defaults).

After deployment completes, you'll see:
```
✅  Preview: https://wage-statement-monitor-xxxxx.vercel.app
```

**Keep this URL handy!**

---

## Step 5: Add Environment Variables

Now we need to add your credentials. You can do this two ways:

### Option A: Via Vercel CLI (Recommended)

```bash
vercel env add ONEDRIVE_ACCESS_TOKEN
```
When prompted:
- **What's the value?** → Paste your Microsoft Graph access token from Step 1
- **Add to which environments?** → Select: Production, Preview, Development (use space to select, enter to confirm)

```bash
vercel env add SLACK_WEBHOOK_URL
```
When prompted:
- **What's the value?** → Paste your Slack webhook URL from Step 2
- **Add to which environments?** → Select: Production, Preview, Development

```bash
vercel env add STATE_DATA
```
When prompted:
- **What's the value?** → Type: `{}`
- **Add to which environments?** → Select: Production, Preview, Development

```bash
vercel env add CRON_SECRET
```
When prompted:
- **What's the value?** → Type any random string (e.g., `my_secret_12345`)
- **Add to which environments?** → Select: Production, Preview, Development

### Option B: Via Vercel Dashboard

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project: **wage-statement-monitor**
3. Go to **Settings** tab
4. Click **Environment Variables** in the left sidebar
5. Add these variables one by one:

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `ONEDRIVE_ACCESS_TOKEN` | Your Graph API token from Step 1 | Production, Preview, Development |
| `SLACK_WEBHOOK_URL` | Your Slack webhook URL from Step 2 | Production, Preview, Development |
| `STATE_DATA` | `{}` | Production, Preview, Development |
| `CRON_SECRET` | Any random string | Production, Preview, Development |

---

## Step 6: Deploy to Production

Now let's deploy to production:

```bash
vercel --prod
```

After a moment, you'll see:
```
✅  Production: https://wage-statement-monitor.vercel.app
```

**Your bot is now live!** 🎉

---

## Step 7: Test Your Setup

### Test Slack Integration

Open your browser and visit:
```
https://your-project.vercel.app/api/test-notification
```

Replace `your-project` with your actual Vercel URL.

You should:
1. See a JSON response: `{"success": true, "message": "Test notification sent to Slack"}`
2. Receive a message in your Slack channel: "✅ OneDrive monitoring bot is set up and running!"

### Test OneDrive Scanning

Visit:
```
https://your-project.vercel.app/api/check-folders
```

You should see a JSON response like:
```json
{
  "success": true,
  "timestamp": "2024-10-10T14:00:00.000Z",
  "filesChecked": 5,
  "newFilesFound": 2,
  "message": "Notified about 2 new file(s)"
}
```

**If you have files in your client folders**, you'll also get a Slack notification listing them!

---

## Step 8: Verify Cron Job

The bot will now run automatically every day at **9 AM EST** (2 PM UTC).

To verify it's scheduled:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Cron Jobs** tab (in the left sidebar)
4. You should see:
   - Path: `/api/check-folders`
   - Schedule: `0 14 * * *` (9 AM EST)
   - Status: Active

---

## Step 9: Monitor Execution

### View Logs

To see when your bot runs and what it finds:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Click **Logs** tab
4. You'll see execution logs every time the bot runs

### Cron Job History

1. In your project, go to **Cron Jobs** tab
2. Click on your cron job
3. View execution history with timestamps and status

---

## Troubleshooting

### "Could not find Client Folders directory"

**Solution:**
- Verify your OneDrive has a folder named exactly: **Client Folders** (case-sensitive)
- Check that your Microsoft account has access to this folder
- Make sure you're signed into Graph Explorer with the correct account

### No Slack notifications

**Solution:**
- Test the `/api/test-notification` endpoint
- Verify your webhook URL is correct (no extra spaces)
- Check that the Slack app has permission to post in your channel
- View Vercel logs for error messages

### "ONEDRIVE_ACCESS_TOKEN is not set"

**Solution:**
- Environment variables need to be set in Vercel
- If you just added them, redeploy: `vercel --prod`
- Verify they're set in Vercel Dashboard → Settings → Environment Variables

### Token expired error

**Solution:**
- Graph Explorer tokens expire after 1 hour
- Get a new token from Graph Explorer
- Update the environment variable in Vercel Dashboard
- For production, implement the OAuth refresh flow (see README.md)

### Cron job not running

**Solution:**
- Wait a few minutes - Vercel crons can take time to initialize
- Check Vercel Dashboard → Cron Jobs for status
- Manually trigger by visiting `/api/check-folders`
- Verify you're on a Vercel plan that supports cron jobs (free tier includes them)

---

## What Happens Next?

1. **Daily Checks**: Every day at 9 AM EST, the bot will:
   - Scan all your client folders in OneDrive
   - Look for files NOT in "Processed Wage Statements" folders
   - Send Slack notifications for any new files
   - Remember which files it notified you about

2. **Slack Notifications**: When files are found, you'll get a formatted message with:
   - Number of new files
   - Client name
   - File name (clickable link to OneDrive)
   - Last modified date

3. **No Duplicates**: The bot tracks which files it's already notified you about, so you won't get duplicate notifications.

---

## Important Notes

### Access Token Expiration

The Graph Explorer token expires after 1 hour. For continued operation:

**Short-term (daily/weekly token refresh):**
- Get a new token from Graph Explorer periodically
- Update in Vercel: Dashboard → Settings → Environment Variables → Edit `ONEDRIVE_ACCESS_TOKEN`

**Long-term (recommended):**
- Implement OAuth refresh token flow
- Or use Azure App Registration with client credentials
- See README.md for detailed instructions

### State Management

The bot currently tracks processed files in an environment variable (`STATE_DATA`). This works but has limitations:
- Environment variables don't auto-update
- You may get duplicate notifications after redeployment

**For production, upgrade to Vercel KV:**
```bash
npm install @vercel/kv
```
See ARCHITECTURE.md for implementation details.

### Changing the Schedule

Edit `vercel.json` and change the schedule:
```json
"schedule": "0 14 * * *"  // 9 AM EST
```

Common schedules:
- `0 14 * * *` - 9 AM EST daily
- `0 14 * * 1-5` - 9 AM EST weekdays only
- `0 9,14 * * *` - 9 AM EST twice daily

After changing, redeploy:
```bash
vercel --prod
```

---

## Success Checklist

- ✅ Bot deployed to Vercel
- ✅ Environment variables set
- ✅ Test notification sent to Slack successfully
- ✅ Manual folder check works
- ✅ Cron job shows as active in Vercel Dashboard
- ✅ Logs are visible in Vercel

**You're all set!** 🎉

The bot will now monitor your client folders automatically every day at 9 AM EST and alert you on Slack when new wage statements appear.

---

## Need Help?

- **Vercel Logs**: Dashboard → Your Project → Logs
- **Test Endpoints**: 
  - `/api/test-notification` - Test Slack
  - `/api/check-folders` - Test OneDrive scanning
- **Documentation**: Check README.md and ARCHITECTURE.md
- **Graph API Issues**: https://developer.microsoft.com/graph
- **Slack Issues**: https://api.slack.com/docs

