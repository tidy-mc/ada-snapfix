import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { PDFRequest, Issue } from '@/lib/types';
import { getSeverityScore, getSeverityCounts } from '@/lib/utils';
import { buildReportPayload, getNextSteps } from '@/lib/report';
import { formatWCAGLink } from '@/lib/wcag';
import { z } from 'zod';

const pdfRequestSchema = z.object({
  url: z.string().url().optional(),
  scan: z.object({
    url: z.string(),
    timestamp: z.string(),
    totalIssues: z.number(),
    issues: z.array(z.object({
      id: z.string().optional(),
      ruleId: z.string().optional(),
      impact: z.enum(['critical', 'serious', 'moderate', 'minor']).optional(),
      description: z.string().optional(),
      help: z.string().optional(),
      message: z.string().optional(),
      wcag: z.string().optional(),
      selector: z.string().optional(),
      nodes: z.array(z.object({
        target: z.array(z.string()).optional()
      })).optional(),
      suggestion: z.object({
        summary: z.string().optional(),
        code: z.string().optional(),
        wcag: z.string().optional()
      }).optional()
    })),
    score: z.number().optional(),
    mode: z.string().optional()
  }).optional(),
  includeAI: z.boolean().optional(),
  tier: z.enum(['free', 'paid']).optional()
});

