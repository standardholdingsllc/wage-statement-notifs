# Architecture Documentation

## System Overview

The OneDrive Wage Statement Monitor is a serverless application that periodically scans OneDrive folders for new files and sends notifications via Slack.

```
┌─────────────────────────────────────────────────────────────┐
│                      Vercel Platform                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Cron Job (Daily at 9 AM UTC)               │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│                   ▼                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      API Route: /api/check-folders                   │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ 1. Load State (which files were notified)      │  │  │
│  │  │ 2. Query OneDrive via Microsoft Graph API      │  │  │
│  │  │ 3. Find all client folders                     │  │  │
│  │  │ 4. Check each folder for new files             │  │  │
│  │  │ 5. Filter out processed files                  │  │  │
│  │  │ 6. Send Slack notifications                    │  │  │
│  │  │ 7. Update state with new files                 │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌──────────────────┐
│  Microsoft      │          │  Slack Webhook   │
│  Graph API      │          │  API             │
│                 │          │                  │
│  OneDrive Data  │          │  Send Messages   │
└─────────────────┘          └──────────────────┘
```

## Components

### 1. API Routes (`/api`)

#### `/api/check-folders.ts`
- **Purpose**: Main cron job handler
- **Trigger**: Automated by Vercel cron scheduler
- **Security**: Optional Bearer token authentication
- **Process**:
  1. Initialize services (OneDrive, Slack, State)
  2. Load previous state from environment variable
  3. Scan all client folders in OneDrive
  4. Filter for new files (not in "Processed Wage Statements")
  5. Compare against previously notified files
  6. Send Slack notifications for new files
  7. Update state
  8. Return summary JSON

#### `/api/test-notification.ts`
- **Purpose**: Test Slack integration
- **Trigger**: Manual HTTP request
- **Security**: None (consider adding auth for production)
- **Process**: Send a test message to Slack channel

### 2. Library Modules (`/lib`)

#### `onedrive.ts` - OneDrive Integration
**Class: `OneDriveMonitor`**

Key Methods:
- `findClientFoldersRoot()`: Locates the "Client Folders" directory
- `getClientFolders()`: Retrieves all client subdirectories
- `checkClientFolder()`: Scans a folder for files (excluding processed folder)
- `monitorAllClients()`: Main orchestration method

**Data Flow:**
```
OneDrive Root
  → Find "Client Folders"
    → Get all subdirectories (clients)
      → For each client folder:
        → Get all items
        → Filter out "Processed Wage Statements" folder
        → Filter out subdirectories
        → Return file list
```

#### `slack.ts` - Slack Integration
**Class: `SlackNotifier`**

Key Methods:
- `notifyNewFiles()`: Send formatted notification with file details
- `notifyError()`: Send error alert
- `sendTestNotification()`: Send test message

**Message Format:**
- Header with file count
- Divider
- Section for each file with:
  - Client name
  - File name (as clickable link)
  - Modified timestamp

#### `state.ts` - State Management
**Class: `StateManager`**

Key Methods:
- `filterNewFiles()`: Compare files against known files
- `markAsProcessed()`: Add files to processed list
- `cleanup()`: Remove entries older than 30 days
- `load()`: Import state from JSON string
- `export()`: Export state as JSON string

**State Structure:**
```typescript
{
  lastCheck: "2024-10-10T09:00:00.000Z",
  processedFiles: {
    "file_id_123": {
      name: "wage_statement.pdf",
      clientName: "Christmas Tree Hill Nursery",
      notifiedAt: "2024-10-10T09:00:00.000Z"
    }
  }
}
```

### 3. Configuration Files

#### `vercel.json`
Defines cron job schedule:
- **Path**: `/api/check-folders`
- **Schedule**: `0 9 * * *` (9 AM UTC daily)
- **Format**: Standard cron expression

#### `package.json`
Dependencies:
- `@microsoft/microsoft-graph-client`: OneDrive API client
- `@slack/webhook`: Slack integration
- `isomorphic-fetch`: HTTP client for Node.js
- `@azure/msal-node`: Microsoft authentication

## Data Flow

### Complete Execution Flow

```
START
  ↓
[Vercel Cron Trigger]
  ↓
[Authenticate Request]
  ↓
[Initialize Services]
  - OneDriveMonitor (with access token)
  - SlackNotifier (with webhook URL)
  - StateManager
  ↓
[Load Previous State]
  - Parse STATE_DATA env var
  - Restore processedFiles map
  ↓
[Query OneDrive]
  - Microsoft Graph API: GET /me/drive/root/children
  - Find "Client Folders" directory ID
  ↓
[Get Client List]
  - Microsoft Graph API: GET /me/drive/items/{id}/children
  - Filter for folders only
  ↓
[For Each Client Folder]
  - Microsoft Graph API: GET /me/drive/items/{id}/children
  - Get all items in folder
  - Skip "Processed Wage Statements" folder
  - Skip subdirectories
  - Collect file metadata (id, name, modified date, URL)
  ↓
[Filter New Files]
  - Check each file.id against processedFiles map
  - Keep only files not in map
  ↓
[Send Notifications]
  IF new files exist:
    - Slack API: POST to webhook URL
    - Formatted message with file details
  ↓
[Update State]
  - Add new file IDs to processedFiles map
  - Set notifiedAt timestamp
  - Update lastCheck timestamp
  - Clean up old entries (>30 days)
  ↓
[Return Response]
  - JSON with summary
  - Include new state for storage
  ↓
END
```

