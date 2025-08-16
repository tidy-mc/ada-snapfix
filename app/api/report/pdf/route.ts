import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { PDFRequest, Issue } from '@/lib/types';
import { getSeverityScore, getSeverityCounts } from '@/lib/utils';
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
  }).optional()
});

function generateHTMLReport(scan: any, issues: Issue[]): string {
  const score = scan.score || getSeverityScore(issues);
  const severityCounts = getSeverityCounts(issues);
  const timestamp = new Date(scan.timestamp).toLocaleString();
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Report - ${scan.url}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .score {
            font-size: 2.5em;
            font-weight: bold;
            color: ${score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'};
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .severity-card {
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .critical { background-color: #fef2f2; border: 1px solid #fecaca; }
        .serious { background-color: #fffbeb; border: 1px solid #fed7aa; }
        .moderate { background-color: #fefce8; border: 1px solid #fde68a; }
        .minor { background-color: #f0f9ff; border: 1px solid #bae6fd; }
        .severity-count {
            font-size: 1.5em;
            font-weight: bold;
        }
        .issues-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .issues-table th,
        .issues-table td {
            border: 1px solid #e5e7eb;
            padding: 12px;
            text-align: left;
        }
        .issues-table th {
            background-color: #f9fafb;
            font-weight: 600;
        }
        .impact-critical { color: #dc2626; font-weight: 600; }
        .impact-serious { color: #ea580c; font-weight: 600; }
        .impact-moderate { color: #d97706; font-weight: 600; }
        .impact-minor { color: #2563eb; font-weight: 600; }
        .selector {
            font-family: monospace;
            font-size: 0.9em;
            background-color: #f3f4f6;
            padding: 4px 8px;
            border-radius: 4px;
            word-break: break-all;
        }
        .wcag-tag {
            background-color: #e0e7ff;
            color: #3730a3;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.8em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Accessibility Report</h1>
        <p><strong>URL:</strong> ${scan.url}</p>
        <p><strong>Scanned:</strong> ${timestamp}</p>
        <p><strong>Mode:</strong> ${scan.mode || 'standard'}</p>
        <div class="score">Score: ${score}/100</div>
    </div>

    <div class="summary">
        <div class="severity-card critical">
            <div class="severity-count">${severityCounts.critical}</div>
            <div>Critical</div>
        </div>
        <div class="severity-card serious">
            <div class="severity-count">${severityCounts.serious}</div>
            <div>Serious</div>
        </div>
        <div class="severity-card moderate">
            <div class="severity-count">${severityCounts.moderate}</div>
            <div>Moderate</div>
        </div>
        <div class="severity-card minor">
            <div class="severity-count">${severityCounts.minor}</div>
            <div>Minor</div>
        </div>
    </div>

    <h2>Issues Found (${issues.length})</h2>
    <table class="issues-table">
        <thead>
            <tr>
                <th>Rule ID</th>
                <th>WCAG</th>
                <th>Impact</th>
                <th>Message</th>
                <th>Selector</th>
            </tr>
        </thead>
        <tbody>
            ${issues.map(issue => `
                <tr>
                    <td>${issue.ruleId || issue.id || 'N/A'}</td>
                    <td>
                        ${issue.wcag ? `<span class="wcag-tag">${issue.wcag}</span>` : 'N/A'}
                    </td>
                    <td class="impact-${issue.impact || 'moderate'}">
                        ${(issue.impact || 'moderate').charAt(0).toUpperCase() + (issue.impact || 'moderate').slice(1)}
                    </td>
                    <td>${issue.message || issue.description || 'N/A'}</td>
                    <td><span class="selector">${issue.selector || 'N/A'}</span></td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 0.9em; color: #6b7280;">
        <p>Report generated by Ada SnapFix Accessibility Scanner</p>
        <p>For detailed fixes and suggestions, visit the web interface.</p>
    </div>
</body>
</html>`;

  return html;
}

export async function POST(request: NextRequest) {
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

    const { url, scan } = validation.data;
    let finalScan = scan;
    let issues: Issue[] = [];

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

    // Generate HTML report
    const htmlContent = generateHTMLReport(finalScan, issues);
    
    // Check HTML size limit (rough estimate)
    if (htmlContent.length > 50000) {
      return NextResponse.json(
        { error: 'Report too large', details: 'HTML content exceeds size limit for PDF generation' },
        { status: 413 }
      );
    }

    // Launch browser with @sparticuz/chromium
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

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
    
    if (error instanceof Error) {
      if (error.message.includes('browser') || error.message.includes('chromium')) {
        return NextResponse.json(
          { error: 'PDF generation unavailable', details: 'Browser service not available' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: 'Internal server error' },
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
