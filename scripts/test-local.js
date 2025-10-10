/**
 * Local testing script to verify your setup works before deploying
 * 
 * Setup:
 * 1. Create a .env file with your credentials (see env.example.txt)
 * 2. Run: npm install dotenv
 * 3. Run: node scripts/test-local.js
 */

require('dotenv').config();

const { OneDriveMonitor } = require('../lib/onedrive');
const { SlackNotifier } = require('../lib/slack');
const { StateManager } = require('../lib/state');

async function testOneDrive() {
  console.log('\n🔍 Testing OneDrive connection...\n');
  
  const accessToken = process.env.ONEDRIVE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('❌ ONEDRIVE_ACCESS_TOKEN not found in .env');
    return false;
  }

  try {
    const monitor = new OneDriveMonitor(accessToken);
    
    console.log('Looking for "Client Folders" directory...');
    const clientFoldersId = await monitor.findClientFoldersRoot();
    
    if (!clientFoldersId) {
      console.error('❌ Could not find "Client Folders" directory');
      return false;
    }
    
    console.log('✅ Found Client Folders (ID:', clientFoldersId + ')');
    
    console.log('\nFetching client folders...');
    const clientFolders = await monitor.getClientFolders(clientFoldersId);
    console.log(`✅ Found ${clientFolders.length} client folders`);
    
    if (clientFolders.length > 0) {
      console.log('\nFirst 5 clients:');
      clientFolders.slice(0, 5).forEach((folder, i) => {
        console.log(`  ${i + 1}. ${folder.name}`);
      });
    }
    
    console.log('\nScanning for files...');
    const allFiles = await monitor.monitorAllClients();
    console.log(`✅ Found ${allFiles.length} total files across all clients`);
    
    if (allFiles.length > 0) {
      console.log('\nSample files found:');
      allFiles.slice(0, 3).forEach((file, i) => {
        console.log(`  ${i + 1}. [${file.clientName}] ${file.name}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ OneDrive test failed:', error.message);
    return false;
  }
}

async function testSlack() {
  console.log('\n💬 Testing Slack connection...\n');
  
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('❌ SLACK_WEBHOOK_URL not found in .env');
    return false;
  }

  try {
    const slack = new SlackNotifier(webhookUrl);
    await slack.sendTestNotification();
    console.log('✅ Test notification sent to Slack!');
    console.log('   Check your channel for the message.');
    return true;
  } catch (error) {
    console.error('❌ Slack test failed:', error.message);
    return false;
  }
}

async function testStateManager() {
  console.log('\n📊 Testing State Manager...\n');
  
  try {
    const stateManager = new StateManager();
    
    // Test with sample data
    const sampleFiles = [
      {
        id: 'file1',
        name: 'test.pdf',
        clientName: 'Test Client',
        path: '/test',
        modifiedDateTime: new Date().toISOString(),
        webUrl: 'https://example.com/file1'
      },
      {
        id: 'file2',
        name: 'test2.pdf',
        clientName: 'Test Client 2',
        path: '/test',
        modifiedDateTime: new Date().toISOString(),
        webUrl: 'https://example.com/file2'
      }
    ];
    
    console.log('Filtering new files (all should be new)...');
    const newFiles = stateManager.filterNewFiles(sampleFiles);
    console.log(`✅ Found ${newFiles.length} new files`);
    
    console.log('\nMarking files as processed...');
    stateManager.markAsProcessed(newFiles);
    console.log('✅ Files marked as processed');
    
    console.log('\nFiltering again (should find 0 new files)...');
    const newFiles2 = stateManager.filterNewFiles(sampleFiles);
    console.log(`✅ Found ${newFiles2.length} new files (expected 0)`);
    
    console.log('\nExporting state...');
    const exported = stateManager.export();
    console.log('✅ State exported successfully');
    console.log('State size:', exported.length, 'bytes');
    
    return true;
  } catch (error) {
    console.error('❌ State manager test failed:', error.message);
    return false;
  }
}

async function testFullWorkflow() {
  console.log('\n🚀 Testing full workflow...\n');
  
  try {
    const accessToken = process.env.ONEDRIVE_ACCESS_TOKEN;
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!accessToken || !webhookUrl) {
      console.error('❌ Missing required environment variables');
      return false;
    }
    
    const monitor = new OneDriveMonitor(accessToken);
    const slack = new SlackNotifier(webhookUrl);
    const stateManager = new StateManager();
    
    console.log('1. Scanning OneDrive...');
    const allFiles = await monitor.monitorAllClients();
    console.log(`   Found ${allFiles.length} files`);
    
    console.log('\n2. Filtering new files...');
    const newFiles = stateManager.filterNewFiles(allFiles);
    console.log(`   ${newFiles.length} new files detected`);
    
    if (newFiles.length > 0) {
      console.log('\n3. Sending Slack notification...');
      await slack.notifyNewFiles(newFiles);
      console.log('   ✅ Notification sent!');
      
      console.log('\n4. Updating state...');
      stateManager.markAsProcessed(newFiles);
      console.log('   ✅ State updated');
    } else {
      console.log('\n   No new files to notify about');
    }
    
    console.log('\n✅ Full workflow completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Full workflow test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  OneDrive Wage Statement Monitor - Local Test ║');
  console.log('╚════════════════════════════════════════════════╝');
  
  const results = {
    onedrive: false,
    slack: false,
    state: false,
    workflow: false
  };
  
  // Run tests
  results.onedrive = await testOneDrive();
  results.slack = await testSlack();
  results.state = await testStateManager();
  
  if (results.onedrive && results.slack && results.state) {
    results.workflow = await testFullWorkflow();
  } else {
    console.log('\n⚠️  Skipping full workflow test due to previous failures');
  }
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║                  TEST SUMMARY                  ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log();
  console.log('OneDrive Connection:', results.onedrive ? '✅ PASS' : '❌ FAIL');
  console.log('Slack Integration:  ', results.slack ? '✅ PASS' : '❌ FAIL');
  console.log('State Manager:      ', results.state ? '✅ PASS' : '❌ FAIL');
  console.log('Full Workflow:      ', results.workflow ? '✅ PASS' : '❌ FAIL');
  console.log();
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('🎉 All tests passed! You\'re ready to deploy to Vercel.');
    console.log('\nNext steps:');
    console.log('1. Run: vercel');
    console.log('2. Set environment variables in Vercel');
    console.log('3. Run: vercel --prod');
  } else {
    console.log('⚠️  Some tests failed. Please fix the issues before deploying.');
    console.log('\nTroubleshooting:');
    console.log('- Verify your .env file has correct credentials');
    console.log('- Check that "Client Folders" exists in your OneDrive');
    console.log('- Ensure Slack webhook URL is valid');
  }
  
  console.log();
}

// Run tests
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
}

