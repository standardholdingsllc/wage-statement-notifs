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
      console.log('Using cached access token');
      return this.cachedToken;
    }

    // Get new token
    console.log('Acquiring new access token from Azure...');
    console.log('Tenant ID:', this.tenantId);
    console.log('Client ID:', this.clientId);
    console.log('Authority:', `https://login.microsoftonline.com/${this.tenantId}`);
    
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
      console.log('Requesting token with client credentials...');
      const response = await cca.acquireTokenByClientCredential(tokenRequest);
      
      if (!response || !response.accessToken) {
        console.error('Token response was empty or missing accessToken');
        throw new Error('Failed to acquire access token - empty response');
      }

      console.log('✓ Token acquired successfully');
      console.log('Token expires at:', response.expiresOn);

      // Cache the token
      this.cachedToken = response.accessToken;
      this.tokenExpiry = response.expiresOn?.getTime() || Date.now() + 3600000;

      return response.accessToken;
    } catch (error: any) {
      console.error('=== Azure Authentication Error ===');
      console.error('Error code:', error.errorCode);
      console.error('Error message:', error.errorMessage || error.message);
      console.error('Error details:', error);
      throw new Error(`Authentication failed: ${error.errorMessage || error.message}`);
    }
  }
}

