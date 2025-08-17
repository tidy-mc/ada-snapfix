interface SimpleScanResult {
  selector: string;
  ruleId: string;
  wcag: string[];
  severity: string;
  message: string;
  source: 'simple';
}

// Export the simple scan function for use in fallback scenarios
export async function performSimpleScan(url: string): Promise<{ issues: SimpleScanResult[] }> {
  // Fetch the webpage content
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 10000);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    signal: abortController.signal
  });
  
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  
  // Simple accessibility checks using regex and string analysis
  const issues: SimpleScanResult[] = [];
  
  // Check for missing alt attributes on images
  const imgRegex = /<img[^>]*>/gi;
  const imgMatches = html.match(imgRegex) || [];
  
  imgMatches.forEach((imgTag, index) => {
    if (!imgTag.includes('alt=')) {
      issues.push({
        selector: `img[${index}]`,
        ruleId: 'missing-alt-text',
        wcag: ['wcag2a', 'wcag111'],
        severity: 'critical',
        message: 'Image missing alt attribute',
        source: 'simple'
      });
    }
  });

  // Check for missing form labels
  const inputRegex = /<input[^>]*>/gi;
  const inputMatches = html.match(inputRegex) || [];
  
  inputMatches.forEach((inputTag, index) => {
    const hasId = inputTag.includes('id=');
    const hasAriaLabel = inputTag.includes('aria-label=');
    const hasAriaLabelledby = inputTag.includes('aria-labelledby=');
    
    if (!hasId && !hasAriaLabel && !hasAriaLabelledby) {
      issues.push({
        selector: `input[${index}]`,
        ruleId: 'missing-form-label',
        wcag: ['wcag2a', 'wcag131'],
        severity: 'critical',
        message: 'Form input missing accessible label',
        source: 'simple'
      });
    }
  });

  // Check for missing heading structure
  const headingRegex = /<h[1-6][^>]*>/gi;
  const headingMatches = html.match(headingRegex) || [];
  
  if (headingMatches.length === 0) {
    issues.push({
      selector: 'body',
      ruleId: 'missing-headings',
      wcag: ['wcag2a', 'wcag241'],
      severity: 'moderate',
      message: 'Page missing heading structure',
      source: 'simple'
    });
  }

  // Check for missing lang attribute
  if (!html.includes('lang=')) {
    issues.push({
      selector: 'html',
      ruleId: 'missing-lang-attribute',
      wcag: ['wcag2a', 'wcag311'],
      severity: 'critical',
      message: 'HTML missing lang attribute',
      source: 'simple'
    });
  }

  return { issues };
}
