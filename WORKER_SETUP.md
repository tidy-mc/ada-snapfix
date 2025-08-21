# 🔗 Worker Integration Setup Guide

This guide will help you set up your Next.js app to use the Ada SnapFix Worker for fullscan functionality.

## 🚀 Quick Setup

### 1. Create Environment File

Create a `.env.local` file in your Next.js app root:

```bash
# Copy the example file
cp env.example .env.local
```

Edit `.env.local` with your worker URLs:

```bash
# For local development (worker running on localhost:3000)
WORKER_SCAN_URL=http://localhost:3000/api/scan
WORKER_SCAN_SYNC_URL=http://localhost:3000/api/scan-sync

# For production (worker running on your VPS)
# WORKER_SCAN_URL=https://your-worker-vps.com/api/scan
# WORKER_SCAN_SYNC_URL=https://your-worker-vps.com/api/scan-sync
```

### 2. Start the Worker

In the worker directory:
```bash
cd ada-snapfix-worker
npm start
```

### 3. Start Your Next.js App

In your Next.js app directory:
```bash
cd app
npm run dev
```

### 4. Test the Integration

```bash
# Test the integration
node test-worker-integration.js
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `WORKER_SCAN_URL` | Worker streaming scan endpoint | `http://localhost:3000/api/scan` |
| `WORKER_SCAN_SYNC_URL` | Worker sync scan endpoint | `http://localhost:3000/api/scan-sync` |

### Vercel Deployment

For production deployment on Vercel, add these environment variables in your Vercel dashboard:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the worker URLs:
   - `WORKER_SCAN_URL`: `https://your-worker-vps.com/api/scan`
   - `WORKER_SCAN_SYNC_URL`: `https://your-worker-vps.com/api/scan-sync`

## 🧪 Testing

### Manual Testing

1. **Start both services**:
   ```bash
   # Terminal 1 - Worker
   cd ada-snapfix-worker && npm start
   
   # Terminal 2 - Next.js App
   cd app && npm run dev
   ```

2. **Test via browser**:
   - Open `http://localhost:3001` (or your Next.js port)
   - Enter a URL and start a fullscan
   - Check the logs to see "Starting worker scan"

3. **Test via API**:
   ```bash
   curl -X POST http://localhost:3001/api/scan \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'
   ```

### Automated Testing

Run the integration test:
```bash
cd app
node test-worker-integration.js
```

## 🔄 How It Works

### Flow Diagram

```
Next.js App (Vercel) → Worker (VPS) → Fullscan Results
     ↓
1. User requests scan
2. Next.js checks worker health
3. If healthy: forwards request to worker
4. If unhealthy: falls back to simple scan
5. Returns results to user
```

### Fallback Strategy

The integration includes automatic fallback:

1. **Primary**: Use worker for fullscan
2. **Fallback**: Use simple scan if worker is unavailable
3. **Error Handling**: Graceful degradation with user feedback

## 🚨 Troubleshooting

### Common Issues

1. **Worker Not Responding**
   - Check if worker is running: `netstat -an | findstr :3000`
   - Verify worker health: `curl http://localhost:3000/health`

2. **Environment Variables**
   - Ensure `.env.local` exists and has correct URLs
   - Check for typos in URLs

3. **CORS Issues**
   - Worker CORS is configured for all origins
   - If issues persist, check network connectivity

4. **Port Conflicts**
   - Worker runs on port 3000
   - Next.js typically runs on port 3001
   - Ensure no conflicts

### Debug Steps

1. **Check Worker Status**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check Next.js Environment**:
   ```bash
   # Add this to your Next.js app temporarily
   console.log('Worker URLs:', {
     scan: process.env.WORKER_SCAN_URL,
     sync: process.env.WORKER_SCAN_SYNC_URL
   });
   ```

3. **Test Direct Worker Call**:
   ```bash
   curl -X POST http://localhost:3000/api/scan-sync \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'
   ```

## 📊 Monitoring

### Health Checks

The integration automatically checks worker health before each scan:

```typescript
const isHealthy = await workerIntegration.checkHealth();
if (!isHealthy) {
  // Fall back to simple scan
}
```

### Logs

Look for these log messages:
- ✅ `"Starting worker scan for URL: ..."`
- ✅ `"Worker scan completed successfully"`
- ⚠️ `"Worker is not healthy, falling back to simple scan..."`
- ❌ `"Worker scan error: ..."`

## 🎉 Success Indicators

You'll know it's working when:

- ✅ Fullscans complete successfully
- ✅ Logs show "Starting worker scan"
- ✅ No Playwright errors in Next.js
- ✅ Fallback works when worker is down
- ✅ Scan performance is improved

## 🔄 Production Deployment

### 1. Deploy Worker to VPS

Follow the `DEPLOYMENT_GUIDE.md` in the worker directory.

### 2. Update Environment Variables

Update your `.env.local` and Vercel environment variables with your worker VPS URLs.

### 3. Test Production

Test the integration with your production worker before going live.

---

**Your Next.js app is now successfully integrated with the Ada SnapFix Worker!** 🚀
