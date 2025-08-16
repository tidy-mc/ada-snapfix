# Accessibility Scanner API Documentation

This API provides a comprehensive accessibility scanning system with three modes and automatic fallback, optimized for Vercel deployment.

## API Endpoints

### Main Endpoint: `/api/scan` ⭐ **Recommended**
**Status**: Fully compatible with Vercel with automatic fallback

- **Method**: POST
- **Body**: `{ "url": "https://example.com" }`
- **Features**: 
  - Automatic fallback between scan modes
  - Always returns results (unless all modes fail)
  - Optimized for Vercel deployment

**Fallback Flow**: `Quick → External (if configured) → Simple`

### Individual Mode Endpoints

#### 1. Quick Scan (`/api/scan/quick`)
**Status**: Vercel compatible with puppeteer-core + @sparticuz/chromium

- **Method**: POST
- **Body**: `{ "url": "https://example.com" }`
- **Features**:
  - JavaScript execution
  - Dynamic content analysis
  - Full axe-core analysis
  - 15-second timeout
  - Vercel optimized

#### 2. External Scan (`/api/scan/external`)
**Status**: Requires external service configuration

- **Method**: POST
- **Body**: `{ "url": "https://example.com", "serviceType": "browserless" }`
- **Features**:
  - JavaScript execution
  - Dynamic content analysis
  - Full axe-core analysis
  - External browser service

#### 3. Simple Scan (`/api/scan/simple`)
**Status**: Static HTML analysis with jsdom + axe-core

- **Method**: POST
- **Body**: `{ "url": "https://example.com" }`
- **Features**:
  - Static HTML analysis
  - axe-core integration
  - Fast and reliable
  - No JavaScript execution

## Response Format

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

## Usage Examples

### Main Endpoint (Recommended)
```bash
curl -X POST https://your-app.vercel.app/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Individual Modes
```bash
# Quick scan only
curl -X POST https://your-app.vercel.app/api/scan/quick \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# External scan with specific service
curl -X POST https://your-app.vercel.app/api/scan/external \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "serviceType": "browserless"}'

# Simple scan only
curl -X POST https://your-app.vercel.app/api/scan/simple \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## Environment Variables

### For External Browser Services
```bash
# Browserless.io
BROWSERLESS_TOKEN=your_browserless_api_key
BROWSERLESS_URL=https://chrome.browserless.io

# Puppeteer Cloud
PUPPETEER_CLOUD_TOKEN=your_puppeteer_cloud_api_key
PUPPETEER_CLOUD_URL=https://api.puppeteer.cloud
```

## Scan Modes Comparison

| Feature | Quick Scan | External Scan | Simple Scan |
|---------|------------|---------------|-------------|
| JavaScript Execution | ✅ | ✅ | ❌ |
| Dynamic Content | ✅ | ✅ | ❌ |
| Color Contrast | ✅ | ✅ | ✅ |
| Form Validation | ✅ | ✅ | ✅ |
| ARIA Analysis | ✅ | ✅ | ✅ |
| Vercel Compatible | ✅ | ✅ | ✅ |
| External Dependencies | ❌ | ✅ | ❌ |
| Setup Required | ❌ | API Keys | ❌ |
| Timeout | 15s | 30s | 15s |
| Fallback | External | Simple | None |

## Fallback Logic

The main `/api/scan` endpoint implements intelligent fallback:

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

## Error Handling

### Individual Mode Errors
Each mode returns specific error information:
```json
{
  "error": "Quick scan failed",
  "details": "Browser launch timeout",
  "type": "browser_error",
  "fallback": "external"
}
```

### All Modes Failed
```json
{
  "error": "All scan modes failed",
  "details": "Quick, external, and simple scans all failed to complete",
  "type": "all_modes_failed",
  "suggestion": "Please check the URL and try again later"
}
```

## Best Practices

1. **Use the main endpoint** (`/api/scan`) for production applications
2. **Configure external services** for enhanced reliability
3. **Handle fallback gracefully** in your applications
4. **Monitor scan modes** to understand which mode is being used
5. **Set appropriate timeouts** based on your requirements

## Rate Limiting

- **Quick Scan**: Limited by Vercel function timeout (15s)
- **External Scan**: Subject to external service limits
- **Simple Scan**: No rate limits (HTTP fetch only)

## Deployment Notes

### Vercel Configuration
The API is optimized for Vercel with:
- `@sparticuz/chromium` for browser compatibility
- `puppeteer-core` for lightweight browser automation
- `jsdom` for static HTML analysis
- Automatic fallback between modes

### Memory Allocation
- Quick Scan: 3008MB (browser automation)
- External Scan: 1024MB (API calls only)
- Simple Scan: 1024MB (HTML processing)

## Support

For issues with:
- **Quick Scan**: Check Vercel logs for browser launch errors
- **External Scan**: Verify API keys and service status
- **Simple Scan**: Check URL accessibility and HTML content
- **General**: Review fallback flow and error messages
