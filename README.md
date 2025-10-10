# OneDrive Wage Statement Monitor

Automated monitoring bot that checks OneDrive client folders daily for new wage statements and sends Slack notifications when files are detected.

## Features

- 🔍 Monitors 80+ client folders in OneDrive automatically
- ⏰ Runs daily via Vercel Cron Jobs
- 💬 Sends formatted Slack notifications with file links
- 📊 Tracks processed files to avoid duplicate notifications
- 🚀 Serverless deployment on Vercel

## Architecture

- **OneDrive Integration**: Uses Microsoft Graph API to access OneDrive folders
- **Slack Integration**: Sends notifications via Slack Incoming Webhooks
- **State Management**: Tracks which files have been notified to prevent duplicates
- **Serverless**: Runs as Vercel Cron Job (no server maintenance required)

## Prerequisites

1. **Microsoft Azure App Registration** (for OneDrive access)
2. **Slack Workspace** with admin access
3. **Vercel Account** (free tier works)

## Setup Instructions

### 1. Set Up Microsoft Azure App

To access OneDrive via the Graph API, you need to register an app in Azure:

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations** > **New registration**
3. Name it "OneDrive Wage Statement Monitor"
4. Set redirect URI to `https://login.microsoftonline.com/common/oauth2/nativeclient`
5. Click **Register**

**Configure API Permissions:**
1. Go to **API permissions** > **Add a permission**
2. Select **Microsoft Graph** > **Delegated permissions**
3. Add these permissions:
   - `Files.Read` (or `Files.Read.All`)
   - `User.Read`
4. Click **Grant admin consent**

