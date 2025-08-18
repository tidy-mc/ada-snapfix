# 🚀 Full Scan Deployment Guide

## Overview
This guide will help you deploy a **Playwright Browser Service** and configure your **Vercel Pro** application to perform full accessibility scans on real domains.

## 🎯 What We're Building

1. **External Browser Service** - Runs on Railway/Render/Fly.io
2. **Vercel Pro Configuration** - Enhanced function limits
3. **Full Scan Integration** - Real Playwright browser automation

## 📋 Prerequisites

- [ ] Vercel Pro account ($20/month)
- [ ] Railway/Render/Fly.io account (free tier available)
- [ ] Your domain for testing

## 🛠️ Step 1: Deploy Browser Service

### Option A: Railway (Recommended)

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Navigate to browser service directory**:
   ```bash
   cd browser-service
   ```

3. **Login to Railway**:
   ```bash
   railway login
   ```

4. **Initialize and deploy**:
   ```bash
   railway init
   railway up
   ```

5. **Get your domain**:
   ```bash
   railway domain
   ```
   Save this URL: `https://your-service-name.railway.app`

### Option B: Render

1. **Push browser-service to GitHub**
2. **Connect to Render**
3. **Create new Web Service**
4. **Configure**:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. **Deploy**

### Option C: Fly.io

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login and deploy**:
   ```bash
   fly auth login
   fly launch
   fly deploy
   ```

## 🔧 Step 2: Configure Vercel Pro

### Update vercel.json (Already done)
Your `vercel.json` is already configured with Pro settings:
```json
{
  "functions": {
    "app/api/scan/route.ts": {
      "maxDuration": 60,
      "memory": 3008
    }
  }
}
```

### Add Environment Variable

1. **Go to Vercel Dashboard**
2. **Select your project**
3. **Go to Settings → Environment Variables**
4. **Add new variable**:
   - **Name**: `PLAYWRIGHT_BROWSER_WS_ENDPOINT`
   - **Value**: `wss://your-service-name.railway.app/browser`
   - **Environment**: Production, Preview, Development

## 🧪 Step 3: Test Your Setup

### Test Browser Service
```bash
curl https://your-service-name.railway.app/health
```
Should return: `{"status":"healthy","service":"playwright-browser-service"}`

### Test Full Scan
1. **Deploy your app to Vercel**
2. **Try scanning a real domain** (e.g., `https://example.com`)
3. **Check logs** - you should see:
   ```
   Connecting to external browser service...
   Connected to external browser service successfully
   ```

## 🔍 Step 4: Monitor and Debug

### Check Vercel Function Logs
1. **Vercel Dashboard → Functions**
2. **Select your scan function**
3. **View real-time logs**

### Check Browser Service Logs
1. **Railway Dashboard → Your Service**
2. **View deployment logs**

## 🎯 Expected Results

### ✅ Success Scenario
```
data: {"type":"log","message":"Starting enhanced scan for URL: https://example.com"}
data: {"type":"log","message":"Connecting to external browser service..."}
data: {"type":"log","message":"Connected to external browser service successfully"}
data: {"type":"log","message":"Navigating to URL..."}
data: {"type":"log","message":"Page loaded successfully"}
data: {"type":"log","message":"Injecting axe-core..."}
data: {"type":"log","message":"Running accessibility scan..."}
data: {"type":"log","message":"Scan completed successfully"}
```

### ❌ Fallback Scenario (if external service fails)
```
data: {"type":"log","message":"External browser service failed, trying local Playwright..."}
data: {"type":"log","message":"Standard launch failed, trying minimal config..."}
data: {"type":"log","message":"Minimal launch failed, trying with executable path..."}
data: {"type":"error","message":"All browser launch strategies failed, falling back to simple scan..."}
data: {"type":"log","message":"Initiating simple scan fallback..."}
data: {"type":"log","message":"Simple scan completed successfully"}
```

## 💰 Cost Breakdown

### Monthly Costs
- **Vercel Pro**: $20/month
- **Railway**: $5/month (or free tier)
- **Total**: ~$25/month

### Free Alternatives
- **Render**: Free tier available
- **Fly.io**: Free tier available
- **Railway**: Free tier available

## 🚨 Troubleshooting

### Browser Service Issues
1. **Check if service is running**: `curl https://your-service.railway.app/health`
2. **Check Railway logs**: Dashboard → Your Service → Logs
3. **Restart service**: `railway restart`

### Vercel Issues
1. **Check environment variables**: Dashboard → Settings → Environment Variables
2. **Check function logs**: Dashboard → Functions → Your Function
3. **Verify Pro plan**: Dashboard → Settings → Plan

### Connection Issues
1. **Verify WebSocket URL**: Should start with `wss://`
2. **Check CORS**: Browser service should allow your Vercel domain
3. **Test connectivity**: Try connecting manually

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Full scans complete successfully
- ✅ No "browser launch failed" messages
- ✅ Real-time logs show external service connection
- ✅ Accessibility results include axe-core findings
- ✅ Scan times are reasonable (30-60 seconds)

## 🔄 Next Steps

1. **Monitor performance** - Track scan times and success rates
2. **Scale if needed** - Upgrade browser service resources
3. **Add more domains** - Test with various websites
4. **Optimize** - Fine-tune browser configurations

---

**Need help?** Check the logs first, then reach out with specific error messages!
