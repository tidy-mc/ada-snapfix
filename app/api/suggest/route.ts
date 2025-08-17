import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SuggestRequest, SuggestResponse } from '@/lib/types';
import { checkRateLimit, sanitizeHtmlSnippet } from '@/lib/utils';

// Conditionally import OpenAI
let OpenAI: any;
try {
  OpenAI = require('openai');
} catch (error) {
  console.log('OpenAI not available');
}

const suggestRequestSchema = z.object({
  issue: z.object({
    ruleId: z.string().min(1, 'Rule ID is required'),
    message: z.string().min(1, 'Message is required'),
    wcag: z.string().min(1, 'WCAG reference is required'),
    selector: z.string().min(1, 'Selector is required'),
    htmlSnippet: z.string().optional()
  }),
  tier: z.enum(['free', 'paid'], { required_error: 'Tier must be free or paid' })
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = suggestRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request format', 
          details: validation.error.issues,
          guidance: 'Please provide ruleId, message, wcag, selector, and tier (free/paid)'
        },
        { status: 400 }
      );
    }

    const { issue, tier } = validation.data;
    
    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    // Check rate limit
    const rateLimit = checkRateLimit(clientIP, tier);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          details: `Limit: ${tier === 'free' ? '10' : '30'} requests per minute`,
          resetTime: new Date(rateLimit.resetTime).toISOString()
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
          }
        }
      );
    }

    // Sanitize HTML snippet
    const sanitizedHtml = sanitizeHtmlSnippet(issue.htmlSnippet || '', 2000);

    // Prepare prompt based on tier
    const systemPrompt = "You are an accessibility expert. Output concise JSON only. Be precise and WCAG-aligned. If unsure, say so.";
    
    const userPrompt = `Issue:
- RuleId: ${issue.ruleId}
- Message: ${issue.message}
- WCAG: ${issue.wcag}
- Selector: ${issue.selector}
- HTML (trimmed): \`\`\`${sanitizedHtml}\`\`\`
Tier: ${tier}

Return JSON with keys:
${tier === 'free' 
  ? '- { "summary": "one-line fix description" }'
  : '- { "summary": "why it fails, 1-2 sentences", "code": "<code snippet or aria example>", "wcag": "mapped sc id with short note" }'
}`;

    // Check if OpenAI is available
    if (!OpenAI) {
      return NextResponse.json(
        { error: 'AI service not configured', details: 'OpenAI package not available' },
        { status: 503 }
      );
    }

    // Create OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured', details: 'OpenAI API key not set' },
        { status: 503 }
      );
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use gpt-4o-mini for cost efficiency
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: tier === 'free' ? 100 : 300,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    let suggestion: SuggestResponse;
    try {
      suggestion = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseContent);
      return NextResponse.json(
        { error: 'Invalid response format from AI service' },
        { status: 500 }
      );
    }

    // Validate response structure
    if (!suggestion.summary) {
      return NextResponse.json(
        { error: 'Invalid AI response - missing summary' },
        { status: 500 }
      );
    }

    if (tier === 'paid' && (!suggestion.code || !suggestion.wcag)) {
      return NextResponse.json(
        { error: 'Invalid AI response - paid tier requires code and wcag fields' },
        { status: 500 }
      );
    }

    return NextResponse.json(suggestion, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
      }
    });

  } catch (error) {
    console.error('Suggestion API error:', error);
    
    if (error instanceof Error) {
      // Handle OpenAI API errors
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return NextResponse.json(
          { error: 'AI service unavailable', details: 'Authentication error' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable', details: 'Service quota exceeded' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate suggestion', details: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST method with issue data and tier to get AI suggestions' },
    { status: 405 }
  );
}
