# 🚀 Quick Fix for Render 502 Error

## The Problem
You're getting `Failed to load resource: 502` and `SyntaxError: Unexpected token '<', "<!DOCTYPE "...` 

**This means:** Your Node.js server isn't running on Render.

---

## ⚡ Quick Fix (Do These Steps in Order)

### 1️⃣ Push the Updated Code

First, commit and push the changes I just made:

```bash
git add .
git commit -m "Fix Render deployment configuration"
git push origin main
```

### 2️⃣ Check Render Service Settings

Go to: https://dashboard.render.com → Your Service → Settings

**Verify:**
- ✅ **Build Command:** `npm install`
- ✅ **Start Command:** `npm start`
- ✅ **Environment:** `Node`

### 3️⃣ Set Environment Variables

Go to: https://dashboard.render.com → Your Service → Environment

**Copy these EXACT values from your working deployment:**

Click **Add Environment Variable** for each:

| Key | Value (from working deployment) |
|-----|--------------------------------|
| `FIREBASE_API_KEY` | (copy from working) |
| `FIREBASE_AUTH_DOMAIN` | (copy from working) |
| `FIREBASE_PROJECT_ID` | (copy from working) |
| `FIREBASE_STORAGE_BUCKET` | (copy from working) |
| `FIREBASE_MESSAGING_SENDER_ID` | (copy from working) |
| `FIREBASE_APP_ID` | (copy from working) |
| `SUPABASE_URL` | (copy from working) |
| `SUPABASE_ANON_KEY` | (copy from working) |
| `SUPABASE_SERVICE_ROLE_KEY` | (copy from working) |
| `NODE_VERSION` | `18.18.0` |

**Optional (if you use these features):**
- `GA_MEASUREMENT_ID`
- `DODO_PAYMENTS_API_KEY`
- `PRODUCT_ID`
- `DODO_WEBHOOK_SECRET`

⚠️ **IMPORTANT:** 
- Don't include quotes around values
- Don't include `export` or `=` signs
- Copy EXACTLY from working deployment

### 4️⃣ Deploy

After setting environment variables, Render will auto-deploy. Or:

Go to: **Manual Deploy** → **Clear build cache & deploy**

### 5️⃣ Check Logs

Go to: **Logs** tab

**Look for:**
```
✅ Server successfully started on port 10000
=== Environment Variables Status ===
Firebase API Key: ✅ Set
Firebase Auth Domain: ✅ Set
...
```

If you see `❌ Missing` next to any variable, go back to step 3.

### 6️⃣ Test

Visit: `https://your-app.onrender.com/healthz`

Should return: `ok`

Then test your main app: `https://your-app.onrender.com`

---

## 🔍 Troubleshooting

### Still getting 502?

**Check these in order:**

1. **Logs show server starting?**
   - YES → Environment variable issue
   - NO → Build failed, check build logs

2. **All environment variables set?**
   - Go to Environment tab
   - Count: Should have at least 9 variables
   - Compare with working deployment

3. **Health check works?**
   - `https://your-app.onrender.com/healthz`
   - If 502 here, server definitely not running
   - Check logs for startup errors

### Error: "Cannot find module"

Run:
```bash
npm install
```

Make sure `package-lock.json` is committed:
```bash
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

### Error: "Missing environment variable"

You forgot to set one in Render dashboard. Go back to step 3.

### Health check works but app doesn't?

Check browser console:
- If you see Firebase errors → Check Firebase env vars
- If you see Supabase errors → Check Supabase env vars
- Still see 502 → Check that ALL env vars are set

---

## 💡 Pro Tips

### Copy All Environment Variables at Once

From your working deployment:

1. Go to working service → Environment tab
2. Copy each variable name and value
3. Create a temporary file (DON'T commit it!)
4. Paste them all
5. Then copy each one individually to new deployment

### Use Render's Blueprints (Advanced)

The `render.yaml` file I created will help Render auto-configure your service. Make sure it's committed:

```bash
git add render.yaml
git commit -m "Add Render blueprint"
git push
```

### Compare Services

If you have a working Render service, compare:
- Environment variables (count and names)
- Service settings
- Node version

---

## 📞 Need More Help?

See the full guide: [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)

---

## ✅ Success Checklist

- [ ] Code pushed to Git
- [ ] Render service settings correct
- [ ] All environment variables set
- [ ] Deployment successful
- [ ] Logs show "Server successfully started"
- [ ] All env vars show "✅ Set" in logs
- [ ] Health check returns "ok"
- [ ] App loads without 502 error
- [ ] Can sign in with Google

**If all checked, you're done!** 🎉

