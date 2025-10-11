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

    // Group files by client and get folder URLs
    const clientFolders = new Map<string, string>();
    
    for (const file of files) {
      const folderName = `${file.clientName} Wage Statements`;
      if (!clientFolders.has(file.clientName)) {
        // Extract the parent folder URL from the file's webUrl
        // The file webUrl looks like: https://domain.sharepoint.com/.../Folder/file.pdf
        // We want just the folder URL
        const folderUrl = file.webUrl.substring(0, file.webUrl.lastIndexOf('/'));
        clientFolders.set(file.clientName, folderUrl);
      }
    }

    // Build the message - one line per folder
    let messageLines: string[] = [];
    
    for (const [clientName, folderUrl] of clientFolders) {
      const folderName = `${clientName} Wage Statements`;
      messageLines.push(`File Uploaded to <${folderUrl}|${folderName}>`);
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

