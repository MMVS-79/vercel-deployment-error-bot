/**
 * Vercel API Route: /api/vercel-webhook.js
 * 
 * Deploy this file to Vercel to handle deployment error webhooks
 */

const crypto = require('crypto');

const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET;
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

function verifyWebhookSignature(body, signature) {
  if (!VERCEL_CLIENT_SECRET) {
    throw new Error('VERCEL_CLIENT_SECRET not configured');
  }
  
  const bodyBuffer = Buffer.from(body, 'utf-8');
  const computedSignature = crypto
    .createHmac('sha1', VERCEL_CLIENT_SECRET)
    .update(bodyBuffer)
    .digest('hex');
  
  return computedSignature === signature;
}

async function getDeploymentLogs(deploymentId, teamId) {
  const url = `https://api.vercel.com/v3/deployments/${deploymentId}/events`;
  
  const headers = {
    'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
  };
  
  if (teamId) {
    headers['x-vercel-team-id'] = teamId;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.error(`Failed to fetch logs: ${response.status}`);
      return 'Error logs could not be retrieved. Please check the Vercel dashboard.';
    }
    
    const events = await response.json();
    
    // Filter and collect error-related logs
    const errorLogs = [];
    
    for (const event of events) {
      const text = event.payload?.text || '';
      
      // Collect stderr and error messages
      if (event.type === 'stderr' || 
          text.toLowerCase().includes('error') ||
          text.toLowerCase().includes('failed') ||
          text.includes('✘') ||
          text.includes('ERROR')) {
        errorLogs.push(text);
      }
    }
    
    if (errorLogs.length === 0) {
      return 'Build failed but no specific error logs were found. Check the Vercel dashboard for details.';
    }
    
    // Limit to last 50 lines to avoid extremely long comments
    const logOutput = errorLogs.slice(-50).join('\n');
    
    // Truncate if still too long (GitHub has a comment size limit)
    if (logOutput.length > 4000) {
      return logOutput.substring(0, 4000) + '\n\n... (truncated)';
    }
    
    return logOutput;
    
  } catch (error) {
    console.error('Error fetching deployment logs:', error);
    return `Error retrieving logs: ${error.message}`;
  }
}

async function getDeploymentDetails(deploymentId, teamId) {
  const url = `https://api.vercel.com/v13/deployments/${deploymentId}`;
  
  const headers = {
    'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
  };
  
  if (teamId) {
    headers['x-vercel-team-id'] = teamId;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch deployment details: ${response.status}`);
  }
  
  return await response.json();
}

function extractGitHubInfo(deployment) {
  const meta = deployment.meta || {};
  
  // Try different metadata keys that Vercel uses
  const prNumber = meta.githubPrId || 
                   meta['githubCommitRef']?.match(/refs\/pull\/(\d+)\/merge/)?.[1] ||
                   null;
  
  let owner = meta.githubOrg || meta['githubCommitOrg'];
  let repo = meta.githubRepo || meta['githubCommitRepo'];
  
  // Fallback to parsing from gitSource
  if (!owner || !repo) {
    const repoUrl = deployment.gitSource?.repoId;
    if (repoUrl && repoUrl.includes('/')) {
      const parts = repoUrl.split('/');
      owner = parts[parts.length - 2];
      repo = parts[parts.length - 1];
    }
  }
  
  return { owner, repo, prNumber };
}

async function postGitHubComment(owner, repo, prNumber, errorMessage, deploymentUrl, deploymentName) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`;
  
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  });
  
  const commentBody = `##  Vercel Deployment Failed

**Project:** ${deploymentName || 'Unknown'}  
**Time:** ${timestamp}  
**Deployment:** [View in Vercel Dashboard](${deploymentUrl})

### Error Details

<details>
<summary>Click to view build error logs</summary>

\`\`\`
${errorMessage}
\`\`\`

</details>

---
<sub>Posted automatically when deployment fails • [View Vercel Deployment](${deploymentUrl})</sub>`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      body: commentBody
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to post GitHub comment: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Verify required environment variables
  if (!VERCEL_CLIENT_SECRET || !VERCEL_API_TOKEN || !GITHUB_TOKEN) {
    console.error('Missing required environment variables');
    return res.status(500).json({ 
      error: 'Server configuration error',
      missing: {
        VERCEL_CLIENT_SECRET: !VERCEL_CLIENT_SECRET,
        VERCEL_API_TOKEN: !VERCEL_API_TOKEN,
        GITHUB_TOKEN: !GITHUB_TOKEN
      }
    });
  }
  
  try {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-vercel-signature'];
    
    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }
    
    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const payload = req.body;
    
    // Only handle deployment-error events
    if (payload.type !== 'deployment-error') {
      console.log(`Ignoring event type: ${payload.type}`);
      return res.status(200).json({ message: 'Event type not handled' });
    }
    
    const deploymentId = payload.payload.deployment.id;
    const teamId = payload.payload.team?.id;
    const deploymentUrl = payload.payload.links.deployment;
    
    console.log(`Processing deployment error: ${deploymentId}`);
    
    // Get deployment details
    const deployment = await getDeploymentDetails(deploymentId, teamId);
    const deploymentName = deployment.name || 'Unknown';
    
    // Extract GitHub information
    const { owner, repo, prNumber } = extractGitHubInfo(deployment);
    
    if (!owner || !repo) {
      console.log('Could not extract repository info from deployment');
      return res.status(200).json({ 
        message: 'No repository info found',
        meta: deployment.meta 
      });
    }
    
    if (!prNumber) {
      console.log('Deployment not associated with a PR');
      return res.status(200).json({ 
        message: 'No PR associated with this deployment'
      });
    }
    
    console.log(`Found PR: ${owner}/${repo}#${prNumber}`);
    
    // Fetch deployment error logs
    const errorLogs = await getDeploymentLogs(deploymentId, teamId);
    
    // Post comment to GitHub PR
    await postGitHubComment(owner, repo, prNumber, errorLogs, deploymentUrl, deploymentName);
    
    console.log(`Successfully posted error comment to ${owner}/${repo}#${prNumber}`);
    
    return res.status(200).json({ 
      success: true,
      message: `Posted comment to ${owner}/${repo}#${prNumber}`
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
