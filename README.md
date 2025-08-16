# Ada SnapFix - Accessibility Scanner

A Next.js-based accessibility testing tool that scans websites for WCAG compliance issues and provides AI-powered fix suggestions.

## Features

- **Website Scanning**: Comprehensive accessibility testing using axe-core
- **PDF Reports**: Generate detailed accessibility reports in PDF format
- **AI Suggestions**: Get AI-powered fix suggestions for accessibility issues
- **Multiple Scan Modes**: Quick, external, and simple scanning options
- **Real-time Results**: View scan results with severity classifications

## Getting Started

First, install dependencies:

```bash
npm install
```

Set up environment variables:

```bash
# Create .env.local file
OPENAI_API_KEY=your_openai_api_key_here
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Endpoints

### Scan Website
```bash
POST /api/scan
Content-Type: application/json

{
  "url": "https://example.com"
}
```

### Generate PDF Report
```bash
POST /api/report/pdf
Content-Type: application/json

# Option 1: Provide scan data directly
{
  "scan": {
    "url": "https://example.com",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "totalIssues": 5,
    "issues": [...],
    "mode": "quick"
  }
}

# Option 2: Provide URL to scan and generate PDF
{
  "url": "https://example.com"
}
```

### Get AI Suggestions
```bash
POST /api/suggest
Content-Type: application/json

{
  "issue": {
    "ruleId": "image-alt",
    "message": "Images must have alternate text",
    "wcag": "WCAG 2.1 - 1.1.1",
    "selector": "body > img",
    "htmlSnippet": "<img src='logo.png'>"
  },
  "tier": "free"  // or "paid"
}
```

## AI Suggestions Tiers

### Free Tier
- **Rate Limit**: 10 requests per minute
- **Response**: One-line fix summary
- **Cost**: Minimal token usage

### Paid Tier
- **Rate Limit**: 30 requests per minute
- **Response**: Detailed summary + code examples + WCAG notes
- **Cost**: Higher token usage for comprehensive suggestions

## PDF Reports

PDF reports include:
- Site URL and scan timestamp
- Overall accessibility score (0-100)
- Severity breakdown (Critical, Serious, Moderate, Minor)
- Detailed issue table with WCAG references
- Generated using puppeteer-core + @sparticuz/chromium (Vercel-safe)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for AI suggestions | Yes |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | Chromium path for local development | No |

## Dependencies

- **puppeteer-core**: PDF generation (lightweight)
- **@sparticuz/chromium**: Chromium for Vercel deployment
- **zod**: Input validation
- **openai**: AI suggestions
- **axe-core**: Accessibility testing

## Deployment

### Vercel Configuration

The project includes optimized Vercel configuration:

```json
{
  "functions": {
    "app/api/scan/route.ts": {
      "maxDuration": 60,
      "memory": 3008
    },
    "app/api/report/pdf/route.ts": {
      "maxDuration": 20,
      "memory": 1024
    },
    "app/api/suggest/route.ts": {
      "maxDuration": 15,
      "memory": 512
    }
  }
}
```

### Environment Setup

1. Add `OPENAI_API_KEY` to your Vercel project environment variables
2. Deploy using Vercel CLI or GitHub integration
3. The PDF generation uses @sparticuz/chromium which is safe for Vercel's serverless environment

## Usage Examples

### cURL Examples

**Generate PDF Report:**
```bash
curl -X POST https://your-domain.vercel.app/api/report/pdf \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}' \
  --output report.pdf
```

**Get AI Suggestion:**
```bash
curl -X POST https://your-domain.vercel.app/api/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "issue": {
      "ruleId": "image-alt",
      "message": "Images must have alternate text",
      "wcag": "WCAG 2.1 - 1.1.1",
      "selector": "body > img"
    },
    "tier": "free"
  }'
```

## Error Handling

The API includes comprehensive error handling:

- **Rate Limiting**: Automatic rate limiting with clear error messages
- **Input Validation**: Zod schema validation with helpful error messages
- **Service Errors**: Graceful handling of OpenAI API and PDF generation errors
- **Size Limits**: PDF generation bails out if HTML content is too large

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
