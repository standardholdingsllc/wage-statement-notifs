import { VercelRequest, VercelResponse } from '@vercel/node';
import { SlackNotifier } from '../lib/slack';

/**
 * Test endpoint to verify Slack integration
 * Call this endpoint to test your Slack webhook
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!slackWebhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL is not set');
    }

    const slack = new SlackNotifier(slackWebhookUrl);
    await slack.sendTestNotification();

    return res.status(200).json({
      success: true,
      message: 'Test notification sent to Slack',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

