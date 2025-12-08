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

    // Group files by client + folder and get folder URLs
    const clientFolders = new Map<string, { folderUrl: string; displayName: string }>();
    
    for (const file of files) {
      const folderName = file.sourceFolderName || `${file.clientName} Wage Statements`;
      const folderUrl = file.webUrl.substring(0, file.webUrl.lastIndexOf('/'));
      const key = `${file.clientName}:${folderName}:${folderUrl}`;

      if (!clientFolders.has(key)) {
        clientFolders.set(key, { folderUrl, displayName: folderName });
      }
    }

    // Build the message - one line per folder
    let messageLines: string[] = [];
    
    for (const { folderUrl, displayName } of clientFolders.values()) {
      messageLines.push(`File Uploaded to <${folderUrl}|${displayName}>`);
    }

    await this.webhook.send({
      text: messageLines.join('\n'),
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

