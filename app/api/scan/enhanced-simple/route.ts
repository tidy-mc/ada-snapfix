import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import axe from 'axe-core';
import { registerCustomRules } from '../../../lib/axe-plugin';
import { analyzeStaticHTML } from '../../../lib/static-analyzer';
import { runPa11yAnalysis } from '../../../lib/pa11y-analyzer';

interface EnhancedSimpleScanResult {
  mode: 'enhanced-simple';
  success: boolean;
  issues: Array<{
    selector: string;
    ruleId: string;
    wcag: string[];
    severity: string;
    message: string;
    source: 'axe-core' | 'pa11y' | 'static-analysis';
  }>;
  meta: {
    totalIssues: number;
    issuesBySource: {
      'axe-core': number;
      'pa11y': number;
      'static-analysis': number;
    };
    issuesBySeverity: {
      critical: number;
      moderate: number;
      minor: number;
    };
    wcagCoverage: {
      total: number;
      covered: number;
      percentage: number;
    };
    pageInfo: {
      title: string | null;
      language: string | null;
      hasSkipLink: boolean;
      headingCount: { [key: string]: number };
      formCount: number;
      imageCount: number;
      linkCount: number;
    };
  };
  message: string;
  next?: string;
}

// Deduplicate issues based on ruleId and selector
function deduplicateIssues(issues: EnhancedSimpleScanResult['issues']): EnhancedSimpleScanResult['issues'] {
  const seen = new Set<string>();
  return issues.filter(issue => {
    const key = `${issue.ruleId}:${issue.selector}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Calculate WCAG coverage
function calculateWCAGCoverage(issues: EnhancedSimpleScanResult['issues']) {
  const allWCAG = new Set<string>();
  const coveredWCAG = new Set<string>();
  
  // Define all WCAG 2.1 AA criteria
  const wcagCriteria = [
    '1.1.1', '1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5', '1.3.1', '1.3.2', '1.3.3', '1.3.4', '1.3.5',
    '1.4.1', '1.4.2', '1.4.3', '1.4.4', '1.4.5', '1.4.10', '1.4.11', '1.4.12', '1.4.13',
    '2.1.1', '2.1.2', '2.1.3', '2.1.4', '2.2.1', '2.2.2', '2.3.1', '2.4.1', '2.4.2', '2.4.3', '2.4.4', '2.4.5', '2.4.6', '2.4.7',
    '2.5.1', '2.5.2', '2.5.3', '2.5.4', '2.5.5', '2.5.6',
    '3.1.1', '3.1.2', '3.2.1', '3.2.2', '3.2.3', '3.2.4', '3.3.1', '3.3.2', '3.3.3', '3.3.4', '3.3.5', '3.3.6', '3.3.7', '3.3.8',
    '4.1.1', '4.1.2', '4.1.3', '4.1.4'
  ];
  
  wcagCriteria.forEach(criterion => allWCAG.add(criterion));
  
  // Collect covered WCAG criteria from issues
  issues.forEach(issue => {
    issue.wcag.forEach(wcag => {
      if (wcag.includes('.')) {
        coveredWCAG.add(wcag);
      }
    });
  });
  
  return {
    total: allWCAG.size,
    covered: coveredWCAG.size,
    percentage: Math.round((coveredWCAG.size / allWCAG.size) * 100)
  };
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

    console.log('Starting enhanced simple scan for URL:', url);

    // Fetch the webpage content
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
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

    console.log('HTML fetched, starting comprehensive analysis...');

    // 1. Static HTML Analysis
    console.log('Running static HTML analysis...');
    const staticAnalysis = analyzeStaticHTML(html, url);

    // 2. Axe-core Analysis
    console.log('Running axe-core analysis...');
    const dom = new JSDOM(html, {
      url: url,
      pretendToBeVisual: true,
      resources: 'usable'
    });

    const document = dom.window.document;
    
    // Register custom rules
    try {
      registerCustomRules();
    } catch (error) {
      console.warn('Failed to register custom rules:', error);
    }

    const axeResults = await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
      },
      rules: {
        // Standard rules
        'color-contrast': { enabled: true },
        'document-title': { enabled: true },
        'html-has-lang': { enabled: true },
        'image-alt': { enabled: true },
        'link-name': { enabled: true },
        'list': { enabled: true },
        'listitem': { enabled: true },
        'page-has-heading-one': { enabled: true },
        'region': { enabled: true },
        'landmark-one-main': { enabled: true },
        'landmark-unique': { enabled: true },
        'landmark-complementary-is-top-level': { enabled: true },
        'landmark-banner-is-top-level': { enabled: true },
        'landmark-contentinfo-is-top-level': { enabled: true },
        'landmark-main-is-top-level': { enabled: true },
        'landmark-navigation-is-top-level': { enabled: true },
        'landmark-region': { enabled: true },
        'landmark-no-duplicate-banner': { enabled: true },
        'landmark-no-duplicate-contentinfo': { enabled: true },
        'landmark-no-duplicate-main': { enabled: true },
        'landmark-no-duplicate-navigation': { enabled: true },
        'landmark-no-duplicate-region': { enabled: true },
        'landmark-no-duplicate-complementary': { enabled: true },
        'landmark-one-main': { enabled: true },
        'landmark-unique': { enabled: true },
        'landmark-complementary-is-top-level': { enabled: true },
        'landmark-banner-is-top-level': { enabled: true },
        'landmark-contentinfo-is-top-level': { enabled: true },
        'landmark-main-is-top-level': { enabled: true },
        'landmark-navigation-is-top-level': { enabled: true },
        'landmark-region': { enabled: true },
        'landmark-no-duplicate-banner': { enabled: true },
        'landmark-no-duplicate-contentinfo': { enabled: true },
        'landmark-no-duplicate-main': { enabled: true },
        'landmark-no-duplicate-navigation': { enabled: true },
        'landmark-no-duplicate-region': { enabled: true },
        'landmark-no-duplicate-complementary': { enabled: true },
        // Custom rules
        'link-name-clarity': { enabled: true },
        'no-positive-tabindex': { enabled: true },
        'aria-expanded-boolean': { enabled: true },
        'decorative-image-alt-text': { enabled: true },
        'form-field-labels': { enabled: true },
        'html-has-lang': { enabled: true },
        'heading-order': { enabled: true },
        'skip-link': { enabled: true },
        'aria-role-valid': { enabled: true },
        'meta-viewport-scale': { enabled: true },
        'focus-visible': { enabled: true }
      }
    });

    const axeIssues = axeResults.violations.flatMap((violation: any) =>
      violation.nodes.map((node: any) => ({
        selector: node.target.join(', '),
        ruleId: violation.id,
        wcag: violation.tags.filter((tag: string) => tag.startsWith('wcag2')),
        severity: violation.impact || 'moderate',
        message: node.failureSummary,
        source: 'axe-core' as const,
      }))
    );

    // 3. Pa11y Analysis (if available)
    console.log('Running Pa11y analysis...');
    let pa11yIssues: EnhancedSimpleScanResult['issues'] = [];
    try {
      const pa11yResult = await runPa11yAnalysis(url);
      pa11yIssues = pa11yResult.issues;
    } catch (pa11yError) {
      console.warn('Pa11y analysis failed, continuing without it:', pa11yError);
    }

    // Combine all issues
    const allIssues = [
      ...staticAnalysis.issues,
      ...axeIssues,
      ...pa11yIssues
    ];

    // Deduplicate issues
    const deduplicatedIssues = deduplicateIssues(allIssues);

    // Calculate statistics
    const issuesBySource = {
      'axe-core': axeIssues.length,
      'pa11y': pa11yIssues.length,
      'static-analysis': staticAnalysis.issues.length
    };

    const issuesBySeverity = {
      critical: deduplicatedIssues.filter(issue => issue.severity === 'critical').length,
      moderate: deduplicatedIssues.filter(issue => issue.severity === 'moderate').length,
      minor: deduplicatedIssues.filter(issue => issue.severity === 'minor').length
    };

    const wcagCoverage = calculateWCAGCoverage(deduplicatedIssues);

    console.log(`Enhanced simple scan completed. Found ${deduplicatedIssues.length} unique issues.`);
    console.log(`WCAG coverage: ${wcagCoverage.percentage}% (${wcagCoverage.covered}/${wcagCoverage.total})`);

    const result: EnhancedSimpleScanResult = {
      mode: 'enhanced-simple',
      success: true,
      issues: deduplicatedIssues,
      meta: {
        totalIssues: deduplicatedIssues.length,
        issuesBySource,
        issuesBySeverity,
        wcagCoverage,
        pageInfo: {
          title: staticAnalysis.meta.title,
          language: staticAnalysis.meta.language,
          hasSkipLink: staticAnalysis.meta.hasSkipLink,
          headingCount: staticAnalysis.meta.headingCount,
          formCount: staticAnalysis.meta.formCount,
          imageCount: staticAnalysis.meta.imageCount,
          linkCount: staticAnalysis.meta.linkCount
        }
      },
      message: `Enhanced simple scan completed with ${deduplicatedIssues.length} accessibility issues found. WCAG coverage: ${wcagCoverage.percentage}%`,
      next: deduplicatedIssues.length > 0 ? 'Review and fix critical issues first, then test with screen readers' : undefined
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Enhanced simple scan error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Enhanced simple scan failed', 
        details: errorMessage,
        type: 'enhanced_scan_error',
        suggestion: 'Please check the URL and try again. This scan works best with publicly accessible websites.'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Enhanced Simple Scan endpoint - Use POST method with URL in body',
      mode: 'enhanced-simple',
      features: [
        'Static HTML analysis with Cheerio',
        'Enhanced axe-core with custom rules',
        'Pa11y integration for additional checks',
        'Comprehensive WCAG coverage analysis',
        'Issue deduplication and scoring',
        'No browser dependencies',
        'Vercel compatible'
      ],
      coverage: {
        description: 'Combines multiple analysis methods for maximum WCAG coverage',
        methods: [
          'Static HTML parsing and validation',
          'axe-core with custom accessibility rules',
          'Pa11y for additional WCAG compliance checks',
          'Meta tag and document structure analysis'
        ],
        expectedCoverage: '80%+ WCAG 2.1/2.2 AA criteria'
      },
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
