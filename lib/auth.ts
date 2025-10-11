import { ConfidentialClientApplication } from '@azure/msal-node';

export class AzureAuth {
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(clientId: string, clientSecret: string, tenantId: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tenantId = tenantId;
  }

  /**
   * Get a valid access token (uses cache if still valid)
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.cachedToken && Date.now() < this.tokenExpiry - 300000) {
      return this.cachedToken;
    }

    // Get new token
    const config = {
      auth: {
        clientId: this.clientId,
        authority: `https://login.microsoftonline.com/${this.tenantId}`,
        clientSecret: this.clientSecret,
      },
    };

    const cca = new ConfidentialClientApplication(config);

    const tokenRequest = {
      scopes: ['https://graph.microsoft.com/.default'],
    };

    try {
      const response = await cca.acquireTokenByClientCredential(tokenRequest);
      
      if (!response || !response.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      // Cache the token
      this.cachedToken = response.accessToken;
      this.tokenExpiry = response.expiresOn?.getTime() || Date.now() + 3600000;

      return response.accessToken;
    } catch (error: any) {
      console.error('Error acquiring token:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
}

