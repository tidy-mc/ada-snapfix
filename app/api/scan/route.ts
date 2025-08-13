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

    // Launch Playwright browser
    const browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage();
    
    console.log('Navigating to URL...');
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    console.log('Page loaded successfully');

    // Inject axe-core from CDN (more reliable in server environments)
    console.log('Injecting axe-core...');
    await page.addScriptTag({ 
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js' 
    });
    console.log('Axe-core injected from CDN');
    
    // Wait a moment for the script to load
    await page.waitForTimeout(1000);

    // Skip custom rules for now to test basic functionality
    console.log('Skipping custom rules to test basic axe-core functionality');

    // Run axe-core analysis
    console.log('Running accessibility analysis...');
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
    return NextResponse.json(
      { error: 'Failed to scan URL', details: error instanceof Error ? error.message : 'Unknown error' },
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
