# Vercel Deployment Error → GitHub PR Comments

> **🤔 First time here?** → [START-HERE.md](./START-HERE.md) explains the deployment model in 30 seconds  
> **📚 Need navigation?** → [INDEX.md](./INDEX.md) has all documentation organized by purpose

Automatically post detailed Vercel deployment error logs as comments on GitHub pull requests when builds fail.

## 🎯 What This Does

**This is a standalone monitoring bot** that watches your Vercel projects and posts detailed error messages to PRs when deployments fail.

- 🤖 **Deploy ONCE** - Monitors ALL your Vercel projects
- 📦 **Zero changes** to your existing apps
- 🔍 **Automatic** - Works for all PRs across all monitored projects

When a Vercel deployment fails on a PR:
1. ✅ Vercel sends a webhook to your endpoint
2. ✅ The handler fetches detailed error logs from Vercel API
3. ✅ A formatted comment with the full error is posted to the GitHub PR
4. ✅ Developers see exactly what went wrong without leaving GitHub

## 📋 Before vs After

**Before:** Vercel comments "Deployment failed" with a link  
**After:** Full build error logs posted directly in the PR ✨

## 🏗️ How It Works

```
Your Apps (unchanged)          Error Bot (deploy once)
┌──────────────────┐          ┌──────────────────┐
│  my-next-app     │          │  Webhook Handler │
│  my-react-app    │─errors──▶│  Watches all     │─comments─▶ GitHub PRs
│  my-vue-app      │          │  your projects   │
└──────────────────┘          └──────────────────┘
```

**Important:** This is NOT added to your app projects. It's a separate service.

## 🚀 Quick Start

**Note:** This is deployed as a **separate service** from your apps. See [INTEGRATION-GUIDE.md](./INTEGRATION-GUIDE.md) for details.

### 1. Clone & Deploy

```bash
# Clone this repository
git clone <your-repo-url>
cd vercel-error-to-github-pr

# Deploy to Vercel
vercel --prod
```

### 2. Get Your Tokens

You need three tokens:

