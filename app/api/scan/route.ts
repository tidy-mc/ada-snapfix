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

// Optimized browser launch configuration for Vercel
const getBrowserConfig = () => ({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-field-trial-config',
    '--disable-ipc-flooding-protection',
    '--memory-pressure-off',
    '--max_old_space_size=4096'
  ]
});

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    console.log('Starting enhanced scan for URL:', url);

    // Enhanced browser launch with multiple fallback strategies
    let browser;
    let launchStrategy = 'standard';
    
    try {
      // Strategy 1: Standard optimized launch
      browser = await chromium.launch(getBrowserConfig());
      console.log('Browser launched successfully with standard strategy');
    } catch (error1) {
      console.log('Standard launch failed, trying minimal config...');
      launchStrategy = 'minimal';
      
      try {
        // Strategy 2: Minimal configuration
        browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ]
        });
        console.log('Browser launched successfully with minimal strategy');
      } catch (error2) {
        console.log('Minimal launch failed, trying with executable path...');
        launchStrategy = 'executable-path';
        
        try {
          // Strategy 3: With executable path
          browser = await chromium.launch({
            headless: true,
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
          console.log('Browser launched successfully with executable path strategy');
        } catch (error3) {
          console.error('All browser launch strategies failed:', { error1, error2, error3 });
          throw new Error('Unable to launch browser - all strategies failed');
        }
      }
    }

    const page = await browser.newPage();
    
    // Optimize page settings for Vercel
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    console.log('Navigating to URL...');
    
    // Navigate with optimized settings
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 25000 // Reduced timeout for Vercel
    });
    console.log('Page loaded successfully');

    // Inject axe-core with retry logic
    console.log('Injecting axe-core...');
    let axeLoaded = false;
    let retryCount = 0;
    
    while (!axeLoaded && retryCount < 3) {
      try {
        await page.addScriptTag({ 
          url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js' 
        });
        await page.waitForTimeout(1000 + (retryCount * 500)); // Progressive delay
        axeLoaded = true;
        console.log('Axe-core injected successfully');
      } catch (error) {
        retryCount++;
        console.log(`Axe injection attempt ${retryCount} failed, retrying...`);
        if (retryCount >= 3) {
          throw new Error('Failed to load axe-core after multiple attempts');
        }
      }
    }

    // Run axe-core analysis with optimized configuration
    console.log('Running axe-core analysis...');
    const axeResults: AxeResult = await page.evaluate(async () => {
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

    console.log(`Scan completed successfully. Found ${allIssues.length} issues using ${launchStrategy} strategy.`);
    
    return NextResponse.json({
      url,
      timestamp: new Date().toISOString(),
      totalIssues: allIssues.length,
      axe: axeResults.violations,
      issues: allIssues,
      summary: {
        axe: allIssues.length,
        pa11y: 0,
      },
      metadata: {
        launchStrategy,
        scanType: 'full'
      }
    });

  } catch (error) {
    console.error('Enhanced scan error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isPlaywrightError = errorMessage.includes('playwright') || 
                             errorMessage.includes('browser') || 
                             errorMessage.includes('Executable doesn\'t exist') ||
                             errorMessage.includes('Unable to launch browser') ||
                             errorMessage.includes('all strategies failed');
    
    if (isPlaywrightError) {
      return NextResponse.json(
        { 
          error: 'Full scan unavailable', 
          details: 'Playwright browser could not be launched on this platform. This is common on serverless environments.',
          type: 'browser_launch_error',
          suggestion: 'Try the simple scan option for basic accessibility checking',
          fallback: 'simple'
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