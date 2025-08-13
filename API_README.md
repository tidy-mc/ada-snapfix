# Scan API Documentation

## Endpoint: `/api/scan`

This API route performs accessibility scanning on websites using Playwright and axe-core.

### Method: POST

#### Request Body
```json
{
  "url": "https://example.com"
}
```

#### Response Format
```json
{
  "url": "https://example.com",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "totalIssues": 5,
  "issues": [
    {
      "selector": "body > div > img",
      "ruleId": "image-alt",
      "wcag": ["wcag2a", "wcag111"],
      "severity": "critical",
      "message": "Images must have alternate text",
      "source": "axe"
    }
  ],
  "summary": {
    "axe": 5,
    "pa11y": 0
  }
}
```

### Features

1. **Playwright Integration**: Uses Playwright Chromium for reliable browser automation
2. **Axe-Core**: Comprehensive accessibility testing with configurable rules
3. **WCAG Compliance**: Maps issues to WCAG guidelines

### Usage Example

```javascript
const response = await fetch('/api/scan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://your-website.com'
  })
});

const result = await response.json();
console.log('Accessibility issues:', result.issues);
```

### Testing

Run the development server:
```bash
npm run dev
```

Then test the API:
```bash
node test-scan.js
```

### Configuration

The API includes several configurable axe-core rules:
- `color-contrast`: Color contrast requirements
- `document-title`: Page title requirements
- `html-has-lang`: HTML language attribute
- `image-alt`: Image alt text requirements
- `link-name`: Link accessibility
- `list` & `listitem`: List structure
- `page-has-heading-one`: Page heading structure
- `region`: Page regions
- `skip-link`: Skip navigation links

You can modify these rules in the `route.ts` file under the `axe.run()` configuration.
