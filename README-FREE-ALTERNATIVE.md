# Vercel Deployment Error Comments (FREE Alternative)

Automatically post detailed Vercel deployment errors to GitHub PRs using **GitHub Actions** - no Vercel Pro plan required! 🎉

## ✨ What This Does

Posts detailed error logs to your PR when Vercel deployments fail - **completely free** using GitHub Actions instead of Vercel webhooks.

**Before:** Vercel comments "❌ Deployment failed" with a link  
**After:** Full build error logs posted directly in the PR

## 🆓 Why This Approach?

- ✅ **Free** - No Vercel Pro plan needed ($20/month saved!)
- ✅ **Works on Hobby plan** - Uses GitHub Actions + Vercel API
- ✅ **No separate deployment** - Just a GitHub Actions workflow file
- ✅ **Automatic** - Triggers when Vercel deployments fail

## 📋 Setup (3 Steps)

### 1️⃣ Get Your Vercel API Token

1. Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Name it: `GitHub Actions - Deployment Errors`
4. Scope: Select your team/account
5. Copy the token

### 2️⃣ Add Token to GitHub Secrets

1. Go to your repo: **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `VERCEL_TOKEN`
4. Value: Paste your Vercel API token
5. Click **Add secret**

### 3️⃣ Add Workflow File

Create this file in your repo:

```
.github/workflows/vercel-error-comment.yml
```

Then copy the contents from `vercel-error-comment.yml` into it.

**That's it!** 🎉

## 🔧 How It Works

```
PR opened/updated
     ↓
Vercel auto-deploys
     ↓
Deployment fails ❌
     ↓
GitHub emits 'deployment_status' event
     ↓
GitHub Actions workflow triggers
     ↓
Fetches error logs from Vercel API
     ↓
Posts comment to PR ✅
```

## 🎯 What You Get

When a deployment fails, a comment like this appears:

```markdown
## 🚨 Vercel Deployment Failed

**Deployment:** [View on Vercel](https://vercel.com/...)
**Commit:** abc1234

### Error Details:
```
Error: Build failed
Module not found: Can't resolve './Component'
  at webpack compiled with 1 error
  × Build failed
```

---
<sub>This comment was automatically posted by GitHub Actions</sub>
```

## 💰 Cost Comparison

| Solution | Cost | Setup |
|----------|------|-------|
| **Vercel Webhooks** | $20/month per user | Deploy separate service |
| **GitHub Actions** ✅ | FREE | Add one YAML file |

## 🔐 Permissions Needed

### GitHub Token (Automatic)
- `GITHUB_TOKEN` - Auto-provided by GitHub Actions
- Permissions: Read repo, write PR comments

### Vercel Token (You create)
- Read deployment information
- Read deployment logs
- **Does NOT need** write access

## ✅ Testing

1. Push code that will fail the build (e.g., syntax error)
2. Open a PR
3. Wait for Vercel deployment to fail
4. Check PR comments - you should see the error details!

## 🎨 Customization

### Change Error Format

Edit the `commentBody` in the workflow:

```yaml
const commentBody = `## ⚠️ Build Failed!
**Oh no!** Something went wrong with your deployment.
${errorLogs}
`;
```

### Filter Error Types

Only show specific errors:

```yaml
ERROR_LOGS=$(echo "$RESPONSE" | jq -r '.[] | 
  select(.payload.text | contains("Module not found")) | 
  .payload.text')
```

### Add More Info

Include more deployment details:

```yaml
**Environment:** ${{ github.event.deployment.environment }}
**Branch:** ${{ github.head_ref }}
**Author:** @${{ github.event.pull_request.user.login }}
```

## 🆚 Webhook vs GitHub Actions

| Feature | Webhooks (Pro) | GitHub Actions (Free) |
|---------|---------------|----------------------|
| Cost | $20/month | FREE |
| Triggers | Real-time | ~10 seconds after |
| Setup | Deploy service | Add YAML file |
| Maintenance | Monitor service | Zero maintenance |
| Logs | Full access | Full access via API |

## 📝 FAQ

### Q: Does this work for all my repos?
**A:** You need to add the workflow file to each repo. But once added, it works for all PRs in that repo!

### Q: What about private repos?
**A:** Works perfectly! GitHub Actions minutes are free for public repos, and private repos get 2,000-3,000 free minutes/month.

### Q: Can I use this with multiple Vercel projects?
**A:** Yes! As long as the workflow file is in the repo, it'll catch failures from any Vercel project linked to that repo.

### Q: Does this replace Vercel's default comments?
**A:** No, this adds additional details. Vercel's default "Deployment failed" comment still appears.

### Q: What if I don't see comments?
Check:
- ✅ Workflow file is in `.github/workflows/`
- ✅ `VERCEL_TOKEN` secret is added
- ✅ Deployment actually failed (not just preview)
- ✅ Check Actions tab for workflow runs

### Q: Can I customize which projects this monitors?
**A:** Yes! Add a filter in the workflow:

```yaml
- name: Check project name
  run: |
    if [[ "${{ github.event.deployment.environment }}" != "Production" ]]; then
      echo "Skipping non-production deployment"
      exit 0
    fi
```

## 🚀 Advanced: Run for Multiple Repos

Create a **reusable workflow** and call it from each repo:

**In a shared repo:**
`.github/workflows/vercel-errors-reusable.yml`

```yaml
on:
  workflow_call:
    secrets:
      VERCEL_TOKEN:
        required: true

jobs:
  # ... (same workflow content)
```

**In each project repo:**
`.github/workflows/vercel-errors.yml`

```yaml
on:
  deployment_status:

jobs:
  comment:
    uses: your-org/shared-workflows/.github/workflows/vercel-errors-reusable.yml@main
    secrets:
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## 🎓 How This Saves You Money

**Scenario:** You have 3 developers and 5 projects

**With Webhooks:**
- Cost: $20/user × 3 = **$60/month**
- Plus: Deploy and maintain separate service

**With GitHub Actions:**
- Cost: **$0/month**
- Setup: 5 minutes per repo (one-time)

**Annual savings: $720** 💰

## 🔗 Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel API Docs](https://vercel.com/docs/rest-api)
- [deployment_status Event](https://docs.github.com/en/webhooks/webhook-events-and-payloads#deployment_status)

---

**TL;DR:** Add one YAML file to each repo, add your Vercel token to GitHub secrets, and get free deployment error comments forever. No Vercel Pro plan needed! 🎉
