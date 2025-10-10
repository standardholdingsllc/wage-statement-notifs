import { IncomingWebhook } from '@slack/webhook';
import { FileItem } from './onedrive';

export class SlackNotifier {
  private webhook: IncomingWebhook;

  constructor(webhookUrl: string) {
    this.webhook = new IncomingWebhook(webhookUrl);
  }

  /**
   * Send notification about new files
   */
  async notifyNewFiles(files: FileItem[]): Promise<void> {
    if (files.length === 0) {
      return;
    }

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🔔 ${files.length} New Wage Statement${files.length > 1 ? 's' : ''} Detected`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Found ${files.length} new file${files.length > 1 ? 's' : ''} that need${files.length === 1 ? 's' : ''} processing:`,
        },
      },
      {
        type: 'divider',
      },
    ];

    // Add each file as a section
    for (const file of files) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Client:* ${file.clientName}\n*File:* <${file.webUrl}|${file.name}>\n*Modified:* ${new Date(file.modifiedDateTime).toLocaleString()}`,
        },
      } as any);
    }

    await this.webhook.send({
      blocks,
      text: `${files.length} new wage statement(s) detected`, // Fallback text
    });
  }

  /**
   * Send error notification
   */
  async notifyError(error: Error): Promise<void> {
    await this.webhook.send({
      text: `❌ Error monitoring wage statements: ${error.message}`,
    });
  }

  /**
   * Send test notification
   */
  async sendTestNotification(): Promise<void> {
    await this.webhook.send({
      text: '✅ OneDrive monitoring bot is set up and running!',
    });
  }
}

