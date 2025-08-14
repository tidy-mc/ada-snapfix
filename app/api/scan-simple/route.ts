import { NextRequest, NextResponse } from 'next/server';

interface SimpleScanResult {
  selector: string;
  ruleId: string;
  wcag: string[];
  severity: string;
  message: string;
  source: 'simple';
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    console.log('Starting simple scan for URL:', url);

    // Fetch the webpage content
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: controller.signal
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

    console.log(`Simple scan completed. Found ${issues.length} issues.`);
    
    return NextResponse.json({
      url,
      timestamp: new Date().toISOString(),
      totalIssues: issues.length,
      issues: issues,
      summary: {
        simple: issues.length,
        axe: 0,
        pa11y: 0,
      },
      note: 'This is a basic accessibility scan. For comprehensive testing, use the full scan API.'
    });

  } catch (error) {
    console.error('Simple scan error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to scan URL', 
        details: errorMessage,
        type: 'fetch_error',
        suggestion: 'Please check the URL and try again'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Simple accessibility scanner - Use POST method with URL in body' },
    { status: 405 }
  );
}
