# PDF Cloud Explorer Pro - Netlify Deployment Fix

## What Was Fixed

The app was showing a blank page on Netlify because the Google Gemini API key was being used directly in the browser code. This is a security issue and causes the app to crash.

**Solution:** Created a Netlify Function to securely proxy API calls on the server-side.

## Changes Made

### 1. Created Netlify Function
- **File:** `netlify/functions/gemini-api.js`
- This function runs on Netlify's servers (not in the browser)
- It securely stores and uses your API key
- Proxies requests to Google Gemini API

### 2. Updated `services/geminiService.ts`
- Removed direct API key usage (`process.env.API_KEY`)
- Now calls the Netlify function instead of the API directly
- Updated model names to use the latest: `gemini-2.0-flash-exp`

### 3. Added Configuration Files
- **`netlify.toml`** - Tells Netlify how to build and deploy your app
- **`package.json`** - Added `node-fetch` dependency for the function

## Deployment Steps

### Step 1: Push Updated Code to GitHub

```bash
# Navigate to your project directory
cd path/to/your/project

# Copy these updated files to your project
# (Replace the old files with the new ones from this zip)

# Add all changes
git add .

# Commit changes
git commit -m "Fix: Move API key to Netlify Functions for security"

# Push to GitHub
git push origin main
```

### Step 2: Set Environment Variable in Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Select your site
3. Go to **Site settings** (or **Site configuration**)
4. Click **Environment variables** in the left sidebar
5. Click **Add a variable** or **Add variable**
6. Add your API key:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** Your actual Google Gemini API key (from AI Studio)
   - **Scopes:** Check all three boxes:
     - ✓ Production
     - ✓ Deploy previews
     - ✓ Branch deploys
7. Click **Create variable** or **Save**

### Step 3: Redeploy (Automatic or Manual)

**Option A - Automatic (Recommended):**
Once you push to GitHub, Netlify will automatically redeploy with the new environment variable.

**Option B - Manual:**
1. Go to **Deploys** tab in Netlify
2. Click **Trigger deploy** → **Deploy site**

### Step 4: Verify It Works

1. Wait for the deployment to complete (usually 1-2 minutes)
2. Visit your site URL
3. The app should now load properly!
4. Test the AI features (summary, field extraction) to confirm everything works

## Troubleshooting

### Still seeing a blank page?

1. **Check the browser console:**
   - Open DevTools (F12)
   - Look for any error messages
   - Common issues:
     - "Environment variable not found" → Make sure you added `GEMINI_API_KEY` in Netlify
     - "403/401 error" → Your API key might be invalid

2. **Check Netlify Function logs:**
   - Go to Netlify Dashboard → Functions tab
   - Click on `gemini-api`
   - Check the logs for errors

3. **Verify environment variable:**
   - Netlify Dashboard → Site settings → Environment variables
   - Make sure `GEMINI_API_KEY` is set for all scopes

4. **Clear cache and redeploy:**
   - Netlify Dashboard → Deploys → Options → Clear cache and deploy site

### API not responding?

- Check that your Google Gemini API key is valid
- Ensure billing is enabled in Google Cloud (if required)
- Check API quotas in Google AI Studio

## Important Notes

### Security
✅ **Good:** API key is now stored securely on Netlify's servers  
❌ **Bad:** Never commit `.env.local` file to GitHub (it's in `.gitignore`)

### Local Development
For local development, keep your `.env.local` file with:
```
API_KEY=your_api_key_here
```

The code will automatically use Netlify Functions when deployed and local env when developing.

### Model Names
Updated to use the latest Gemini models:
- `gemini-2.0-flash-exp` (was `gemini-3-flash-preview`)

If these models give errors, you can change them in `services/geminiService.ts`:
```typescript
// Line 54 and 108
'gemini-2.0-flash-exp'  // Change to: 'gemini-1.5-flash' if needed
```

## Need Help?

If you're still having issues:
1. Check the browser console for errors (F12)
2. Check Netlify function logs
3. Verify your API key is correct in Netlify environment variables
4. Try a fresh deployment with cleared cache

## Files Changed Summary

```
✅ NEW: netlify/functions/gemini-api.js (Secure API proxy)
✅ NEW: netlify.toml (Netlify configuration)
✅ MODIFIED: services/geminiService.ts (Use Netlify function)
✅ MODIFIED: package.json (Added node-fetch)
```

Good luck! 🚀
