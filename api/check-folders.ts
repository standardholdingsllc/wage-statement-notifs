import { VercelRequest, VercelResponse } from '@vercel/node';
import { OneDriveMonitor } from '../lib/onedrive';
import { SlackNotifier } from '../lib/slack';
import { StateManager } from '../lib/state';
import { AzureAuth } from '../lib/auth';

// In a real production environment, you'd want to use Vercel KV or a database
// For this example, we'll use Vercel's built-in storage or environment variables
// You could also integrate with Vercel KV, PostgreSQL, or Redis

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify this is a cron request (optional security measure)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get required environment variables
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const tenantId = process.env.AZURE_TENANT_ID;

    // Validate environment variables
    if (!slackWebhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL is not set');
    }

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error('Azure credentials not set. Need AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID');
    }

    // Get access token from Azure
    const auth = new AzureAuth(clientId, clientSecret, tenantId);
    const accessToken = await auth.getAccessToken();

    // Initialize services
    const onedrive = new OneDriveMonitor(accessToken);
    const slack = new SlackNotifier(slackWebhookUrl);
    const stateManager = new StateManager();

    // Load previous state if available
    const storedState = process.env.STATE_DATA;
    await stateManager.load(storedState);

    console.log('Starting folder check...');

    // Monitor all client folders
    const allFiles = await onedrive.monitorAllClients();
    console.log(`Found ${allFiles.length} total files in client folders`);

    // Filter out files we've already notified about
    const newFiles = stateManager.filterNewFiles(allFiles);
    console.log(`${newFiles.length} new files to notify about`);

    // Send Slack notification if there are new files
    if (newFiles.length > 0) {
      await slack.notifyNewFiles(newFiles);
      stateManager.markAsProcessed(newFiles);
      console.log(`Sent notification for ${newFiles.length} file(s)`);
    }

    // Cleanup old entries
    stateManager.cleanup();

    // Export state for next run
    const newState = stateManager.export();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      filesChecked: allFiles.length,
      newFilesFound: newFiles.length,
      newFiles: newFiles.map(f => ({
        clientName: f.clientName,
        name: f.name,
        modifiedDateTime: f.modifiedDateTime,
        webUrl: f.webUrl
      })),
      message: newFiles.length > 0 
        ? `Notified about ${newFiles.length} new file(s)` 
        : 'No new files found',
      // Note: In production, save this state to a database or Vercel KV
      // For now, you'll need to manually update the STATE_DATA env var or use external storage
      stateForStorage: newState,
    });

  } catch (error: any) {
    console.error('Error in check-folders:', error);

    // Try to send error notification to Slack
    try {
      const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (slackWebhookUrl) {
        const slack = new SlackNotifier(slackWebhookUrl);
        await slack.notifyError(error);
      }
    } catch (notifyError) {
      console.error('Failed to send error notification:', notifyError);
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}


