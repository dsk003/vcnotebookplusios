# Render Deployment Troubleshooting Guide

## 🔍 Diagnosing 502 Errors on Render

A 502 error means your server isn't responding. Here's how to fix it:

## Step 1: Check Render Logs

1. Go to your Render dashboard: https://dashboard.render.com
2. Click on your service
3. Go to the **Logs** tab
4. Look for errors during startup

### What to look for:
- ❌ "Error: Cannot find module..." → Missing dependencies
- ❌ "EADDRINUSE" → Port conflict (unlikely on Render)
- ❌ "Missing environment variable" → Environment variables not set
- ✅ "Server successfully started on port..." → Server is running correctly

## Step 2: Verify Environment Variables

In your Render dashboard, go to **Environment** tab and ensure ALL of these are set:

### Required Variables:
```
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Optional Variables (for premium features):
```
GA_MEASUREMENT_ID=G-XXXXXXXXXX
DODO_PAYMENTS_API_KEY=your_dodo_api_key
PRODUCT_ID=your_product_id
DODO_WEBHOOK_SECRET=your_webhook_secret
```

**⚠️ IMPORTANT:** 
- Copy these EXACTLY from your working deployment
- No quotes around values in Render's dashboard
- No spaces before or after the `=` sign
- Make sure there are no trailing spaces

## Step 3: Verify Render Service Settings

In your Render dashboard, verify:

1. **Build Command:** `npm install`
2. **Start Command:** `npm start`
3. **Environment:** `Node`
4. **Branch:** Should match your Git branch (usually `main` or `master`)
5. **Auto-Deploy:** Enabled (if you want automatic deploys on push)

## Step 4: Check Your render.yaml (if using Infrastructure as Code)

If you're using the `render.yaml` file, ensure it's at the root of your repository and matches the configuration in your dashboard.

## Step 5: Common Fixes

### Fix 1: Redeploy with Clear Cache
1. In Render dashboard, go to **Manual Deploy**
2. Click **Clear build cache & deploy**
3. Wait for deployment to complete
4. Check logs for any errors

### Fix 2: Verify package.json
Ensure your `package.json` has:
```json
{
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "engines": {
    "node": ">=18"
  }
}
```

### Fix 3: Check Node Version
Render uses Node 14 by default. Add to your Render environment variables:
```
NODE_VERSION=18.18.0
```

### Fix 4: Verify Port Binding
The server should bind to `0.0.0.0` (not `localhost`). This is already fixed in the updated `server.js`.

### Fix 5: Check for .env file
Make sure you're NOT committing your `.env` file to Git. All environment variables should be set in Render's dashboard instead.

## Step 6: Test Health Check

Once deployed, visit:
```
https://your-app.onrender.com/healthz
```

You should see: `ok`

If you get a 502 error here, your server isn't starting properly. Check the logs.

## Step 7: Test API Endpoints

Test each endpoint individually:

1. **Firebase Config:**
   ```
   https://your-app.onrender.com/api/firebase-config
   ```
   Should return JSON with Firebase config

2. **Supabase Config:**
   ```
   https://your-app.onrender.com/api/config
   ```
   Should return JSON with Supabase config

3. **GA Config:**
   ```
   https://your-app.onrender.com/api/ga-config
   ```
   Should return JSON with GA config

If any of these return HTML instead of JSON, it means the server isn't handling the request properly.

## Debugging Checklist

- [ ] All environment variables are set in Render dashboard
- [ ] Environment variable values are correct (copy from working deployment)
- [ ] Build command is `npm install`
- [ ] Start command is `npm start`
- [ ] No `.env` file is committed to Git
- [ ] Node version is 18 or higher
- [ ] Health check endpoint returns `ok`
- [ ] Server logs show "Server successfully started"
- [ ] All environment variables show "✅ Set" in server logs

## Still Having Issues?

### Get Detailed Logs

1. In Render dashboard, click on your service
2. Go to **Logs** tab
3. Look for the startup logs (starting with 🚀)
4. Check the "Environment Variables Status" section
5. Share any error messages for further debugging

### Compare with Working Deployment

If you have a working deployment:

1. Export environment variables from working deployment
2. Compare with new deployment
3. Look for any differences in:
   - Environment variable values
   - Service settings
   - Build/start commands
   - Node version

### Test Locally First

Before deploying, test locally:
```bash
npm install
npm start
```

Then visit `http://localhost:3000/healthz` - should return `ok`

If it works locally but not on Render, it's definitely an environment variable or configuration issue.

## Quick Fix: Copy Existing Service

If you have a working Render service:

1. Go to your working service settings
2. Copy all environment variables
3. Create a new service or update the failing one
4. Paste environment variables
5. Deploy

## Contact Support

If none of these steps work, contact Render support with:
- Link to your service
- Server startup logs
- Description of the error
- Steps you've tried

