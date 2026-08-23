# 🚀 Setup GitHub Secrets for Netlify Deployment

## ⚡ Quick Setup (2 minutes)

### Step 1: Get Netlify Build Hook URL

1. Go to: https://app.netlify.com/sites/keen-cranachan-275345/settings/deploys
2. Scroll down to **"Build hooks"** section
3. Click **"Add build hook"**
4. Name: `GitHub Actions` (or any name)
5. Branch: `main`
6. Click **"Save"**
7. **Copy the generated URL** (looks like: `https://api.netlify.com/build_hooks/xxxxx...`)

### Step 2: Add Secret to GitHub

1. Go to: https://github.com/museliomuselio23-ui/muselio-web/settings/secrets/actions
2. Click **"New repository secret"**
3. **Name:** `NETLIFY_BUILD_HOOK_URL`
4. **Value:** Paste the URL from Step 1
5. Click **"Add secret"**

### Step 3: Trigger Deployment

Go back to this repo and create any commit to `main` branch:
```bash
git push origin main
```

The workflow will automatically:
- ✅ Request OIDC token from GitHub
- ✅ Trigger Netlify deployment via Build Hook
- ✅ Deploy to production

---

## 📋 What This Workflow Does

| Event | Action |
|-------|--------|
| Push to `main` | 🚀 Deploy to production |
| Push to PR | 🔍 Create preview deployment |
| Failed secret | ❌ Fail with clear error |

## 🔒 Security

- **OIDC Tokens**: Ephemeral, auto-expiring
- **Build Hook URL**: Stored securely in GitHub Secrets
- **Zero Static PAT**: No personal access tokens needed
- **Audit Trail**: Complete GitHub Actions logs

## ❓ Troubleshooting

**Workflow fails with "NETLIFY_BUILD_HOOK_URL secret not configured"?**
→ You skipped Step 2. Go to GitHub settings and add the secret.

**Build Hook not triggering?**
→ Verify the URL is copied correctly (no extra spaces)

**Wrong branch deploying?**
→ Check the Build Hook was created for `main` branch in Netlify

---

**Questions?** Check the workflow logs on GitHub Actions page.
