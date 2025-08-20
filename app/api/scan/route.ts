import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright-chromium';
import { AxeResult } from '@/lib/types';

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

// Function to connect to external browser service
async function connectToExternalBrowser(sendLog: (message: string, type?: 'log' | 'error' | 'success') => void) {
  const browserServiceUrl = process.env.PLAYWRIGHT_BROWSER_WS_ENDPOINT;
  
  if (!browserServiceUrl) {
    throw new Error('No external browser service configured');
  }

  try {
    sendLog('Connecting to external browser service...');
    
    // Connect to the external browser service
    const browser = await chromium.connect({
      wsEndpoint: browserServiceUrl
    });
    
    sendLog('Connected to external browser service successfully');
    return browser;
  } catch (error) {
    sendLog(`Failed to connect to external browser service: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    throw error;
  }
}

export async function POST(request: NextRequest) {
  // Check if client wants streaming logs
  const acceptHeader = request.headers.get('accept');
  const wantsStreaming = acceptHeader?.includes('text/event-stream');
  
  if (wantsStreaming) {
    return handleStreamingScan(request);
  }
  
  return handleRegularScan(request);
}

async function handleStreamingScan(request: NextRequest) {
  const encoder = new TextEncoder();
  const { url } = await request.json();

  if (!url) {
    return new Response(
      `data: ${JSON.stringify({ error: 'URL is required' })}\n\n`,
      {
        status: 400,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (message: string, type: 'log' | 'error' | 'success' = 'log') => {
        const data = JSON.stringify({ type, message, timestamp: new Date().toISOString() });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        sendLog(`Starting enhanced scan for URL: ${url}`);
        
        // Enhanced browser launch with multiple fallback strategies
        let browser;
        let launchStrategy = 'external';
        
        try {
          // Strategy 1: External browser service (if configured)
          browser = await connectToExternalBrowser(sendLog);
          launchStrategy = 'external-service';
        } catch (error1) {
          sendLog('External browser service failed, trying local Playwright...');
          
          try {
            // Strategy 2: Standard optimized launch
            browser = await chromium.launch(getBrowserConfig());
            sendLog('Browser launched successfully with standard strategy');
            launchStrategy = 'standard';
          } catch (error2) {
            sendLog('Standard launch failed, trying minimal config...');
            launchStrategy = 'minimal';
            
            try {
              // Strategy 3: Minimal configuration
              browser = await chromium.launch({
                headless: true,
                args: [
                  '--no-sandbox',
                  '--disable-setuid-sandbox',
                  '--disable-dev-shm-usage'
                ]
              });
              sendLog('Browser launched successfully with minimal strategy');
            } catch (error3) {
              sendLog('Minimal launch failed, trying with executable path...');
              launchStrategy = 'executable-path';
              
              try {
                // Strategy 4: With executable path
                browser = await chromium.launch({
                  headless: true,
                  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
                  args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                sendLog('Browser launched successfully with executable path strategy');
              } catch (error4) {
                sendLog('All browser launch strategies failed, falling back to simple scan...', 'error');
                
                // Fallback to simple scan when browser launch fails
                try {
                  sendLog('Initiating simple scan fallback...');
                  
                  // Import and use simple scan logic
                  const { performSimpleScan } = await import('@/lib/simple-scan');
                  const simpleResults = await performSimpleScan(url);
                  
                  sendLog('Simple scan completed successfully');
                  
                  // Send results
                  const results = {
                    url,
                    timestamp: new Date().toISOString(),
                    totalIssues: simpleResults.issues.length,
                    issues: simpleResults.issues,
                    summary: {
                      axe: 0,
                      pa11y: 0,
                      simple: simpleResults.issues.length
                    },
                    note: 'Full scan failed, using simple scan as fallback',
                    metadata: {
                      launchStrategy: 'fallback',
                      scanType: 'simple-fallback'
                    }
                  };
                  
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'results', data: results })}\n\n`));
                  sendLog('Scan completed with fallback method', 'success');
                  
                } catch (fallbackError) {
                  sendLog(`Fallback scan also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`, 'error');
                }
                
                controller.close();
                return;
              }
            }
          }
        }

        const page = await browser.newPage();
        sendLog('Navigating to URL...');
        
        // Optimize page settings for Vercel
        await page.setViewportSize({ width: 1280, height: 720 });
        
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          sendLog('Page loaded successfully');
        } catch (error) {
          sendLog('Page load timeout, continuing with current state...');
        }

        // Inject axe-core
        sendLog('Injecting axe-core...');
        await page.addScriptTag({
          url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js'
        });

        // Wait for axe to load
        let axeLoaded = false;
        let retryCount = 0;
        while (!axeLoaded && retryCount < 3) {
          try {
            await page.waitForFunction(() => typeof (window as any).axe !== 'undefined', { timeout: 5000 });
            axeLoaded = true;
            sendLog('Axe-core injected successfully');
          } catch (error) {
            retryCount++;
            sendLog(`Axe-core load attempt ${retryCount} failed, retrying...`);
            await page.waitForTimeout(1000);
          }
        }

        if (!axeLoaded) {
          sendLog('Failed to load axe-core after 3 attempts', 'error');
          await browser.close();
          controller.close();
          return;
        }

        // Run axe-core analysis with optimized configuration
        sendLog('Running axe-core analysis...');
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
        sendLog('Browser closed successfully');

        // Convert axe results to our format
        sendLog('Processing results...');
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

        sendLog(`Scan completed successfully. Found ${allIssues.length} issues using ${launchStrategy} strategy.`, 'success');
        
        // Send final results
        const results = {
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
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'results', data: results })}\n\n`));
        controller.close();
        
      } catch (error) {
        sendLog(`Enhanced scan error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function handleRegularScan(request: NextRequest) {
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
    let launchStrategy = 'external';
    
    try {
      // Strategy 1: External browser service (if configured)
      const browserServiceUrl = process.env.PLAYWRIGHT_BROWSER_WS_ENDPOINT;
      
      if (browserServiceUrl) {
        console.log('Connecting to external browser service...');
        browser = await chromium.connect({
          wsEndpoint: browserServiceUrl
        });
        console.log('Connected to external browser service successfully');
        launchStrategy = 'external-service';
      } else {
        throw new Error('No external browser service configured');
      }
    } catch (error1) {
      console.log('External browser service failed, trying local Playwright...');
      
      try {
        // Strategy 2: Standard optimized launch
        browser = await chromium.launch(getBrowserConfig());
        console.log('Browser launched successfully with standard strategy');
        launchStrategy = 'standard';
      } catch (error2) {
        console.log('Standard launch failed, trying minimal config...');
        launchStrategy = 'minimal';
        
        try {
          // Strategy 3: Minimal configuration
          browser = await chromium.launch({
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage'
            ]
          });
          console.log('Browser launched successfully with minimal strategy');
        } catch (error3) {
          console.log('Minimal launch failed, trying with executable path...');
          launchStrategy = 'executable-path';
          
          try {
            // Strategy 4: With executable path
            browser = await chromium.launch({
              headless: true,
              executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
              args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            console.log('Browser launched successfully with executable path strategy');
          } catch (error4) {
            console.error('All browser launch strategies failed, falling back to simple scan...');
            
            // Fallback to simple scan when browser launch fails
            try {
              console.log('Initiating simple scan fallback...');
              
              // Import and use simple scan logic
              const { performSimpleScan } = await import('@/lib/simple-scan');
              const simpleResults = await performSimpleScan(url);
              
              console.log('Simple scan completed successfully');
              
              // Return fallback results
              return NextResponse.json({
                url,
                timestamp: new Date().toISOString(),
                totalIssues: simpleResults.issues.length,
                issues: simpleResults.issues,
                summary: {
                  axe: 0,
                  pa11y: 0,
                  simple: simpleResults.issues.length
                },
                note: 'Full scan failed, using simple scan as fallback',
                metadata: {
                  launchStrategy: 'fallback',
                  scanType: 'simple-fallback'
                }
              });
              
            } catch (fallbackError) {
              console.error('Fallback scan also failed:', fallbackError);
              throw new Error('Unable to launch browser and fallback scan failed');
            }
          }
        }
      }
    }

    const page = await browser.newPage();
    
    // Optimize page settings for Vercel
    await page.setViewportSize({ width: 1280, height: 720 });
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (error) {
      console.log('Page load timeout, continuing with current state...');
    }

    // Inject axe-core
    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js'
    });

    // Wait for axe to load
    let axeLoaded = false;
    let retryCount = 0;
    while (!axeLoaded && retryCount < 3) {
      try {
        await page.waitForFunction(() => typeof (window as any).axe !== 'undefined', { timeout: 5000 });
        axeLoaded = true;
      } catch (error) {
        retryCount++;
        await page.waitForTimeout(1000);
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