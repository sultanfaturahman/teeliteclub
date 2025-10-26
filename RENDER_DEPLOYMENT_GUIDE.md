# 🚀 Render Deployment Guide - Clothly Commerce Hub

## Overview
This guide helps you deploy your Clothly Commerce Hub e-commerce application to Render.com using the included `render.yaml` configuration.

---

## 📋 Prerequisites

### 1. Render Account Setup
- Create account at [render.com](https://render.com)
- Connect your GitHub account
- Ensure repository access permissions

### 2. Required Credentials
- ✅ Supabase project URL and anon key
- ✅ Midtrans production client key (from previous setup)
- ✅ Domain name (will be `yourapp.onrender.com`)

---

## 🔧 Step-by-Step Deployment

### Step 1: Connect Repository
1. **Login to Render Dashboard**
2. **Click "New +"** → **"Static Site"**
3. **Connect GitHub Repository:** `clothly-commerce-hub`
4. **Select Branch:** `main`

### Step 2: Configure Build Settings

Render will automatically detect the `render.yaml` file, but verify these settings:

```yaml
# Auto-configured from render.yaml
Build Command: npm ci && npm run build
Publish Directory: dist
Branch: main
Auto-Deploy: Yes
```

### Step 3: Set Environment Variables

In the Render dashboard, go to **Environment** tab and add these variables:

#### **Required Environment Variables:**

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://ngucthauvvjajdjcdrvl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndWN0aGF1dnZqYWpkamNkcnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4OTk3OTIsImV4cCI6MjA2NzQ3NTc5Mn0.GPVglNEpbWNa0NUzXdTOWm-WoSI2gOih7A8D3tVHVDU

# Midtrans Configuration (Use your production keys)
VITE_MIDTRANS_CLIENT_KEY=Mid-client-YOUR_PRODUCTION_KEY

# App Configuration (Auto-set from render.yaml)
VITE_APP_ENV=production
VITE_APP_URL=https://YOUR_APP_NAME.onrender.com
VITE_ALLOWED_ORIGINS=https://YOUR_APP_NAME.onrender.com
```

#### **Optional Environment Variables:**

```bash
# Analytics (if you have Google Analytics)
VITE_GA_TRACKING_ID=your_google_analytics_id

# Error Tracking (if you have Sentry)
VITE_SENTRY_DSN=your_sentry_dsn
```

### Step 4: Update Supabase Settings

Update your Supabase authentication settings:

1. **Go to Supabase Dashboard** → **Authentication** → **Settings**
2. **Add Render URL to redirect URLs:**
   ```
   https://YOUR_APP_NAME.onrender.com/**
   ```

### Step 5: Update Midtrans Webhook

In your Midtrans dashboard, update webhook URL:
```
https://ngucthauvvjajdjcdrvl.supabase.co/functions/v1/midtrans-webhook
```

---

## 📊 Build Configuration Details

### Included in `render.yaml`:

#### **🔧 Build Settings:**
- ✅ **Build Command:** `npm ci && npm run build`
- ✅ **Output Directory:** `./dist`
- ✅ **Node.js Environment:** Latest stable
- ✅ **Auto-deploy:** Enabled on main branch

#### **🛡️ Security Headers:**
- ✅ **CSP:** Content Security Policy configured for Midtrans
- ✅ **XSS Protection:** X-XSS-Protection enabled
- ✅ **Frame Options:** X-Frame-Options set to DENY
- ✅ **Content Type:** X-Content-Type-Options nosniff

#### **⚡ Performance Optimization:**
- ✅ **Asset Caching:** 1-year cache for static assets
- ✅ **Immutable Assets:** JS/CSS files cached permanently
- ✅ **SPA Routing:** All routes serve index.html

#### **🔄 Auto-Deploy Triggers:**
Deploys automatically when changes are pushed to:
- `src/**` (source code)
- `package.json` (dependencies)
- `vite.config.ts` (build config)
- `index.html` (entry point)

---

## 🚀 Deployment Process

### 1. Push Configuration
```bash
# Add render.yaml to repository
git add render.yaml RENDER_DEPLOYMENT_GUIDE.md
git commit -m "Add Render deployment configuration"
git push origin main
```

### 2. Deploy to Render
1. **Click "Create Static Site"** in Render dashboard
2. **Wait for build** (approximately 2-3 minutes)
3. **Check build logs** for any errors
4. **Visit your site** at `https://yourapp.onrender.com`

### 3. Verify Deployment
- ✅ **Site loads correctly**
- ✅ **Authentication works**
- ✅ **Product catalog displays**
- ✅ **Payment flow functional**
- ✅ **Admin panel accessible**

---

## 🔍 Troubleshooting

### Common Issues and Solutions:

#### **Build Failures:**
```bash
# If build fails, check these:
- Node.js version compatibility
- Package dependencies
- Environment variable syntax
```

#### **Runtime Errors:**
```bash
# Check browser console for:
- CORS errors (check Supabase settings)
- Environment variable missing
- API endpoint connectivity
```

#### **Payment Issues:**
```bash
# Verify:
- Midtrans production keys are correct
- Webhook URL is properly configured
- CORS allows your Render domain
```

### Debug Commands:
```bash
# Test build locally
npm run build

# Preview production build
npm run preview

# Check environment variables
echo $VITE_SUPABASE_URL
```

---

## 📈 Performance Monitoring

### Built-in Optimizations:
- ✅ **Code Splitting:** Automated by Vite
- ✅ **Asset Compression:** Gzip enabled by Render
- ✅ **CDN Distribution:** Global CDN by Render
- ✅ **Caching Strategy:** Optimal cache headers set

### Expected Performance:
- 🎯 **Build Time:** 2-3 minutes
- 🎯 **First Load:** <3 seconds
- 🎯 **Subsequent Loads:** <1 second
- 🎯 **Bundle Size:** ~650KB optimized

---

## 🔄 Updates and Maintenance

### Automatic Updates:
- ✅ **Code Changes:** Auto-deploy on git push
- ✅ **Dependencies:** Rebuild when package.json changes
- ✅ **Configuration:** Update via render.yaml

### Manual Updates:
```bash
# Force rebuild in Render dashboard
1. Go to your service dashboard
2. Click "Manual Deploy" 
3. Select "Clear build cache" if needed
```

---

## 💰 Render Pricing (as of 2025)

### Static Site Hosting:
- ✅ **Free Tier:** Available with limitations
- ✅ **Paid Plans:** Starting at $7/month
- ✅ **Custom Domains:** Included in paid plans
- ✅ **SSL Certificates:** Free with all plans

### Recommended Plan:
- **Starter Plan ($7/month)** for production use
- Includes custom domain and better performance

---

## 🎯 Final Checklist

Before going live:

- [ ] ✅ Repository connected to Render
- [ ] ✅ Environment variables configured
- [ ] ✅ Build succeeds without errors
- [ ] ✅ Site loads at Render URL
- [ ] ✅ Authentication flow tested
- [ ] ✅ Payment processing verified
- [ ] ✅ Admin functionality working
- [ ] ✅ Mobile responsiveness checked
- [ ] ✅ SSL certificate active
- [ ] ✅ Custom domain configured (if applicable)

---

## 🔗 Useful Links

- **Render Dashboard:** https://dashboard.render.com
- **Render Documentation:** https://render.com/docs
- **Your App URL:** https://YOUR_APP_NAME.onrender.com
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Midtrans Dashboard:** https://dashboard.midtrans.com

---

**Your Clothly Commerce Hub is now ready for production deployment on Render! 🚀**

---
*Guide created: 2025-07-19*  
*Compatible with: Render Static Sites, Vite 5.x, React 18*