import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

interface QuickScanResult {
  mode: 'quick';
  success: boolean;
  issues: Array<{
    selector: string;
    ruleId: string;
    wcag: string[];
    severity: string;
    message: string;
    source: 'quick';
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

    console.log('Starting quick scan for URL:', url);

    // Launch browser with @sparticuz/chromium
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    
    // Set timeout for navigation
    page.setDefaultTimeout(15000);
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('Navigating to URL...');
    
    // Navigate with timeout
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    console.log('Page loaded, injecting axe-core...');
    
    // Inject axe-core
    await page.addScriptTag({ 
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js' 
    });
    
    // Wait for axe to load
    await page.waitForTimeout(1000);
    
    // Run axe-core analysis
    console.log('Running axe-core analysis...');
    const axeResults = await page.evaluate(async () => {
      // @ts-ignore - axe is injected via script tag
      if (typeof axe === 'undefined') {
        throw new Error('Axe-core not loaded');
      }
      
      // @ts-ignore - axe is injected via script tag
      return await axe.run(document, {
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
    });

    await browser.close();
    console.log('Browser closed successfully');

    // Convert axe results to our format
    const allIssues = axeResults.violations.flatMap((violation: any) =>
      violation.nodes.map((node: any) => ({
        selector: node.target.join(', '),
        ruleId: violation.id,
        wcag: violation.tags.filter((tag: string) => tag.startsWith('wcag2')),
        severity: violation.impact || 'moderate',
        message: node.failureSummary,
        source: 'quick' as const,
      }))
    );

    console.log(`Quick scan completed successfully. Found ${allIssues.length} issues.`);
    
    const result: QuickScanResult = {
      mode: 'quick',
      success: true,
      issues: allIssues,
      axe: axeResults.violations,
      message: `Quick scan completed with ${allIssues.length} accessibility issues found`,
      next: allIssues.length > 0 ? 'Review and fix critical issues first, then test with screen readers' : undefined
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Quick scan error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Determine if this is a browser launch error
    const isBrowserError = errorMessage.includes('browser') || 
                          errorMessage.includes('executable') ||
                          errorMessage.includes('timeout') ||
                          errorMessage.includes('CSP') ||
                          errorMessage.includes('navigation');
    
    if (isBrowserError) {
      return NextResponse.json(
        { 
          error: 'Quick scan failed',
          details: errorMessage,
          type: 'browser_error',
          fallback: 'external'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Quick scan failed', 
        details: errorMessage,
        type: 'general_error',
        fallback: 'external'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Quick scan endpoint - Use POST method with URL in body',
      mode: 'quick',
      features: [
        'JavaScript execution',
        'Dynamic content analysis',
        'Full axe-core analysis',
        'Vercel compatible with @sparticuz/chromium'
      ],
      timeout: '15 seconds'
    },
    { status: 405 }
  );
}
