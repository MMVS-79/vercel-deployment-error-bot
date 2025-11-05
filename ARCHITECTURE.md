# Architecture & Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                        │
│  ┌────────────┐                                                  │
│  │ Pull       │  Developer pushes code with error                │
│  │ Request #42│                                                  │
│  └────────────┘                                                  │
└────────────┬────────────────────────────────────────────────────┘
             │ Triggers
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Vercel Build System                         │
│                                                                   │
│  1. Detects commit on PR                                         │
│  2. Starts build process                                         │
│  3. Build fails ❌                                               │
│  4. Generates error logs                                         │
└────────────┬────────────────────────────────────────────────────┘
             │ Webhook Event
             │ (deployment-error)
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Your Webhook Handler (Vercel Function)              │
│                  https://your-app.vercel.app/webhook             │
│                                                                   │
│  Step 1: Verify webhook signature                                │
│  Step 2: Extract deployment ID & team ID                         │
│  Step 3: Call Vercel API to fetch logs                          │
│  Step 4: Extract GitHub repo info from metadata                 │
│  Step 5: Format error message                                    │
│  Step 6: Post comment to GitHub PR                              │
└────────────┬────────────────────────────────────────────────────┘
             │ API Calls
             │
             ├──────────────┐
             │              │
             ▼              ▼
┌─────────────────┐   ┌──────────────────┐
│   Vercel API    │   │   GitHub API     │
│                 │   │                  │
│ GET /deployment │   │ POST /repos/     │
│     /events     │   │  {owner}/{repo}  │
│                 │   │  /issues/{pr}    │
│ Returns:        │   │  /comments       │
│ - Error logs    │   │                  │
│ - Build details │   │ Posts formatted  │
└─────────────────┘   │ error comment    │
                      └──────────────────┘
                              │
                              ▼
                      ┌──────────────────┐
                      │  GitHub PR       │
                      │                  │
                      │  💬 New Comment: │
                      │  "Deployment     │
                      │   Failed with    │
                      │   error: ..."    │
                      └──────────────────┘
```

## Data Flow Sequence

```
1. Developer pushes code
   ↓
2. Vercel starts deployment
   ↓
3. Build fails with error
   ↓
4. Vercel sends webhook:
   {
     type: "deployment-error",
     payload: {
       deployment: { id: "dpl_xxx" },
       team: { id: "team_xxx" },
       links: { deployment: "https://..." }
     }
   }
   ↓
5. Webhook handler receives event
   ↓
6. Handler fetches deployment details:
   GET https://api.vercel.com/v13/deployments/dpl_xxx
   Response: {
     meta: {
       githubOrg: "acme-corp",
       githubRepo: "my-app",
       githubPrId: "42"
     }
   }
   ↓
7. Handler fetches deployment logs:
   GET https://api.vercel.com/v3/deployments/dpl_xxx/events
   Response: [
     { type: "stderr", payload: { text: "Error: ..." } },
     { type: "stderr", payload: { text: "Build failed" } }
   ]
   ↓
8. Handler posts to GitHub:
   POST https://api.github.com/repos/acme-corp/my-app/issues/42/comments
   Body: {
     body: "## 🚨 Vercel Deployment Failed\n\n```\nError: ...\n```"
   }
   ↓
9. Comment appears on PR ✅
```

## Component Responsibilities

### Vercel Webhook System
- Monitors all deployments
- Detects failures
- Sends webhook with deployment metadata
- Provides signature for verification

### Your Webhook Handler
- **Security:** Verifies webhook signature
- **Data Fetching:** Retrieves logs and deployment details via Vercel API
- **Data Extraction:** Parses GitHub metadata from deployment
- **Formatting:** Creates readable error message
- **Integration:** Posts comment to GitHub PR

### Vercel API
- **Endpoints Used:**
  - `GET /v13/deployments/{id}` - Get deployment details
  - `GET /v3/deployments/{id}/events` - Get build logs
- **Authentication:** Bearer token (your VERCEL_API_TOKEN)

### GitHub API
- **Endpoints Used:**
  - `POST /repos/{owner}/{repo}/issues/{pr}/comments` - Create comment
- **Authentication:** Bearer token (your GITHUB_TOKEN)
- **Note:** Pull requests are treated as issues in GitHub API

## Security Flow

```
Vercel → Webhook Handler
   │
   ├─ Vercel signs payload with HMAC-SHA1
   │  using VERCEL_CLIENT_SECRET
   │
   └─ Handler verifies signature before processing
      (prevents unauthorized webhook calls)

Webhook Handler → Vercel API
   │
   └─ Uses VERCEL_API_TOKEN in Authorization header
      (read-only access to deployment data)

Webhook Handler → GitHub API
   │
   └─ Uses GITHUB_TOKEN in Authorization header
      (write access to create PR comments)
```

## Error Handling

```
Input Validation
   ├─ Missing signature? → 401 Unauthorized
   ├─ Invalid signature? → 401 Unauthorized
   └─ Wrong event type? → 200 OK (ignored)

API Call Failures
   ├─ Vercel API error? → Log error, return 500
   ├─ GitHub API error? → Log error, return 500
   └─ Network timeout? → Log error, return 500

Missing Data
   ├─ No PR associated? → 200 OK (skip, log info)
   ├─ Can't find repo? → 200 OK (skip, log info)
   └─ No error logs? → Post generic message

All errors are logged for debugging
```

## Environment-Specific Behavior

### Development (Local)
- Uses .env file for configuration
- Can test with test-webhook.js script
- Points to localhost webhook endpoint

### Production (Vercel)
- Uses environment variables from Vercel dashboard
- Automatic HTTPS
- Serverless function auto-scales
- Low latency (deployed globally)

## Webhook Payload Example

```json
{
  "id": "evt_123abc",
  "type": "deployment-error",
  "createdAt": 1699123456789,
  "payload": {
    "team": {
      "id": "team_abc123"
    },
    "user": {
      "id": "user_xyz789"
    },
    "deployment": {
      "id": "dpl_FooBar123",
      "meta": {
        "githubOrg": "my-company",
        "githubRepo": "my-project",
        "githubPrId": "42",
        "githubCommitRef": "refs/pull/42/merge"
      },
      "url": "my-project-git-feature-abc123.vercel.app",
      "name": "my-project"
    },
    "links": {
      "deployment": "https://vercel.com/my-company/my-project/dpl_FooBar123",
      "project": "https://vercel.com/my-company/my-project"
    },
    "project": {
      "id": "prj_abc123xyz"
    }
  }
}
```

## Performance Characteristics

- **Webhook Response Time:** < 100ms (just verification)
- **Total Processing Time:** 2-5 seconds
  - Vercel API calls: ~500ms each
  - GitHub API call: ~300ms
  - Processing: ~100ms
- **Serverless:** Scales automatically with traffic
- **Cost:** Free tier sufficient for most projects

## Limitations & Considerations

1. **Rate Limits:**
   - GitHub API: 5,000 requests/hour (per token)
   - Vercel API: Generous limits, rarely hit
   - Webhook: 30-second timeout

2. **Comment Size:**
   - GitHub limit: ~65,536 characters
   - Handler truncates at 4,000 characters to be safe

3. **Log Availability:**
   - Logs may not be immediately available
   - Some failures occur before logs are generated

4. **PR Association:**
   - Only works for deployments triggered by PRs
   - Direct branch deployments won't generate comments
