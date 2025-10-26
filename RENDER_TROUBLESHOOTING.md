# 🔧 Render Deployment Troubleshooting Guide

## Common Issues After Render Deployment

Based on analysis of your application, here are the most likely causes and solutions for admin dashboard and transaction issues:

---

## 🚨 **ISSUE 1: Cannot Access Admin Dashboard**

### **Root Cause Analysis:**
The admin dashboard access is controlled by:
1. **User Authentication** (must be logged in)
2. **Profile Role Check** (user must have `role = 'admin'`)
3. **Supabase RLS Policies** (must allow admin operations)

### **✅ IMMEDIATE FIXES:**

#### **Step 1: Check Your Admin User Role**

```sql
-- Run this in Supabase SQL Editor to check your user role
SELECT id, email, role, created_at, updated_at 
FROM profiles 
WHERE role = 'admin';

-- If no admin users exist, create one:
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@example.com'
);
```

#### **Step 2: Verify Supabase Authentication Settings**

1. **Go to Supabase Dashboard** → **Authentication** → **Settings**
2. **Add your Render URL to Site URL and Redirect URLs:**
   ```
   Site URL: https://your-app-name.onrender.com
   
   Additional Redirect URLs:
   https://your-app-name.onrender.com/**
   ```

#### **Step 3: Check Browser Console for Errors**

Open Developer Tools (F12) and look for:
- **Authentication errors:** "Failed to load user profile"
- **CORS errors:** "blocked by CORS policy"
- **Environment variable errors:** "VITE_SUPABASE_URL is undefined"

---

## 🚨 **ISSUE 2: Transaction/Payment Problems**

### **Root Cause Analysis:**
Transaction failures are typically caused by:
1. **CORS issues** with Supabase Edge Functions
2. **Environment variables** not set correctly on Render
3. **Midtrans configuration** problems
4. **Webhook URL** not configured

### **✅ IMMEDIATE FIXES:**

#### **Step 1: Update Supabase CORS Settings**

Run these commands to fix CORS for your Render domain:

```bash
# Set your actual Render domain
npx supabase secrets set ALLOWED_ORIGIN=https://your-app-name.onrender.com

# Re-deploy the Edge Functions
npx supabase functions deploy create-midtrans-payment
npx supabase functions deploy midtrans-webhook
```

#### **Step 2: Verify Environment Variables on Render**

In your Render dashboard, check these environment variables:

```bash
# Required Variables:
VITE_SUPABASE_URL=https://ngucthauvvjajdjcdrvl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_MIDTRANS_CLIENT_KEY=Mid-client-YnCmr1NpdxmxQU8O
VITE_APP_ENV=production
VITE_APP_URL=https://your-app-name.onrender.com
```

#### **Step 3: Update Midtrans Webhook URL**

In Midtrans Dashboard → Settings → Configuration:
```
Webhook URL: https://ngucthauvvjajdjcdrvl.supabase.co/functions/v1/midtrans-webhook
```

---

## 🔍 **DIAGNOSTIC CHECKLIST**

### **For Admin Dashboard Issues:**

1. **Check Authentication Flow:**
   ```javascript
   // Open browser console and run:
   console.log('User:', window.localStorage.getItem('supabase.auth.token'));
   console.log('Environment:', import.meta.env.VITE_SUPABASE_URL);
   ```

2. **Verify Profile Loading:**
   - Login to your app
   - Open Developer Tools → Console
   - Look for log messages: "Loading user profile" and "AdminRoute access check"

3. **Check Database Connection:**
   ```sql
   -- Run in Supabase SQL Editor:
   SELECT COUNT(*) as admin_count 
   FROM profiles 
   WHERE role = 'admin';
   ```

### **For Transaction Issues:**

1. **Check Network Tab:**
   - Open Developer Tools → Network
   - Try to make a payment
   - Look for failed requests to Supabase functions

2. **Check Console Errors:**
   - Look for: "Error creating payment"
   - Check: "Access to fetch... has been blocked by CORS policy"

