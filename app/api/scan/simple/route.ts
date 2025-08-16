import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import axe from 'axe-core';

interface SimpleScanResult {
  mode: 'simple';
  success: boolean;
  issues: Array<{
    selector: string;
    ruleId: string;
    wcag: string[];
    severity: string;
    message: string;
    source: 'simple';
  }>;
  axe: any;
  message: string;
  next?: string;
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
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    let response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        signal: controller.signal,
        redirect: 'follow'
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw new Error(`Failed to fetch URL: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`);
    }
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    if (!html || html.length < 100) {
      throw new Error('Received empty or invalid HTML content');
    }

    console.log('HTML fetched, creating JSDOM instance...');

    // Create JSDOM instance
    const dom = new JSDOM(html, {
      url: url,
      pretendToBeVisual: true,
      resources: 'usable'
    });

    // Get the document
    const document = dom.window.document;

    console.log('Running axe-core analysis on static HTML...');

    // Run axe-core analysis
    const axeResults = await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
      },
      rules: {
        'color-contrast': { enabled: true },
        'document-title': { enabled: true },
        'html-has-lang': { enabled: true },
        'image-alt': { enabled: true },
        'link-name': { enabled: true },
        'list': { enabled: true },
        'listitem': { enabled: true },
        'page-has-heading-one': { enabled: true },
        'region': { enabled: true }
      }
    });

    // Convert axe results to our format
    const allIssues = axeResults.violations.flatMap((violation: any) =>
      violation.nodes.map((node: any) => ({
        selector: node.target.join(', '),
        ruleId: violation.id,
        wcag: violation.tags.filter((tag: string) => tag.startsWith('wcag2')),
        severity: violation.impact || 'moderate',
        message: node.failureSummary,
        source: 'simple' as const,
      }))
    );

    console.log(`Simple scan completed successfully. Found ${allIssues.length} issues.`);
    
    const result: SimpleScanResult = {
      mode: 'simple',
      success: true,
      issues: allIssues,
      axe: axeResults.violations,
      message: `Simple scan completed with ${allIssues.length} accessibility issues found (static HTML analysis)`,
      next: allIssues.length > 0 ? 'Review and fix critical issues first, then test with screen readers' : undefined
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Simple scan error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Simple scan failed', 
        details: errorMessage,
        type: 'fetch_error',
        suggestion: 'Please check the URL and try again. This scan works best with publicly accessible websites.'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Simple scan endpoint - Use POST method with URL in body',
      mode: 'simple',
      features: [
        'Static HTML analysis',
        'axe-core integration',
        'No JavaScript execution',
        'Fast and reliable',
        'Vercel compatible'
      ],
      limitations: [
        'No JavaScript execution',
        'No dynamic content analysis',
        'No visual rendering',
        'Static HTML only'
      ]
    },
    { status: 405 }
  );
}
