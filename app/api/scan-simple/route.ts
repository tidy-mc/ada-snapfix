import { NextRequest, NextResponse } from 'next/server';
import { performSimpleScan } from '@/lib/simple-scan';

export async function POST(request: NextRequest) {
  // Check if client wants streaming logs
  const acceptHeader = request.headers.get('accept');
  const wantsStreaming = acceptHeader?.includes('text/event-stream');
  
  if (wantsStreaming) {
    return handleStreamingSimpleScan(request);
  }
  
  return handleRegularSimpleScan(request);
}

async function handleStreamingSimpleScan(request: NextRequest) {
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
        sendLog(`Starting simple scan for URL: ${url}`);
        
        const { issues } = await performSimpleScan(url);
        
        sendLog(`Simple scan completed. Found ${issues.length} issues.`, 'success');
        
        // Send final results
        const results = {
          url,
          timestamp: new Date().toISOString(),
          totalIssues: issues.length,
          issues: issues,
          summary: {
            simple: issues.length,
            axe: 0,
            pa11y: 0,
          },
          note: 'This is a basic accessibility scan. For comprehensive testing, use the full scan API.'
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'results', data: results })}\n\n`));
        controller.close();
        
      } catch (error) {
        sendLog(`Simple scan error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
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

async function handleRegularSimpleScan(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    console.log('Starting simple scan for URL:', url);

    const { issues } = await performSimpleScan(url);

    console.log(`Simple scan completed. Found ${issues.length} issues.`);
    
    return NextResponse.json({
      url,
      timestamp: new Date().toISOString(),
      totalIssues: issues.length,
      issues: issues,
      summary: {
        simple: issues.length,
        axe: 0,
        pa11y: 0,
      },
      note: 'This is a basic accessibility scan. For comprehensive testing, use the full scan API.'
    });

  } catch (error) {
    console.error('Simple scan error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to scan URL', 
        details: errorMessage,
        type: 'fetch_error',
        suggestion: 'Please check the URL and try again'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Simple accessibility scanner - Use POST method with URL in body' },
    { status: 405 }
  );
}
