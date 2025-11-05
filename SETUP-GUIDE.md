# Vercel Deployment Error to GitHub PR Comments - Setup Guide

This integration automatically posts detailed error messages to GitHub pull requests when Vercel deployments fail.

## Architecture Overview

1. **Vercel Webhook** → Sends `deployment-error` event to your webhook endpoint
2. **Webhook Handler** → Fetches detailed logs from Vercel API
3. **GitHub API** → Posts formatted error comment to the PR

## Prerequisites

- A Vercel account with a project connected to GitHub
- A GitHub account with repository access
- Node.js environment to deploy the webhook handler

## Setup Instructions

### Step 1: Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name: "Vercel Error Comment Bot"
4. Select scopes:
   - `repo` (Full control of private repositories)
   - OR just `public_repo` if only using public repositories
5. Click "Generate token" and **save the token securely**

### Step 2: Get Vercel API Token

1. Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
2. Create a new token with a descriptive name: "Error Comment Integration"
3. **Save the token securely**

### Step 3: Deploy the Webhook Handler

Choose one of the following deployment options:

#### Option A: Deploy to Vercel (Recommended)

1. Create a new repository or use an existing one
2. Create `api/vercel-webhook.js` with the webhook handler code
3. Create `vercel.json`:

```json
{
  "version": 2,
  "env": {
    "VERCEL_CLIENT_SECRET": "@vercel-client-secret",
    "VERCEL_API_TOKEN": "@vercel-api-token",
    "GITHUB_TOKEN": "@github-token"
  }
}
```

4. Deploy to Vercel:
```bash
vercel --prod
```

5. Add environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add `VERCEL_CLIENT_SECRET`, `VERCEL_API_TOKEN`, `GITHUB_TOKEN`

#### Option B: Deploy to Express Server

```javascript
const express = require('express');
const handleWebhook = require('./vercel-error-webhook');

const app = express();

app.post('/webhook/vercel-error', express.text({ type: '*/*' }), async (req, res) => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: req.body,
    headers: req.headers
  });
  
  const response = await handleWebhook(request);
  const text = await response.text();
  
  res.status(response.status).send(text);
});

app.listen(3000, () => {
  console.log('Webhook handler running on port 3000');
});
```

#### Option C: Deploy to AWS Lambda

Create a Lambda function with the handler code and use API Gateway to expose it.

### Step 4: Configure Vercel Webhook

1. Go to your Vercel dashboard
2. Navigate to Settings → Webhooks
3. Click "Create Webhook"
4. Configure:
   - **URL**: Your webhook endpoint (e.g., `https://your-app.vercel.app/api/vercel-webhook`)
   - **Events**: Check "Deployment Error"
   - **Projects**: Select the projects you want to monitor (or "All Projects")
5. Click "Create"
6. **Save the client secret** that Vercel provides

### Step 5: Add Client Secret to Environment

Add the Vercel client secret (from the webhook configuration) to your environment variables:
- Variable name: `VERCEL_CLIENT_SECRET`
- Value: The secret from the webhook configuration

### Step 6: Test the Integration

1. Push a commit to a PR that will cause a build error (e.g., syntax error)
2. Wait for the deployment to fail
3. Check the PR for a comment with detailed error information

## Environment Variables Reference

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `VERCEL_CLIENT_SECRET` | Webhook signature verification | Vercel Webhook settings (after creating webhook) |
| `VERCEL_API_TOKEN` | Access Vercel API for logs | Vercel Account Settings → Tokens |
| `GITHUB_TOKEN` | Post comments to GitHub | GitHub Settings → Developer settings → Tokens |

## Comment Format

When a deployment fails, the integration posts a comment like this:

```markdown
## ❌ Vercel Deployment Failed

**Deployment URL:** https://vercel.com/your-team/project/deployment-id

### Error Details

```
Error: Command "npm run build" exited with 1
Module not found: Can't resolve './missing-file'
...
```

---
*Posted automatically by Vercel deployment error webhook*
```

## Troubleshooting

### Webhook Not Triggering

1. Check webhook logs in Vercel dashboard (Settings → Webhooks → View logs)
2. Verify the webhook endpoint is publicly accessible
3. Check that "Deployment Error" event is selected

### No Comments on PR

1. Verify `GITHUB_TOKEN` has correct permissions
2. Check that the deployment is associated with a PR
3. Look at webhook handler logs for errors
4. Verify the GitHub repo owner/name is correctly extracted

### Signature Verification Failed

1. Ensure `VERCEL_CLIENT_SECRET` matches the webhook configuration
2. Check that you're using the raw request body for verification

### Missing Error Logs

The integration fetches logs from the Vercel API. If logs are empty:
1. The deployment may have failed before producing logs
2. There might be a delay in log availability
3. Check Vercel dashboard manually to see if logs are available

## Advanced Configuration

### Custom Error Formatting

Modify the `postGitHubComment` function to customize the comment format:

```javascript
const commentBody = `## ❌ Build Failed - ${new Date().toLocaleString()}

**Project:** ${deployment.name}
**Branch:** ${deployment.gitSource?.ref || 'unknown'}

<details>
<summary>View Error Details</summary>

\`\`\`
${errorMessage}
\`\`\`

</details>`;
```

### Filter Specific Errors

Add filtering logic to only post comments for certain error types:

```javascript
// In handleWebhook function, after fetching logs
if (!errorLogs.includes('specific-error-keyword')) {
  return new Response('Error not critical', { status: 200 });
}
```

### Update Existing Comments

To update existing comments instead of creating new ones:

```javascript
// Fetch existing comments
const commentsResponse = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
  {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
    }
  }
);

const comments = await commentsResponse.json();

// Find existing bot comment
const botComment = comments.find(c => 
  c.body.includes('Posted automatically by Vercel deployment error webhook')
);

if (botComment) {
  // Update existing comment
  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/comments/${botComment.id}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: commentBody })
    }
  );
} else {
  // Create new comment
  // ... existing code
}
```

## Security Best Practices

1. **Never commit tokens** - Use environment variables only
2. **Verify webhook signatures** - Always validate requests are from Vercel
3. **Use minimal permissions** - Give tokens only the access they need
4. **Rotate tokens regularly** - Update tokens every 6-12 months
5. **Monitor webhook activity** - Check logs for unusual patterns

## Cost Considerations

- **Vercel**: Webhook handler as a serverless function (included in most plans)
- **GitHub API**: Free tier allows 5,000 requests/hour
- **Vercel API**: Included in all plans

This integration should stay well within free tier limits for most projects.

## Support

For issues or questions:
- Check the troubleshooting section above
- Review Vercel webhook logs
- Check webhook handler logs
- Verify all environment variables are set correctly

## License

MIT License - feel free to modify and use as needed.
