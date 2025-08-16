# Accessibility Scanner API

A comprehensive web accessibility scanning system with three modes and automatic fallback, optimized for Vercel deployment.

## 🚀 Features

- **Three Scan Modes**: Quick, External, and Simple scanning options
- **Automatic Fallback**: Always returns results, even if primary modes fail
- **Vercel Optimized**: Works reliably on Vercel serverless functions
- **JavaScript Support**: Full browser automation with axe-core integration
- **External Services**: Support for Browserless.io and Puppeteer Cloud

## 📋 Scan Modes

### 1. Quick Scan (Default)
- **Technology**: puppeteer-core + @sparticuz/chromium + axe-core
- **Features**: JavaScript execution, dynamic content analysis
- **Timeout**: 15 seconds
- **Vercel Compatible**: ✅ Yes
- **Fallback**: External Scan

### 2. External Scan (Optional)
- **Technology**: Browserless.io or Puppeteer Cloud + axe-core
- **Features**: Full browser automation via external service
- **Requirements**: API key configuration
- **Fallback**: Simple Scan

### 3. Simple Scan (Guaranteed)
- **Technology**: jsdom + axe-core
- **Features**: Static HTML analysis, no JavaScript execution
- **Reliability**: Always available
- **Fallback**: None (last resort)

## 🔄 Fallback Logic

The main `/api/scan` endpoint implements intelligent fallback:

```
Quick Scan → External Scan (if configured) → Simple Scan
```

1. **Quick Scan** (Default)
   - Uses puppeteer-core + @sparticuz/chromium
   - 15-second timeout
   - Falls back to External if browser launch fails

2. **External Scan** (Optional)
   - Only tried if BROWSERLESS_TOKEN or PUPPETEER_CLOUD_TOKEN is configured
   - Uses external browser service
   - Falls back to Simple if service unavailable

3. **Simple Scan** (Final Fallback)
   - Static HTML analysis with jsdom + axe-core
   - Always available
   - No fallback (last resort)

## 🛠️ Installation

```bash
npm install
```

### Dependencies

- `puppeteer-core`: Lightweight browser automation
- `@sparticuz/chromium`: Vercel-compatible Chromium
- `axe-core`: Accessibility testing engine
- `jsdom`: HTML parsing for static analysis

## ⚙️ Configuration

### Environment Variables

```bash
# Browserless.io (Optional)
BROWSERLESS_TOKEN=your_browserless_api_key
BROWSERLESS_URL=https://chrome.browserless.io

# Puppeteer Cloud (Optional)
PUPPETEER_CLOUD_TOKEN=your_puppeteer_cloud_api_key
PUPPETEER_CLOUD_URL=https://api.puppeteer.cloud
```

### Vercel Configuration

The `vercel.json` file is pre-configured with optimal settings:

```json
{
  "functions": {
    "app/api/scan/route.ts": {
      "maxDuration": 60,
      "memory": 3008
    },
    "app/api/scan/quick/route.ts": {
      "maxDuration": 30,
      "memory": 3008
    },
    "app/api/scan/external/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    },
    "app/api/scan/simple/route.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

## 📡 API Endpoints

### Main Endpoint (Recommended)

```bash
curl -X POST https://your-app.vercel.app/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Individual Mode Endpoints

#### Quick Scan Only
```bash
curl -X POST https://your-app.vercel.app/api/scan/quick \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

#### External Scan Only
```bash
curl -X POST https://your-app.vercel.app/api/scan/external \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "serviceType": "browserless"}'
```

#### Simple Scan Only
```bash
curl -X POST https://your-app.vercel.app/api/scan/simple \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## 📊 Response Format

All endpoints return consistent JSON format:

```json
{
  "mode": "quick|external|simple",
  "success": true,
  "issues": [
    {
      "selector": "body > div > img",
      "ruleId": "image-alt",
      "wcag": ["wcag2a", "wcag111"],
      "severity": "critical",
      "message": "Images must have alternate text",
      "source": "quick|external|simple"
    }
  ],
  "axe": { ... },
  "message": "Quick scan completed with 5 accessibility issues found",
  "next": "Review and fix critical issues first, then test with screen readers"
}
```

## 🔧 Development

### Local Development

```bash
npm run dev
```

### Testing

```bash
# Test main endpoint
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Test individual modes
curl -X POST http://localhost:3000/api/scan/quick \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Set Environment Variables**: Configure API keys if using external services
3. **Deploy**: Vercel will automatically build and deploy

### Environment Variables Setup

In your Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add your API keys:
   - `BROWSERLESS_TOKEN` (if using Browserless.io)
   - `PUPPETEER_CLOUD_TOKEN` (if using Puppeteer Cloud)

## 📈 Performance

### Memory Usage
- **Quick Scan**: 3008MB (browser automation)
- **External Scan**: 1024MB (API calls only)
- **Simple Scan**: 1024MB (HTML processing)

### Timeouts
- **Quick Scan**: 15 seconds
- **External Scan**: 30 seconds
- **Simple Scan**: 15 seconds

## 🔍 Troubleshooting

### Common Issues

1. **Quick Scan Fails**
   - Check Vercel logs for browser launch errors
   - Verify @sparticuz/chromium is properly installed
   - Check memory allocation in vercel.json

2. **External Scan Fails**
   - Verify API keys are set correctly
   - Check external service status
   - Review network connectivity

3. **Simple Scan Fails**
   - Check URL accessibility
   - Verify HTML content is valid
   - Review fetch timeout settings

### Error Responses

```json
{
  "error": "Quick scan failed",
  "details": "Browser launch timeout",
  "type": "browser_error",
  "fallback": "external"
}
```

## 📚 External Services

### Browserless.io
- **Website**: https://browserless.io
- **Features**: Chrome automation, screenshot capture
- **Pricing**: Free tier available

### Puppeteer Cloud
- **Website**: https://puppeteer.cloud
- **Features**: Puppeteer automation, screenshot capture
- **Pricing**: Free tier available

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Check the troubleshooting section
- Review Vercel function logs
- Open an issue on GitHub
