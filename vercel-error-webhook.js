/**
 * Vercel Deployment Error to GitHub PR Comment Handler
 * 
 * This webhook handler listens for Vercel deployment-error events,
 * fetches detailed error logs, and posts them as comments on GitHub PRs.
 */

const crypto = require('crypto');

// Environment variables needed:
// VERCEL_CLIENT_SECRET - Your Vercel integration client secret
// VERCEL_API_TOKEN - Vercel API token
// GITHUB_TOKEN - GitHub personal access token with repo permissions

const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET;
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

/**
 * Verify the webhook signature from Vercel
 */
function verifyWebhookSignature(body, signature) {
  const bodyBuffer = Buffer.from(body, 'utf-8');
  const computedSignature = crypto
    .createHmac('sha1', VERCEL_CLIENT_SECRET)
    .update(bodyBuffer)
    .digest('hex');
  
  return computedSignature === signature;
}

/**
 * Fetch deployment build logs from Vercel API
 */
async function getDeploymentLogs(deploymentId, teamId) {
  const url = `https://api.vercel.com/v3/deployments/${deploymentId}/events`;
  
  const headers = {
    'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
  };
  
  if (teamId) {
    headers['x-vercel-team-id'] = teamId;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`);
  }
  
  const events = await response.json();
  
  // Filter for error messages and build logs
  const errorLogs = events
    .filter(event => {
      return event.type === 'stderr' || 
             (event.payload && event.payload.text && 
              (event.payload.text.includes('Error') || 
               event.payload.text.includes('error') ||
               event.payload.text.includes('Failed') ||
               event.payload.text.includes('failed')));
    })
    .map(event => event.payload?.text || JSON.stringify(event))
    .join('\n');
  
  return errorLogs || 'Error logs could not be retrieved.';
}

/**
 * Get deployment details from Vercel API
 */
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
    throw new Error(`Failed to fetch deployment: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Extract GitHub info from deployment metadata
 */
function extractGitHubInfo(deployment) {
  const meta = deployment.meta || {};
  
  // Get repo info from various possible sources
  const githubRepo = meta.githubRepo || 
                     meta['github-repo'] ||
                     deployment.source?.repoId;
  const githubOrg = meta.githubOrg || 
                    meta['github-org'] ||
                    deployment.source?.org;
  const prNumber = meta.githubPrId || 
                   meta['github-pr-id'] ||
                   meta.githubPullRequestId;
  
  // Parse repo from git source if available
  let owner = githubOrg;
  let repo = githubRepo;
  
  if (deployment.gitSource?.ref?.includes('/')) {
    // Handle full repo path
    const parts = deployment.gitSource.ref.split('/');
    if (parts.length >= 2) {
      owner = parts[0];
      repo = parts[1];
    }
  }
  
  return { owner, repo, prNumber };
}

/**
 * Post comment to GitHub PR
 */
async function postGitHubComment(owner, repo, prNumber, errorMessage, deploymentUrl) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`;
  
  const commentBody = `## ❌ Vercel Deployment Failed

**Deployment URL:** ${deploymentUrl}

### Error Details

\`\`\`
${errorMessage}
\`\`\`

---
*Posted automatically by Vercel deployment error webhook*`;
  
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

/**
 * Main webhook handler
 */
async function handleWebhook(request) {
  // Get the raw body and signature
  const rawBody = await request.text();
  const signature = request.headers.get('x-vercel-signature');
  
  // Verify signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  const payload = JSON.parse(rawBody);
  
  // Only handle deployment-error events
  if (payload.type !== 'deployment-error') {
    return new Response('Event type not handled', { status: 200 });
  }
  
  try {
    const deploymentId = payload.payload.deployment.id;
    const teamId = payload.payload.team?.id;
    const deploymentUrl = payload.payload.links.deployment;
    
    console.log(`Processing deployment error for: ${deploymentId}`);
    
    // Get deployment details to extract GitHub info
    const deployment = await getDeploymentDetails(deploymentId, teamId);
    const { owner, repo, prNumber } = extractGitHubInfo(deployment);
    
    if (!owner || !repo || !prNumber) {
      console.log('Could not extract GitHub info from deployment:', {
        owner, repo, prNumber, meta: deployment.meta
      });
      return new Response('No PR associated with this deployment', { status: 200 });
    }
    
    console.log(`Found PR: ${owner}/${repo}#${prNumber}`);
    
    // Fetch deployment logs
    const errorLogs = await getDeploymentLogs(deploymentId, teamId);
    
    // Post comment to GitHub
    await postGitHubComment(owner, repo, prNumber, errorLogs, deploymentUrl);
    
    console.log(`Successfully posted error comment to PR #${prNumber}`);
    
    return new Response('Success', { status: 200 });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

// Export for serverless environments
module.exports = handleWebhook;

// For Next.js API routes
module.exports.default = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const request = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify(req.body),
    headers: req.headers
  });
  
  const response = await handleWebhook(request);
  const text = await response.text();
  
  return res.status(response.status).send(text);
};
