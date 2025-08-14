import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright-chromium';

interface AxeResult {
  violations: Array<{
    id: string;
    impact: string;
    tags: string[];
    description: string;
    help: string;
    helpUrl: string;
    nodes: Array<{
      html: string;
      target: string[];
      failureSummary: string;
      impact: string;
    }>;
  }>;
}

interface ScanResult {
  selector: string;
  ruleId: string;
  wcag: string[];
  severity: string;
  message: string;
  source: 'axe';
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

    console.log('Starting scan for URL:', url);

    // Try multiple browser launch strategies for Vercel compatibility
    let browser;
    try {
      // First attempt: Standard launch
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    } catch (launchError) {
      console.log('Standard launch failed, trying alternative approach...');
      
      // Second attempt: Try with executable path
      try {
        browser = await chromium.launch({
          headless: true,
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ]
        });
      } catch (altError) {
        console.error('All browser launch attempts failed:', altError);
        throw new Error('Unable to launch browser - Playwright installation issue');
      }
    }

    const page = await browser.newPage();
    
    console.log('Navigating to URL...');
    // Navigate to the URL with timeout
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    console.log('Page loaded successfully');

    // Inject axe-core from CDN (more reliable in server environments)
    console.log('Injecting axe-core...');
    await page.addScriptTag({ 
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js' 
    });
    console.log('Axe-core injected from CDN');
    
    // Wait a moment for the script to load
    await page.waitForTimeout(2000);

    // Skip custom rules for now to test basic functionality
    console.log('Running basic axe-core analysis...');

    // Run axe-core analysis with error handling
    const axeResults: AxeResult = await page.evaluate(async () => {
      // Check if axe is available
      // @ts-ignore - axe is injected via script tag
      if (typeof axe === 'undefined') {
        throw new Error('Axe-core not loaded');
      }
      
      // @ts-ignore - axe is injected via script tag
      return await axe.run(document);
    });

    await browser.close();
    console.log('Browser closed');

    // Convert axe results to our format
    console.log('Processing results...');
    const allIssues: ScanResult[] = axeResults.violations.flatMap(violation =>
      violation.nodes.map(node => ({
        selector: node.target.join(', '),
        ruleId: violation.id,
        wcag: violation.tags.filter(tag => tag.startsWith('wcag2')),
        severity: violation.impact || 'moderate',
        message: node.failureSummary,
        source: 'axe' as const,
      }))
    );

    console.log(`Scan completed. Found ${allIssues.length} issues.`);
    
    return NextResponse.json({
      url,
      timestamp: new Date().toISOString(),
      totalIssues: allIssues.length,
      axe: axeResults.violations,
      issues: allIssues,
      summary: {
        axe: allIssues.length,
        pa11y: 0,
      }
    });

  } catch (error) {
    console.error('Scan error:', error);
    
    // Return a more detailed error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isPlaywrightError = errorMessage.includes('playwright') || 
                             errorMessage.includes('browser') || 
                             errorMessage.includes('Executable doesn\'t exist') ||
                             errorMessage.includes('Unable to launch browser');
    
    if (isPlaywrightError) {
      return NextResponse.json(
        { 
          error: 'Browser launch failed', 
          details: 'Playwright browser could not be launched. This may be due to serverless environment limitations.',
          type: 'browser_launch_error',
          suggestion: 'Consider using a different deployment platform or contact support for serverless Playwright setup'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to scan URL', 
        details: errorMessage,
        type: 'general_error',
        suggestion: 'Please check the URL and try again'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST method with URL in body to scan a website' },
    { status: 405 }
  );
}
