# 🚀 Quick Deployment Checklist

Follow these steps in order to get your Vercel error notifications working in ~10 minutes!

## ☑️ Step-by-Step Checklist

### Prerequisites
- [ ] You have a Vercel account with projects deployed
- [ ] Your Vercel projects are connected to GitHub repositories
- [ ] You have access to create GitHub tokens
- [ ] You have Node.js installed locally (optional, for testing)

### Part 1: Get Your Tokens (5 minutes)

#### GitHub Token
- [ ] Go to https://github.com/settings/tokens
- [ ] Click "Generate new token (classic)"
- [ ] Name it: "Vercel Error Comment Bot"
- [ ] Select scope: `repo` (or `public_repo` for public repos only)
- [ ] Click "Generate token"
- [ ] **Copy and save the token** - you won't see it again!

#### Vercel API Token
- [ ] Go to https://vercel.com/account/tokens
- [ ] Click "Create Token"
- [ ] Name it: "Error Comment Integration"
- [ ] Click "Create"
- [ ] **Copy and save the token**

### Part 2: Deploy to Vercel (3 minutes)

- [ ] Create a new GitHub repository or use existing one
- [ ] Upload these files to your repository:
  - `api/vercel-webhook.js`
  - `package.json`
  - `vercel.json`
  - `.gitignore`
  - `README.md`

- [ ] Go to https://vercel.com/new
- [ ] Import your GitHub repository
- [ ] Click "Deploy"
- [ ] **Copy your deployment URL** (e.g., `https://my-webhook.vercel.app`)

### Part 3: Configure Environment Variables (2 minutes)

- [ ] In Vercel dashboard, go to your project
- [ ] Click Settings → Environment Variables
- [ ] Add these three variables:

```
Name: GITHUB_TOKEN
Value: ghp_xxxxxxxxxxxxx (your token from Part 1)
Environment: Production
```

```
Name: VERCEL_API_TOKEN  
Value: xxxxxxxxxxxxx (your token from Part 1)
Environment: Production
```

```
Name: VERCEL_CLIENT_SECRET
Value: (get this in Part 4)
Environment: Production
```

### Part 4: Create Vercel Webhook (2 minutes)

- [ ] Go to https://vercel.com/dashboard/webhooks
- [ ] Click "Create Webhook"
- [ ] Enter webhook URL: `https://your-deployment.vercel.app/webhook`
- [ ] Select Events: Check ☑️ "Deployment Error"
- [ ] Select Projects: Choose which projects to monitor
- [ ] Click "Create"
- [ ] **Copy the "Client Secret"** that appears
- [ ] Go back to your Vercel project → Settings → Environment Variables
- [ ] Add the secret as `VERCEL_CLIENT_SECRET`

### Part 5: Test It! (2 minutes)

- [ ] Create a test branch in one of your monitored projects
- [ ] Add a build error (e.g., syntax error in your code)
- [ ] Create a pull request
- [ ] Push the code and wait for Vercel to build
- [ ] Check the PR for a comment with error details! 🎉

## ✅ Success Criteria

You should see:
- ✅ Vercel webhook shows "Last delivery: Success"
- ✅ PR has a comment with deployment error details
- ✅ Comment includes formatted error logs

## 🐛 If Something Goes Wrong

### No webhook delivery?
- Check the webhook URL is correct
- Verify webhook is enabled
- Check Vercel function logs

### Webhook returns error?
- Verify all 3 environment variables are set
- Check token permissions
- Look at function logs in Vercel dashboard

### Comment not on PR?
- Verify deployment is from a PR (not main branch)
- Check GitHub token has `repo` scope
- Verify repo owner/name is correct

### Need help?
- Check the detailed [SETUP-GUIDE.md](./SETUP-GUIDE.md)
- Review function logs in Vercel dashboard
- Check webhook delivery logs in Vercel settings

## 🎉 Done!

Your integration is now active! Every time a deployment fails on a PR, detailed error logs will automatically be posted as a comment.

---

**Estimated setup time:** 10-15 minutes  
**Maintenance:** None - it just works! ✨
