/**
 * Test script for Vercel Error to GitHub PR webhook
 * 
 * This script helps you test your webhook setup without waiting for a real deployment failure.
 * 
 * Usage:
 *   node test-webhook.js <deployment-id> <pr-number>
 * 
 * Example:
 *   node test-webhook.js dpl_abc123def456 42
 */

require('dotenv').config();

const crypto = require('crypto');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/vercel-webhook';
const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET;

if (!VERCEL_CLIENT_SECRET) {
  console.error('❌ VERCEL_CLIENT_SECRET environment variable is required');
  process.exit(1);
}

// Get arguments
const [, , deploymentId, prNumber] = process.argv;

if (!deploymentId || !prNumber) {
  console.error('Usage: node test-webhook.js <deployment-id> <pr-number>');
  console.error('Example: node test-webhook.js dpl_abc123def456 42');
  process.exit(1);
}

// Create test payload
const testPayload = {
  id: `evt_${Date.now()}`,
  type: 'deployment-error',
  createdAt: Date.now(),
  payload: {
    team: {
      id: 'team_test123'
    },
    user: {
      id: 'user_test123'
    },
    deployment: {
      id: deploymentId,
      meta: {
        githubOrg: 'your-org',
        githubRepo: 'your-repo',
        githubPrId: prNumber,
        githubCommitRef: `refs/pull/${prNumber}/merge`
      },
      url: `your-project-${deploymentId.slice(-8)}.vercel.app`,
      name: 'your-project'
    },
    links: {
      deployment: `https://vercel.com/your-team/your-project/${deploymentId}`,
      project: 'https://vercel.com/your-team/your-project'
    },
    project: {
      id: 'prj_test123'
    }
  }
};

// Create signature
const bodyString = JSON.stringify(testPayload);
const signature = crypto
  .createHmac('sha1', VERCEL_CLIENT_SECRET)
  .update(Buffer.from(bodyString, 'utf-8'))
  .digest('hex');

console.log('🧪 Testing webhook with:');
console.log(`   Deployment ID: ${deploymentId}`);
console.log(`   PR Number: ${prNumber}`);
console.log(`   Webhook URL: ${WEBHOOK_URL}`);
console.log('');

// Send test request
fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-vercel-signature': signature
  },
  body: bodyString
})
  .then(async response => {
    const text = await response.text();
    
    if (response.ok) {
      console.log(' Webhook test successful!');
      console.log('Response:', text);
    } else {
      console.error('❌ Webhook test failed');
      console.error(`Status: ${response.status}`);
      console.error('Response:', text);
    }
  })
  .catch(error => {
    console.error('❌ Error sending test request:', error.message);
  });