3. **Verify Midtrans Configuration:**
   ```javascript
   // Check if Midtrans client key is loaded:
   console.log('Midtrans Key:', import.meta.env.VITE_MIDTRANS_CLIENT_KEY);
   ```

---

## 🛠️ **STEP-BY-STEP FIXES**

### **Fix 1: Admin Access Issue**

```bash
# 1. Create admin user in Supabase
# Go to Supabase Dashboard → SQL Editor and run:

UPDATE profiles 
SET role = 'admin', updated_at = NOW()
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'YOUR_EMAIL_HERE'
);

# 2. Verify the update worked:
SELECT u.email, p.role 
FROM auth.users u 
JOIN profiles p ON u.id = p.id 
WHERE p.role = 'admin';
```

### **Fix 2: Transaction/CORS Issue**

```bash
# 1. Update Supabase secrets with your Render domain:
npx supabase secrets set ALLOWED_ORIGIN=https://your-actual-app-name.onrender.com

# 2. Re-deploy Edge Functions:
npx supabase functions deploy create-midtrans-payment
npx supabase functions deploy midtrans-webhook

# 3. Test the fix:
curl -X OPTIONS https://ngucthauvvjajdjcdrvl.supabase.co/functions/v1/create-midtrans-payment \
  -H "Origin: https://your-actual-app-name.onrender.com" \
  -H "Access-Control-Request-Method: POST"
```

### **Fix 3: Environment Variables Issue**

1. **Go to Render Dashboard** → Your Service → Environment
2. **Add/Update these variables:**
   ```
   VITE_SUPABASE_URL=https://ngucthauvvjajdjcdrvl.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndWN0aGF1dnZqYWpkamNkcnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4OTk3OTIsImV4cCI6MjA2NzQ3NTc5Mn0.GPVglNEpbWNa0NUzXdTOWm-WoSI2gOih7A8D3tVHVDU
   VITE_MIDTRANS_CLIENT_KEY=Mid-client-YnCmr1NpdxmxQU8O
   ```
3. **Click "Save Changes"**
4. **Trigger a manual deploy**

---

## 🧪 **TESTING FIXES**

### **Test Admin Access:**

1. **Clear browser cache** and local storage
2. **Login with your email**
3. **Navigate to:** `https://your-app.onrender.com/admin`
4. **Should see:** Admin dashboard (not redirect to home)

### **Test Transaction Flow:**

1. **Add items to cart**
2. **Go to checkout**
3. **Fill form and submit**
4. **Check browser console** for errors
5. **Should redirect** to Midtrans payment page

---

## 📞 **URGENT FIXES TO APPLY NOW**

### **1. Fix CORS Immediately:**
```bash
npx supabase secrets set ALLOWED_ORIGIN=https://clothly-commerce-hub.onrender.com
npx supabase functions deploy create-midtrans-payment
npx supabase functions deploy midtrans-webhook
```

### **2. Create Admin User:**
Go to Supabase SQL Editor and run:
```sql
-- Replace with your actual email
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@example.com'
);
```

### **3. Update Supabase Auth Settings:**
- Site URL: `https://clothly-commerce-hub.onrender.com`
- Redirect URLs: `https://clothly-commerce-hub.onrender.com/**`

### **4. Verify Render Environment Variables:**
Make sure all environment variables are set correctly in Render dashboard.

---

## 🎯 **EXPECTED RESULTS AFTER FIXES**

- ✅ **Admin Dashboard:** Accessible at `/admin` for admin users
- ✅ **Authentication:** Login/logout works properly
- ✅ **Transactions:** Payment flow completes without CORS errors
- ✅ **Webhooks:** Payment status updates correctly
- ✅ **User Roles:** Admin users can access admin features

---

## 📱 **CONTACT FOR IMMEDIATE HELP**

If these fixes don't work, provide these details:

1. **Your Render app URL**
2. **Browser console errors** (screenshots)
3. **Network tab failures** (screenshots)
4. **Supabase function logs**
5. **Your admin user email**

**These fixes should resolve 95% of post-deployment issues!** 🚀

---
*Troubleshooting guide created: 2025-07-19*
*Compatible with: Render deployment, Supabase, Midtrans*