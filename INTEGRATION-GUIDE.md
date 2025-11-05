# 🔧 Integration Guide: How to Use This with Your Projects

## 🎯 Important Concept: This is a Separate Service

**This webhook handler is NOT added to your application projects.**

Instead, it's a **standalone monitoring service** that watches ALL your Vercel projects and posts errors to their PRs.

```
┌─────────────────────────────────────────────────────────┐
│         Your Existing Projects (Untouched)              │
│                                                          │
│  Project A (Next.js app)  ← No changes needed          │
│  Project B (React app)    ← No changes needed          │
│  Project C (Vue app)      ← No changes needed          │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Deployment errors
                            ▼
┌─────────────────────────────────────────────────────────┐
│      Error Comment Bot (This Service)                   │
│      Deployed ONCE as separate project                  │
│                                                          │
│  • Listens for deployment errors                        │
│  • Fetches error logs                                   │
│  • Posts comments to PRs                                │
└─────────────────────────────────────────────────────────┘
```

## 📋 Setup Scenarios

### Scenario 1: Existing Projects (Most Common)

**You have projects already deployed on Vercel. You want error notifications.**

#### Steps:

1. **Create ONE new repository** for the webhook handler
   ```bash
   mkdir vercel-error-bot
   cd vercel-error-bot
   git init
   ```

2. **Add only these files to this new repo:**
   ```
   vercel-error-bot/
   ├── api/
   │   └── vercel-webhook.js
   ├── package.json
   ├── vercel.json
   ├── .gitignore
   └── README.md
   ```

3. **Deploy this bot as its own Vercel project**
   ```bash
   vercel --prod
   ```
   - It gets its own URL: `https://vercel-error-bot.vercel.app`
   - It's separate from your app projects

4. **Configure the webhook** to monitor ALL your projects
   - Go to Vercel Settings → Webhooks
   - URL: `https://vercel-error-bot.vercel.app/webhook`
   - Projects: **Select "All Projects"** or choose specific ones
   - Events: ✓ Deployment Error

5. **Done!** Your existing projects are now monitored
   - No changes to their code
   - No changes to their deployments
   - Just monitoring from the outside

### Scenario 2: Starting a New Project

**You're creating a new app. Should you include this?**

**Answer: NO.** Keep your app and the monitoring bot separate.

#### Steps:

1. **Create your app normally:**
   ```bash
   npx create-next-app my-new-app
   cd my-new-app
   # ... build your app
   git push
   vercel --prod
   ```

2. **If you haven't already, deploy the error bot (ONE TIME ONLY):**
   ```bash
   # In a different directory
   git clone <this-repo>
   cd vercel-error-bot
   vercel --prod
   ```

3. **The bot automatically monitors your new project**
   - If you selected "All Projects" when creating the webhook
   - Otherwise, edit webhook settings to add the new project

### Scenario 3: Team/Organization Setup

**You want this for your whole team.**

#### Steps:

1. **Deploy bot ONCE at the team level:**
   - Create the bot repo in your organization's GitHub
   - Deploy to Vercel under your team account
   - Use team-level tokens (not personal)

2. **Configure once for all team projects:**
   - Vercel webhook → "All Projects" in your team
   - Now every team member's PRs get error comments

3. **Team members do nothing special:**
   - They create projects normally
   - They push code normally
   - Errors are automatically commented

## 🤔 Common Questions

### Q: Do I add these files to my Next.js app?
**A: NO.** This is a separate service. Your app code stays clean.

### Q: How many times do I deploy this?
**A: ONCE.** One deployment monitors all your projects.

### Q: What if I have 10 projects?
**A: One bot watches all 10.** Select "All Projects" in webhook config.

### Q: Can I customize per-project?
**A: Yes, kind of.** You can:
- Create separate webhooks for different projects
- Modify the bot code to check project name and customize behavior
- Deploy multiple bot instances with different configs

### Q: Does this affect my app's performance?
**A: NO.** The bot only activates when deployments fail. Zero impact on your apps.

### Q: What about my existing Vercel comments?
**A: They stay.** Vercel's default comments still appear. This adds detail.

## 📁 Recommended Repository Structure

### Option A: Standalone Repo (Recommended)
```
GitHub: your-org/
├── my-app/              ← Your actual app
│   ├── src/
│   ├── package.json
│   └── ...
│
└── vercel-error-bot/    ← The monitoring bot (separate repo)
    ├── api/
    │   └── vercel-webhook.js
    ├── package.json
    └── vercel.json
```

### Option B: Monorepo (Advanced)
```
GitHub: your-org/my-monorepo/
├── apps/
│   ├── web-app/         ← Your app
│   ├── mobile-app/      ← Another app
│   └── error-bot/       ← The bot (separate app in monorepo)
│       ├── api/
│       └── ...
└── package.json
```

## 🚀 Deployment Commands Summary

### For the Bot (One-Time Setup)
```bash
# Clone or create the bot repo
git clone <this-repo> vercel-error-bot
cd vercel-error-bot

# Deploy to Vercel
vercel --prod

# Configure environment variables in Vercel dashboard
# Create webhook in Vercel settings
```

### For Your Apps (Business as Usual)
```bash
# Your normal workflow doesn't change!
cd my-app
git add .
git commit -m "fix: update feature"
git push

# Vercel auto-deploys (as usual)
# If it fails, bot comments automatically
```

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Bot is deployed: `https://your-bot.vercel.app`
- [ ] Webhook exists in Vercel settings
- [ ] Webhook shows "All Projects" or specific projects
- [ ] Environment variables are set in bot project
- [ ] Test: Push failing code to a PR
- [ ] Verify: PR receives detailed error comment

## 🎨 Customization Per Project

If you want different behavior for different projects:

```javascript
// In api/vercel-webhook.js, add project-specific logic:

async function postGitHubComment(owner, repo, prNumber, errorMessage, deploymentUrl, deploymentName) {
  // Customize based on project name
  let emoji = '🚨';
  let title = 'Vercel Deployment Failed';
  
  if (deploymentName.includes('production')) {
    emoji = '⚠️';
    title = 'CRITICAL: Production Deployment Failed';
  } else if (deploymentName.includes('staging')) {
    emoji = '⚡';
    title = 'Staging Deployment Failed';
  }
  
  const commentBody = `## ${emoji} ${title}
  
**Project:** ${deploymentName}
...
`;
  
  // Rest of the function...
}
```

## 💡 Best Practices

1. **Keep it separate:** Don't mix bot code with app code
2. **One bot per team:** Not one bot per project
3. **Use team tokens:** For organization-wide setup
4. **Version control:** Track bot changes in its own repo
5. **Document for team:** Link to bot repo in team wiki

## 🔄 Migration Path

Already deployed some projects? Here's how to add the bot:

```
Week 1: Deploy the bot as standalone project
Week 1: Test with 1-2 projects first
Week 2: Add webhook for all projects
Week 2: Monitor and adjust as needed
✅ Done! All projects now have error notifications
```

## 📞 Support Pattern

When something goes wrong:

**App deployment fails?**
→ Check the app's code/config

**Comment not appearing?**
→ Check the bot's logs in Vercel dashboard

**Wrong error message format?**
→ Update the bot's code, redeploy bot only

---

**TL;DR:** Deploy this ONCE as a separate project. It monitors ALL your apps. Don't add it to each app.
