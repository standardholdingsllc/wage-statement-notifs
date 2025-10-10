/**
 * Helper script to get Microsoft Graph API access token
 * 
 * This is a simplified version. For production, you should implement
 * proper OAuth flow with refresh tokens.
 * 
 * Install dependencies first:
 * npm install @azure/msal-node
 * 
 * Then run:
 * node scripts/setup-auth.js
 */

const msal = require('@azure/msal-node');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('\n=== Microsoft Graph API Token Setup ===\n');
  
  const clientId = await prompt('Enter your Azure App Client ID: ');
  const tenantId = await prompt('Enter your Azure Tenant ID (or "common"): ');
  const clientSecret = await prompt('Enter your Azure App Client Secret: ');
  
  console.log('\nSelect authentication method:');
  console.log('1. Client Credentials (App-only, recommended for automation)');
  console.log('2. Device Code (User-delegated, interactive)\n');
  
  const method = await prompt('Enter choice (1 or 2): ');
  
  if (method === '1') {
    await getClientCredentialsToken(clientId, tenantId, clientSecret);
  } else if (method === '2') {
    await getDeviceCodeToken(clientId, tenantId);
  } else {
    console.log('Invalid choice');
  }
  
  rl.close();
}

async function getClientCredentialsToken(clientId, tenantId, clientSecret) {
  const config = {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
  };

  const pca = new msal.ConfidentialClientApplication(config);

  const tokenRequest = {
    scopes: ['https://graph.microsoft.com/.default'],
  };

  try {
    const response = await pca.acquireTokenByClientCredential(tokenRequest);
    console.log('\n✅ Success! Your access token:\n');
    console.log(response.accessToken);
    console.log('\n⚠️  This token expires at:', new Date(response.expiresOn));
    console.log('\nAdd this to your Vercel environment variables as ONEDRIVE_ACCESS_TOKEN');
    console.log('\nNote: For production, implement token refresh logic.');
  } catch (error) {
    console.error('\n❌ Error getting token:', error.message);
    console.log('\nMake sure your Azure app has these permissions:');
    console.log('- Files.Read.All (Application permission)');
    console.log('- Sites.Read.All (Application permission)');
    console.log('\nAnd that admin consent has been granted.');
  }
}

async function getDeviceCodeToken(clientId, tenantId) {
  const config = {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  };

  const pca = new msal.PublicClientApplication(config);

  const tokenRequest = {
    scopes: ['Files.Read', 'Files.Read.All', 'User.Read'],
    deviceCodeCallback: (response) => {
      console.log('\n📱 Device Code Authentication:\n');
      console.log(response.message);
    },
  };

  try {
    const response = await pca.acquireTokenByDeviceCode(tokenRequest);
    console.log('\n✅ Success! Your access token:\n');
    console.log(response.accessToken);
    console.log('\n⚠️  This token expires at:', new Date(response.expiresOn * 1000));
    
    if (response.refreshToken) {
      console.log('\n🔄 Your refresh token (save this securely):\n');
      console.log(response.refreshToken);
    }
    
    console.log('\nAdd the access token to your Vercel environment variables as ONEDRIVE_ACCESS_TOKEN');
  } catch (error) {
    console.error('\n❌ Error getting token:', error.message);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { getClientCredentialsToken, getDeviceCodeToken };

