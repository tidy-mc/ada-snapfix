import { NextRequest, NextResponse } from 'next/server';
import { workerIntegration } from '@/lib/worker-integration';
import { performSimpleScan } from '@/lib/simple-scan';

export async function POST(request: NextRequest) {
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
        sendLog(`Starting worker scan for URL: ${url}`);

        // Check worker health first
        const isHealthy = await workerIntegration.checkHealth();
        if (!isHealthy) {
          sendLog('Worker is not healthy, falling back to simple scan...', 'error');
          
          // Fall back to simple scan
          try {
            sendLog('Initiating simple scan fallback...');
            const simpleResults = await performSimpleScan(url);
            
            sendLog('Simple scan completed successfully');
            
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
              note: 'Worker unavailable, using simple scan as fallback',
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
          return;
        }

        // Use worker for scanning
        const results = await workerIntegration.performStreamingScan({
          url,
          onLog: sendLog
        });

        // Send final results
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'results', data: results })}\n\n`));
        sendLog('Worker scan completed successfully', 'success');
        
      } catch (error) {
        sendLog(`Worker scan error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      } finally {
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

    console.log('Starting worker sync scan for URL:', url);

    // Check worker health first
    const isHealthy = await workerIntegration.checkHealth();
    if (!isHealthy) {
      console.log('Worker is not healthy, falling back to simple scan...');
      
      // Fall back to simple scan
      try {
        console.log('Initiating simple scan fallback...');
        const simpleResults = await performSimpleScan(url);
        
        console.log('Simple scan completed successfully');
        
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
          note: 'Worker unavailable, using simple scan as fallback',
          metadata: {
            launchStrategy: 'fallback',
            scanType: 'simple-fallback'
          }
        });
      } catch (fallbackError) {
        console.error('Fallback scan also failed:', fallbackError);
        return NextResponse.json({ 
          error: 'All scan methods failed',
          message: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Use worker for scanning
    const results = await workerIntegration.performSyncScan(url);

    return NextResponse.json(results);

  } catch (error) {
    console.error('Worker sync scan error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST method with URL in body to scan a website' },
    { status: 405 }
  );
}