**GitHub Token:**
- Go to [GitHub Settings → Tokens](https://github.com/settings/tokens)
- Create token with `repo` scope
- Copy the token

**Vercel API Token:**
- Go to [Vercel Settings → Tokens](https://vercel.com/account/tokens)
- Create new token
- Copy the token

**Vercel Webhook Secret:**
- We'll get this in the next step!

### 3. Configure Environment Variables

In your Vercel project dashboard:

1. Go to Settings → Environment Variables
2. Add these three variables:

| Name | Value | Where to Get It |
|------|-------|-----------------|
| `GITHUB_TOKEN` | `ghp_xxx...` | GitHub Settings → Tokens |
| `VERCEL_API_TOKEN` | `xxx...` | Vercel Account → Tokens |
| `VERCEL_CLIENT_SECRET` | `xxx...` | Get in next step ↓ |

### 4. Create Vercel Webhook

1. Go to [Vercel Dashboard → Settings → Webhooks](https://vercel.com/dashboard/webhooks)
2. Click "Create Webhook"
3. Configure:
   - **URL:** `https://your-deployment.vercel.app/webhook`
   - **Events:** Check "Deployment Error" ☑️
   - **Projects:** Select projects to monitor
4. Click "Create"
5. **Copy the "Client Secret"** and add it as `VERCEL_CLIENT_SECRET` environment variable

### 5. Test It! 

Create a PR with a build error (e.g., syntax error) and watch the magic happen! 🎉

## 🔧 Project Structure

```
├── api/
│   └── vercel-webhook.js    # Main webhook handler
├── package.json              # Project dependencies
├── vercel.json               # Vercel configuration
├── test-webhook.js           # Test script
├── SETUP-GUIDE.md            # Detailed setup guide
└── README.md                 # This file
```

## 🧪 Testing

Test the webhook without waiting for a real deployment failure:

```bash
# Set up environment
cp .env.example .env
# Edit .env with your tokens

# Test with a deployment ID and PR number
node test-webhook.js dpl_abc123 42
```

## 📸 Example Comment

When a deployment fails, this gets posted to your PR:

```markdown
## 🚨 Vercel Deployment Failed

**Project:** my-app  
**Time:** Nov 4, 2025, 2:30 PM UTC  
**Deployment:** [View in Vercel Dashboard](https://vercel.com/...)

### Error Details

<details>
<summary>Click to view build error logs</summary>

```
Error: Command "npm run build" exited with 1
Module not found: Error: Can't resolve './missing-component'
  at ModuleNotFoundError
  ...
```

</details>

---
Posted automatically when deployment fails • [View Vercel Deployment](...)
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file (for local testing) or set in Vercel dashboard:

```env
# GitHub personal access token with 'repo' scope
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# Vercel API token
VERCEL_API_TOKEN=xxxxxxxxxxxxx

# Vercel webhook client secret (from webhook config)
VERCEL_CLIENT_SECRET=xxxxxxxxxxxxx

# Optional: Webhook URL for testing
WEBHOOK_URL=http://localhost:3000/api/vercel-webhook
```

### Customize Comment Format

Edit the `commentBody` in `api/vercel-webhook.js`:

```javascript
const commentBody = `## ⚠️ Custom Build Alert!

Your custom message here...

\`\`\`
${errorMessage}
\`\`\`
`;
```

## 🔐 Security

- ✅ Webhook signatures are verified
- ✅ All tokens are environment variables only
- ✅ No tokens in code or git
- ✅ Minimal API permissions required

## 🐛 Troubleshooting

### Comments Not Appearing?

1. **Check webhook logs** in Vercel dashboard
2. **Verify GitHub token** has `repo` scope
3. **Ensure PR exists** - deployment must be triggered from a PR
4. **Check function logs** in Vercel dashboard

### "Invalid signature" error?

- Make sure `VERCEL_CLIENT_SECRET` matches your webhook configuration
- The secret changes if you recreate the webhook

### No error logs in comment?

- Logs may not be immediately available
- Check the Vercel dashboard to confirm logs exist
- Some errors occur before any logs are generated

## 📚 Additional Documentation

- [SETUP-GUIDE.md](./SETUP-GUIDE.md) - Detailed setup instructions
- [Vercel Webhooks Docs](https://vercel.com/docs/webhooks)
- [GitHub API Docs](https://docs.github.com/en/rest/issues/comments)

## 💡 Advanced Usage

### How to Integrate with Your Projects

- **Existing projects?** → Deploy this bot once, configure webhook for "All Projects" → Done! [See guide](./INTEGRATION-GUIDE.md#scenario-1-existing-projects-most-common)
- **New project?** → Create your app normally. The bot already monitors it. [See guide](./INTEGRATION-GUIDE.md#scenario-2-starting-a-new-project)
- **Team setup?** → Deploy once for your organization. [See guide](./INTEGRATION-GUIDE.md#scenario-3-teamorganization-setup)

**Important:** Don't add this code to your app projects. Deploy it separately.

### Multiple Projects

The webhook can monitor multiple Vercel projects. Just select "All Projects" when creating the webhook, or create separate webhooks for different projects.

### Update Existing Comments

To update existing comments instead of creating new ones, see the "Advanced Configuration" section in [SETUP-GUIDE.md](./SETUP-GUIDE.md#update-existing-comments).

### Custom Filtering

Only post comments for specific error types by adding filters in the webhook handler.

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

MIT License - feel free to use this in your projects!

## 🙏 Credits

Built with:
- [Vercel](https://vercel.com) - Hosting & Webhooks
- [GitHub API](https://docs.github.com/en/rest) - PR Comments
- Node.js & Fetch API

---

**Need help?** Check the [detailed setup guide](./SETUP-GUIDE.md) or open an issue!
