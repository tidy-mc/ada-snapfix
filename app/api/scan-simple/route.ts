import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Simple test response without Playwright
    return NextResponse.json({
      url,
      timestamp: new Date().toISOString(),
      totalIssues: 0,
      message: 'Simple API test - Playwright not used',
      status: 'working'
    });

  } catch (error) {
    console.error('Simple API error:', error);
    return NextResponse.json(
      { error: 'Simple API failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Simple test API - Use POST method with URL in body' },
    { status: 405 }
  );
}
