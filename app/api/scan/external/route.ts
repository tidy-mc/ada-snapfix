import { NextRequest, NextResponse } from 'next/server';

interface ExternalScanResult {
  mode: 'external';
  success: boolean;
  issues: Array<{
    selector: string;
    ruleId: string;
    wcag: string[];
    severity: string;
    message: string;
    source: 'external';
  }>;
  axe: any;
  message: string;
  next?: string;
}

// Configuration for external browser services
const EXTERNAL_SERVICES = {
  browserless: {
    url: process.env.BROWSERLESS_URL || 'https://chrome.browserless.io',
    apiKey: process.env.BROWSERLESS_TOKEN
  },
  puppeteerCloud: {
    url: process.env.PUPPETEER_CLOUD_URL || 'https://api.puppeteer.cloud',
    apiKey: process.env.PUPPETEER_CLOUD_TOKEN
  }
};

// Function to run axe-core via external browser service
const runAxeViaExternalService = async (url: string, serviceType: 'browserless' | 'puppeteerCloud'): Promise<any> => {
  const service = EXTERNAL_SERVICES[serviceType];
  
  if (!service.apiKey) {
    throw new Error(`${serviceType} API key not configured`);
  }

  const axeScript = `
    const axe = await import('https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js');
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
  `;

  if (serviceType === 'browserless') {
    const response = await fetch(`${service.url}/content?token=${service.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        url: url,
        gotoOptions: {
          waitUntil: 'networkidle',
          timeout: 30000
        },
        evaluate: axeScript,
        waitFor: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`Browserless API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  if (serviceType === 'puppeteerCloud') {
    const response = await fetch(`${service.url}/screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${service.apiKey}`
      },
      body: JSON.stringify({
        url: url,
        evaluate: axeScript,
        waitFor: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`Puppeteer Cloud API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  throw new Error(`Service type ${serviceType} not implemented`);
};

export async function POST(request: NextRequest) {
  try {
    const { url, serviceType } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Determine which service to use
    let selectedService: 'browserless' | 'puppeteerCloud' | null = null;
    
    if (serviceType) {
      if (['browserless', 'puppeteerCloud'].includes(serviceType)) {
        selectedService = serviceType as 'browserless' | 'puppeteerCloud';
      } else {
        return NextResponse.json(
          { error: 'Invalid service type. Supported: browserless, puppeteerCloud' },
          { status: 400 }
        );
      }
    } else {
      // Auto-detect available service
      if (EXTERNAL_SERVICES.browserless.apiKey) {
        selectedService = 'browserless';
      } else if (EXTERNAL_SERVICES.puppeteerCloud.apiKey) {
        selectedService = 'puppeteerCloud';
      }
    }

    if (!selectedService) {
      return NextResponse.json(
        { 
          error: 'No external browser service configured',
          details: 'BROWSERLESS_TOKEN or PUPPETEER_CLOUD_TOKEN environment variable is required',
          type: 'configuration_error',
          fallback: 'simple'
        },
        { status: 503 }
      );
    }

    console.log(`Starting external scan for URL: ${url} using ${selectedService}`);

    // Run axe-core via external service
    const axeResults = await runAxeViaExternalService(url, selectedService);

    // Convert axe results to our format
    const allIssues = axeResults.violations.flatMap((violation: any) =>
      violation.nodes.map((node: any) => ({
        selector: node.target.join(', '),
        ruleId: violation.id,
        wcag: violation.tags.filter((tag: string) => tag.startsWith('wcag2')),
        severity: violation.impact || 'moderate',
        message: node.failureSummary,
        source: 'external' as const,
      }))
    );

    console.log(`External scan completed successfully. Found ${allIssues.length} issues.`);
    
    const result: ExternalScanResult = {
      mode: 'external',
      success: true,
      issues: allIssues,
      axe: axeResults.violations,
      message: `External scan completed with ${allIssues.length} accessibility issues found using ${selectedService}`,
      next: allIssues.length > 0 ? 'Review and fix critical issues first, then test with screen readers' : undefined
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('External scan error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'External scan failed', 
        details: errorMessage,
        type: 'external_service_error',
        fallback: 'simple'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'External scan endpoint - Use POST method with URL in body',
      mode: 'external',
      features: [
        'JavaScript execution',
        'Dynamic content analysis',
        'Full axe-core analysis',
        'External browser service'
      ],
      supportedServices: {
        browserless: {
          description: 'Browserless.io Chrome service',
          requires: 'BROWSERLESS_TOKEN environment variable',
          url: 'https://browserless.io'
        },
        puppeteerCloud: {
          description: 'Puppeteer Cloud service',
          requires: 'PUPPETEER_CLOUD_TOKEN environment variable',
          url: 'https://puppeteer.cloud'
        }
      },
      usage: {
        method: 'POST',
        body: {
          url: 'https://example.com',
          serviceType: 'browserless' // optional, auto-detects if not provided
        }
      }
    },
    { status: 405 }
  );
}