function generateHTMLReport(scan: any, issues: Issue[], includeAI: boolean = false, tier: 'free' | 'paid' = 'free', suggestionsByIssueId: Record<string, { summary: string; code?: string; wcag?: string }> = {}): string {
  // Build report payload with enhanced data
  const reportPayload = buildReportPayload(scan, suggestionsByIssueId);
  const score = reportPayload.score;
  const severityCounts = reportPayload.severityCounts;
  const categoryCounts = reportPayload.categoryCounts;
  const timestamp = new Date(scan.timestamp).toLocaleString();
  const nextSteps = getNextSteps(categoryCounts);
  
  // Limit issues to prevent oversized reports
  const maxIssues = 100;
  const limitedIssues = issues.slice(0, maxIssues);
  const hasMoreIssues = issues.length > maxIssues;
  
  // Generate table of contents
  const tocItems = [
    { id: 'executive-summary', title: 'Executive Summary' },
    { id: 'severity-overview', title: 'Severity & Category Overview' },
    { id: 'pages-issues', title: 'Pages with Most Issues' },
    { id: 'detailed-issues', title: 'Detailed Issues' },
    { id: 'appendix', title: 'Appendix' }
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Accessibility Report - ${scan.url}</title>
  <style>
    @page { margin: 20mm; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #1f2937; 
      margin: 0; 
      padding: 0;
      font-size: 12px;
    }
    .page-break { page-break-before: always; }
    .no-break { page-break-inside: avoid; }
    
    /* Header */
    .header { 
      background: linear-gradient(135deg, #0ea5e9, #3b82f6); 
      color: white; 
      padding: 30px; 
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .header .subtitle { margin: 10px 0 0 0; font-size: 14px; opacity: 0.9; }
    .header .meta { margin: 15px 0 0 0; font-size: 12px; opacity: 0.8; }
    
    /* Score Gauge */
    .score-gauge { 
      display: inline-block; 
      width: 120px; 
      height: 120px; 
      border-radius: 50%; 
      background: conic-gradient(${score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'} ${score * 3.6}deg, #e5e7eb ${score * 3.6}deg); 
      position: relative; 
      margin: 20px auto;
    }
    .score-gauge::before { 
      content: '${score}'; 
      position: absolute; 
      top: 50%; 
      left: 50%; 
      transform: translate(-50%, -50%); 
      font-size: 24px; 
      font-weight: bold; 
      color: #1f2937;
    }
    
    /* Content */
    .content { padding: 0 30px; }
    .section { margin-bottom: 30px; }
    .section h2 { 
      color: #1f2937; 
      font-size: 20px; 
      font-weight: 600; 
      border-bottom: 2px solid #e5e7eb; 
      padding-bottom: 10px; 
      margin-bottom: 20px;
    }
    .section h3 { 
      color: #374151; 
      font-size: 16px; 
      font-weight: 600; 
      margin: 20px 0 10px 0;
    }
    
    /* Table of Contents */
    .toc { 
      background: #f9fafb; 
      padding: 20px; 
      border-radius: 8px; 
      margin-bottom: 30px;
    }
    .toc h2 { border: none; margin-bottom: 15px; }
    .toc ul { list-style: none; padding: 0; margin: 0; }
    .toc li { margin: 5px 0; }
    .toc a { color: #3b82f6; text-decoration: none; }
    
    /* Summary Cards */
    .summary-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
      gap: 15px; 
      margin: 20px 0;
    }
    .summary-card { 
      padding: 15px; 
      border-radius: 8px; 
      text-align: center;
      border: 1px solid #e5e7eb;
    }
    .summary-card.critical { background-color: #fef2f2; border-color: #fecaca; }
    .summary-card.serious { background-color: #fffbeb; border-color: #fed7aa; }
    .summary-card.moderate { background-color: #fefce8; border-color: #fde68a; }
    .summary-card.minor { background-color: #f0f9ff; border-color: #bae6fd; }
    .summary-card .count { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .summary-card .label { font-size: 12px; color: #6b7280; }
    
    /* Category Table */
    .category-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0;
      font-size: 11px;
    }
    .category-table th, .category-table td { 
      border: 1px solid #e5e7eb; 
      padding: 8px 12px; 
      text-align: left;
    }
    .category-table th { 
      background-color: #f9fafb; 
      font-weight: 600;
    }
    
    /* Issues Table */
    .issues-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0;
      font-size: 11px;
    }
    .issues-table th, .issues-table td { 
      border: 1px solid #e5e7eb; 
      padding: 8px 12px; 
      text-align: left;
      vertical-align: top;
    }
    .issues-table th { 
      background-color: #f9fafb; 
      font-weight: 600;
    }
    
    /* Severity Badges */
    .severity-badge { 
      display: inline-block; 
      padding: 2px 8px; 
      border-radius: 4px; 
      font-size: 10px; 
      font-weight: 600;
    }
    .severity-critical { background-color: #fef2f2; color: #dc2626; }
    .severity-serious { background-color: #fffbeb; color: #ea580c; }
    .severity-moderate { background-color: #fefce8; color: #d97706; }
    .severity-minor { background-color: #f0f9ff; color: #2563eb; }
    
    /* Code Blocks */
    .code-block { 
      background-color: #f3f4f6; 
      border: 1px solid #e5e7eb; 
      border-radius: 4px; 
      padding: 10px; 
      font-family: 'Courier New', monospace; 
      font-size: 10px; 
      overflow-x: auto;
      margin: 10px 0;
    }
    
    /* Footer */
    .footer { 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 1px solid #e5e7eb; 
      font-size: 10px; 
      color: #6b7280; 
      text-align: center;
    }
    
    /* Status Badge */
    .status-badge { 
      display: inline-block; 
      padding: 4px 12px; 
      border-radius: 20px; 
      font-size: 12px; 
      font-weight: 600;
      margin: 10px 0;
    }
    .status-pass { background-color: #d1fae5; color: #065f46; }
    .status-fail { background-color: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>ADA SnapFix Accessibility Report</h1>
    <p class="subtitle">Professional Accessibility Audit</p>
    <div class="score-gauge"></div>
    <p class="meta">
      <strong>URL:</strong> ${scan.url}<br>
      <strong>Scanned:</strong> ${timestamp}<br>
      <strong>Mode:</strong> ${scan.mode || 'standard'}<br>
      <strong>Report ID:</strong> ${reportPayload.reportId}
    </p>
  </div>

  <div class="content">
    <!-- Table of Contents -->
    <div class="section toc">
      <h2>Table of Contents</h2>
      <ul>
        ${tocItems.map(item => `<li><a href="#${item.id}">${item.title}</a></li>`).join('')}
      </ul>
    </div>

    <!-- Executive Summary -->
    <div id="executive-summary" class="section">
      <h2>Executive Summary</h2>
      <div class="status-badge ${score >= 80 ? 'status-pass' : 'status-fail'}">
        ${score >= 80 ? 'PASS' : 'FAIL'} - Score: ${score}/100
      </div>
      
      <p><strong>Overall Assessment:</strong> This website ${score >= 80 ? 'meets most accessibility standards' : 'requires significant accessibility improvements'} with a score of ${score}/100.</p>
      
      <div class="summary-grid">
        <div class="summary-card critical">
          <div class="count">${severityCounts.critical}</div>
          <div class="label">Critical Issues</div>
        </div>
        <div class="summary-card serious">
          <div class="count">${severityCounts.serious}</div>
          <div class="label">Serious Issues</div>
        </div>
        <div class="summary-card moderate">
          <div class="count">${severityCounts.moderate}</div>
          <div class="label">Moderate Issues</div>
        </div>
        <div class="summary-card minor">
          <div class="count">${severityCounts.minor}</div>
          <div class="label">Minor Issues</div>
        </div>
      </div>

      <h3>Top Critical Issues</h3>
      <ul>
        ${reportPayload.topIssues.slice(0, 5).map(issue => 
          `<li><strong>${issue.ruleId}</strong>: ${issue.message?.substring(0, 100)}${(issue.message || '').length > 100 ? '...' : ''}</li>`
        ).join('')}
      </ul>

      <h3>Next Steps</h3>
      <p>${nextSteps}</p>

      <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>Legal & User Impact:</strong> Accessibility issues can result in legal compliance risks and exclude users with disabilities. Immediate attention to critical and serious issues is recommended.
      </div>
    </div>

    <!-- Severity & Category Overview -->
    <div id="severity-overview" class="section page-break">
      <h2>Severity & Category Overview</h2>
      
      <h3>Issues by Category</h3>
      <table class="category-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Count</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(categoryCounts).map(([category, count]) => 
            `<tr>
              <td>${category}</td>
              <td>${count}</td>
              <td>${Math.round((count / issues.length) * 100)}%</td>
            </tr>`
          ).join('')}
        </tbody>
      </table>
    </div>

    <!-- Pages with Most Issues -->
    <div id="pages-issues" class="section">
      <h2>Pages with Most Issues</h2>
      <table class="category-table">
        <thead>
          <tr>
            <th>Page URL</th>
            <th>Issue Count</th>
          </tr>
        </thead>
        <tbody>
          ${reportPayload.pagesWithIssues.map(page => 
            `<tr>
              <td>${page.url}</td>
              <td>${page.count}</td>
            </tr>`
          ).join('')}
        </tbody>
      </table>
    </div>

    <!-- Detailed Issues -->
    <div id="detailed-issues" class="section page-break">
      <h2>Detailed Issues</h2>
      ${hasMoreIssues ? `<p><em>Showing first ${maxIssues} issues due to size limits. Full report available in web interface.</em></p>` : ''}
      
      <table class="issues-table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>WCAG</th>
            <th>Description</th>
            <th>Selector</th>
            <th>Priority Score</th>
            ${includeAI ? '<th>How to Fix</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${limitedIssues.map(issue => {
            const issueKey = `${issue.ruleId}-${issue.selector}`;
            const suggestion = reportPayload.suggestionsByIssueId[issueKey];
            const priorityScore = reportPayload.issues.find(i => i.ruleId === issue.ruleId && i.selector === issue.selector)?.priorityScore || 0;
            
            return `<tr>
              <td><span class="severity-badge severity-${issue.impact || 'moderate'}">${(issue.impact || 'moderate').charAt(0).toUpperCase() + (issue.impact || 'moderate').slice(1)}</span></td>
              <td>${issue.wcag ? formatWCAGLink(issue.wcag) : 'N/A'}</td>
              <td>${(issue.message || issue.description || 'N/A').substring(0, 150)}${(issue.message || issue.description || '').length > 150 ? '...' : ''}</td>
              <td><code style="font-size: 10px; background: #f3f4f6; padding: 2px 4px; border-radius: 2px;">${(issue.selector || 'N/A').substring(0, 40)}${(issue.selector || '').length > 40 ? '...' : ''}</code></td>
              <td>${priorityScore}</td>
              ${includeAI ? `<td>${suggestion ? suggestion.summary : 'AI suggestions not included for this plan.'}</td>` : ''}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Appendix -->
    <div id="appendix" class="section page-break">
      <h2>Appendix</h2>
      
      <h3>WCAG References</h3>
      <p>The following WCAG 2.1 Success Criteria were referenced in this report:</p>
            <ul>
        ${Array.from(new Set(issues.map(issue => issue.wcag).filter(Boolean))).map(wcag =>
          `<li>${formatWCAGLink(wcag || '')}</li>`
        ).join('')}
      </ul>

      <h3>Glossary</h3>
      <dl>
        <dt><strong>ARIA</strong></dt>
        <dd>Accessible Rich Internet Applications - a set of attributes that define ways to make web content more accessible.</dd>
        
        <dt><strong>Landmarks</strong></dt>
        <dd>HTML elements that identify major sections of a page (header, nav, main, footer, etc.).</dd>
        
        <dt><strong>Contrast Ratio</strong></dt>
        <dd>The ratio of luminance between the brightest and darkest colors in a text/background combination.</dd>
        
        <dt><strong>Focus Indicator</strong></dt>
        <dd>A visual indicator showing which element currently has keyboard focus.</dd>
      </dl>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>Generated by ADA SnapFix Accessibility Scanner</strong></p>
      <p>Report ID: ${reportPayload.reportId} | Generated: ${new Date().toISOString()}</p>
      <p>For detailed fixes and suggestions, visit the web interface.</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

export async function POST(request: NextRequest) {
  let finalScan: any;
  let issues: Issue[] = [];
  let suggestionsByIssueId: Record<string, { summary: string; code?: string; wcag?: string }> = {};
  
  try {
    const body = await request.json();
    
    // Validate input
    const validation = pdfRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request format', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { url, scan, includeAI = false, tier = 'free' } = validation.data;

    // If only URL provided, call existing scan API
    if (!scan && url) {
      try {
        const scanResponse = await fetch(`${request.nextUrl.origin}/api/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });

        if (!scanResponse.ok) {
          return NextResponse.json(
            { error: 'Failed to scan URL', details: 'Scan service unavailable' },
            { status: 503 }
          );
        }

        const scanData = await scanResponse.json();
        finalScan = {
          url: scanData.url,
          timestamp: scanData.timestamp,
          totalIssues: scanData.totalIssues,
          issues: scanData.issues,
          mode: scanData.metadata?.scanType || 'standard'
        };
        issues = scanData.issues;
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to scan URL', details: 'Internal scan error' },
          { status: 500 }
        );
      }
    } else if (scan) {
      finalScan = scan;
      issues = scan.issues;
    } else {
      return NextResponse.json(
        { error: 'Either url or scan data must be provided' },
        { status: 400 }
      );
    }

    // Get AI suggestions if requested
    if (includeAI && issues.length > 0) {
      try {
        const suggestionsResponse = await fetch(`${request.nextUrl.origin}/api/suggest/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issues, tier })
        });

        if (suggestionsResponse.ok) {
          const suggestionsData = await suggestionsResponse.json();
          suggestionsByIssueId = suggestionsData.suggestions || {};
        } else {
          console.warn('Failed to get AI suggestions, proceeding without them');
        }
      } catch (error) {
        console.warn('Error getting AI suggestions:', error);
      }
    }

    // Generate HTML report
    const htmlContent = generateHTMLReport(finalScan, issues, includeAI, tier, suggestionsByIssueId);
    
    // Check HTML size limit (increased for larger reports)
    if (htmlContent.length > 200000) {
      return NextResponse.json(
        { error: 'Report too large', details: 'HTML content exceeds size limit for PDF generation' },
        { status: 413 }
      );
    }

    // Launch browser with multiple fallback strategies for Vercel compatibility
    let browser;
    let launchStrategy = 'sparticuz';
    
    try {
      // Strategy 1: @sparticuz/chromium (optimized for Vercel)
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: 1280, height: 720 },
        executablePath: await chromium.executablePath(),
        headless: true,
      });
      console.log('PDF browser launched successfully with @sparticuz/chromium');
    } catch (error1) {
      console.log('@sparticuz/chromium failed, trying minimal config...');
      launchStrategy = 'minimal';
      
      try {
        // Strategy 2: Minimal configuration
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        });
        console.log('PDF browser launched successfully with minimal config');
      } catch (error2) {
        console.log('Minimal config failed, trying with executable path...');
        launchStrategy = 'executable-path';
        
        try {
          // Strategy 3: With executable path
          browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage'
            ]
          });
          console.log('PDF browser launched successfully with executable path');
        } catch (error3) {
          console.error('All PDF browser launch strategies failed, falling back to HTML...');
          
          // Fallback: Return HTML instead of PDF
          console.log('Browser unavailable, returning HTML fallback...');
          const htmlContent = generateHTMLReport(finalScan, issues);
          
          return new NextResponse(htmlContent, {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
              'Content-Disposition': `attachment; filename="ada-snapfix-report-${new Date().toISOString().split('T')[0]}.html"`,
              'Content-Length': htmlContent.length.toString()
            }
          });
        }
      }
    }

    const page = await browser.newPage();
    
    // Set content and wait for rendering
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    await browser.close();

    // Return PDF with proper headers
    const response = new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ada-snapfix-report-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdf.length.toString()
      }
    });
    
    return response;

  } catch (error) {
    console.error('PDF generation error:', error);
    
    // If we get here, it means there was an error after browser launch
    // (like PDF generation or page rendering issues)
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF', 
        details: error instanceof Error ? error.message : 'Internal server error',
        suggestion: 'Try downloading the HTML report instead'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST method with scan data or URL to generate PDF report' },
    { status: 405 }
  );
}