**Get Your Credentials:**
1. Go to **Certificates & secrets** > **New client secret**
2. Save the secret value (you'll need this)
3. Go to **Overview** and copy the **Application (client) ID** and **Directory (tenant) ID**

**Get Access Token:**

You have two options:

**Option A: Use Microsoft Graph Explorer (Quick)**
1. Go to [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Sign in with your Microsoft account
3. Run any query (e.g., `/me/drive/root`)
4. Click on the **Access Token** tab to copy your token
5. Note: This token expires after 1 hour, so you'll need to refresh it

**Option B: Use OAuth Flow (Recommended for Production)**

Create a script to get a refresh token that doesn't expire:

```javascript
// auth-setup.js - Run this locally to get your tokens
const msal = require('@azure/msal-node');

const config = {
  auth: {
    clientId: 'YOUR_CLIENT_ID',
    authority: 'https://login.microsoftonline.com/common',
    clientSecret: 'YOUR_CLIENT_SECRET',
  },
};

const pca = new msal.ConfidentialClientApplication(config);

const tokenRequest = {
  scopes: ['https://graph.microsoft.com/.default'],
};

pca.acquireTokenByClientCredential(tokenRequest).then((response) => {
  console.log('Access Token:', response.accessToken);
}).catch((error) => {
  console.error(error);
});
```

For delegated permissions, you may need to use device code flow or authorization code flow.

### 2. Set Up Slack Webhook

1. Go to your [Slack API dashboard](https://api.slack.com/apps)
2. Click **Create New App** > **From scratch**
3. Name it "Wage Statement Monitor" and select your workspace
4. Go to **Incoming Webhooks** and activate it
5. Click **Add New Webhook to Workspace**
6. Select the channel where you want notifications (your private channel)
7. Copy the webhook URL (looks like `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX`)

### 3. Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Clone/Download this repository:**
   ```bash
   cd "Wage Statement Notifs"
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Deploy to Vercel:**
   ```bash
   vercel
   ```

5. **Set environment variables in Vercel:**
   ```bash
   vercel env add ONEDRIVE_ACCESS_TOKEN
   vercel env add SLACK_WEBHOOK_URL
   vercel env add CRON_SECRET
   vercel env add STATE_DATA
   ```

   Or set them in the [Vercel Dashboard](https://vercel.com/dashboard) under your project settings.

   **Environment Variables:**
   - `ONEDRIVE_ACCESS_TOKEN`: Your Microsoft Graph API access token
   - `SLACK_WEBHOOK_URL`: Your Slack webhook URL
   - `CRON_SECRET`: (Optional) A random string to secure your cron endpoint
   - `STATE_DATA`: Start with `{}` - this will track processed files

6. **Deploy to production:**
   ```bash
   vercel --prod
   ```

### 4. Configure Cron Schedule

The cron job is configured in `vercel.json` to run daily at 9 AM UTC:

```json
{
  "crons": [
    {
      "path": "/api/check-folders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

To change the schedule, modify the `schedule` field using [cron syntax](https://crontab.guru/):
- `0 9 * * *` - 9 AM UTC daily
- `0 */6 * * *` - Every 6 hours
- `0 8 * * 1-5` - 8 AM UTC weekdays only

## Testing

### Test Slack Integration

Visit your deployed endpoint:
```
https://your-project.vercel.app/api/test-notification
```

This will send a test message to your Slack channel.

### Test Folder Check

Manually trigger the folder check:
```
https://your-project.vercel.app/api/check-folders
```

Or use curl with the cron secret:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-project.vercel.app/api/check-folders
```

## How It Works

1. **Daily Cron Job**: Vercel automatically calls `/api/check-folders` based on the schedule
2. **Scan Folders**: The bot finds your "Client Folders" directory and scans all subdirectories
3. **Detect New Files**: It looks for files that are NOT in the "Processed Wage Statements" folder
4. **Check State**: Compares found files against previously notified files
5. **Send Notifications**: Sends a formatted Slack message with links to new files
6. **Update State**: Marks files as notified to prevent duplicates

## File Structure

```
├── api/
│   ├── check-folders.ts      # Main cron job handler
│   └── test-notification.ts  # Test endpoint for Slack
├── lib/
│   ├── onedrive.ts           # OneDrive/Graph API integration
│   ├── slack.ts              # Slack notification service
│   └── state.ts              # State management for tracking files
├── vercel.json               # Vercel configuration with cron job
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Limitations & Considerations

### Access Token Expiration

The Microsoft Graph access token expires after 1 hour (or as configured). For production use, you should:

**Option 1: Use Refresh Tokens**
Implement OAuth flow to get a refresh token that can be used to obtain new access tokens automatically.

**Option 2: Use App-Only Authentication**
Use client credentials flow for app-only access (recommended for automated services).

**Option 3: Use Managed Identity (Azure)**
If you move to Azure Functions instead of Vercel, you can use Managed Identity.

### State Management

The current implementation uses environment variables for state storage, which has limitations:
- Environment variables are immutable in Vercel
- You'd need to update them manually or programmatically via Vercel API

**Recommended Production Solutions:**
1. **Vercel KV** (Redis-based): Fast, serverless-friendly
2. **Vercel Postgres**: For relational data
3. **External Database**: MongoDB, PostgreSQL, etc.

To upgrade to Vercel KV:

```bash
npm install @vercel/kv
```

Update `lib/state.ts`:
```typescript
import { kv } from '@vercel/kv';

async load() {
  const state = await kv.get('state');
  if (state) this.state = state;
}

async save() {
  await kv.set('state', this.state);
}
```

## Troubleshooting

### "Could not find Client Folders directory"
- Verify the folder exists in your OneDrive
- Check that your access token has proper permissions
- The folder name must match exactly: "Client Folders"

### No Slack notifications received
- Test with `/api/test-notification` endpoint
- Verify webhook URL is correct
- Check Vercel logs for errors

### Cron job not running
- Verify you're on a Vercel plan that supports cron jobs
- Check Vercel dashboard > Project > Cron Jobs tab for execution logs
- Cron jobs may take a few minutes to start after deployment

## Monitoring

Check your deployment logs in Vercel:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Logs** or **Cron Jobs** tab
4. View execution history and any errors

## Security Notes

- Never commit `.env` file with real credentials
- Use Vercel's environment variables for secrets
- Consider adding `CRON_SECRET` to prevent unauthorized access
- Rotate access tokens regularly
- Use minimum required API permissions

## Future Enhancements

- [ ] Add email notifications as backup
- [ ] Support multiple notification channels
- [ ] Add web dashboard to view history
- [ ] Implement automatic token refresh
- [ ] Add file type filtering
- [ ] Support custom folder structures per client

## Support

For issues or questions:
1. Check Vercel logs for errors
2. Verify all environment variables are set
3. Test each component independently (Slack, OneDrive)
4. Review Microsoft Graph API documentation

## License

MIT License - feel free to modify and use for your needs.