## Security Model

### Authentication Flow

1. **Microsoft Graph API**:
   - Bearer token authentication
   - Token stored in `ONEDRIVE_ACCESS_TOKEN` env var
   - Requires `Files.Read` or `Files.Read.All` scope

2. **Slack Webhook**:
   - Webhook URL acts as authentication
   - No additional auth required
   - URL stored in `SLACK_WEBHOOK_URL` env var

3. **Cron Endpoint**:
   - Optional Bearer token: `CRON_SECRET`
   - Prevents unauthorized manual triggers

### Permission Requirements

**Microsoft Graph API:**
- Delegated: `Files.Read`, `User.Read`
- OR Application: `Files.Read.All` (for app-only access)

**Slack:**
- Incoming Webhooks capability
- Channel access permissions

## State Management

### Current Implementation
- **Storage**: Environment variable (`STATE_DATA`)
- **Format**: JSON string
- **Persistence**: Manual update required
- **Limitations**: 
  - Not automatically updated between runs
  - Limited by env var size constraints
  - Requires Vercel API or manual update

### Recommended Production Alternatives

#### Option 1: Vercel KV (Redis)
```typescript
import { kv } from '@vercel/kv';

// Load
const state = await kv.get('monitor-state');

// Save
await kv.set('monitor-state', stateData);
```

**Pros:**
- Fast (Redis-based)
- Serverless-friendly
- Auto-persistence
- No manual updates

#### Option 2: Vercel Postgres
```typescript
import { sql } from '@vercel/postgres';

// Create table
await sql`
  CREATE TABLE IF NOT EXISTS processed_files (
    file_id TEXT PRIMARY KEY,
    file_name TEXT,
    client_name TEXT,
    notified_at TIMESTAMP
  )
`;

// Query
const files = await sql`
  SELECT file_id FROM processed_files
`;
```

**Pros:**
- Relational data
- Powerful queries
- ACID compliance

#### Option 3: External Database
MongoDB, PostgreSQL, MySQL, etc.

**Pros:**
- Full control
- Advanced features
- Cross-platform

## Scalability Considerations

### Current Limitations
- **API Rate Limits**: Microsoft Graph API has rate limits
- **Execution Time**: Vercel functions have timeout limits (10s hobby, 60s pro)
- **Memory**: Limited by Vercel function memory

### Optimization Strategies

1. **Parallel Processing**:
   ```typescript
   const results = await Promise.all(
     clientFolders.map(folder => checkClientFolder(folder))
   );
   ```

2. **Batching**:
   - Process clients in batches if you have 100+
   - Split into multiple cron jobs if needed

3. **Caching**:
   - Cache folder IDs to reduce API calls
   - Cache client list between runs

4. **Incremental Scanning**:
   - Use OneDrive delta API for changes only
   - Only check folders modified since last run

## Error Handling

### Error Types

1. **Authentication Errors**:
   - Token expired
   - Invalid credentials
   - Insufficient permissions

2. **API Errors**:
   - Rate limiting
   - Network timeouts
   - Service unavailable

3. **Application Errors**:
   - Invalid folder structure
   - Missing environment variables
   - State corruption

### Error Recovery

```typescript
try {
  // Main execution
} catch (error) {
  // Log error
  console.error(error);
  
  // Notify via Slack
  await slack.notifyError(error);
  
  // Return error response
  return res.status(500).json({ error: error.message });
}
```

## Monitoring & Observability

### Available Logs

1. **Vercel Logs**:
   - Function execution logs
   - Error traces
   - Performance metrics

2. **Cron Job Logs**:
   - Execution history
   - Success/failure status
   - Duration

### Recommended Monitoring

1. **Slack Notifications**:
   - Error alerts (already implemented)
   - Daily summary (add this)
   - Health check messages

2. **External Monitoring**:
   - UptimeRobot: Monitor endpoint health
   - Sentry: Error tracking
   - DataDog/New Relic: Performance monitoring

## Future Enhancements

### Phase 1: Reliability
- [ ] Implement automatic token refresh
- [ ] Add retry logic for API failures
- [ ] Migrate to Vercel KV for state storage

### Phase 2: Features
- [ ] Support multiple notification channels
- [ ] Add file type filtering
- [ ] Support custom folder patterns per client
- [ ] Add manual trigger API with authentication

### Phase 3: Observability
- [ ] Add web dashboard for history
- [ ] Implement detailed logging
- [ ] Add health check endpoint
- [ ] Create admin API for state management

### Phase 4: Scale
- [ ] Implement delta queries for large datasets
- [ ] Add parallel processing with rate limiting
- [ ] Support multiple OneDrive accounts
- [ ] Add webhook support for real-time notifications

