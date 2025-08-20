import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Issue } from '@/lib/types';
import { checkRateLimit, sanitizeHtmlSnippet } from '@/lib/utils';

// Conditionally import OpenAI
let OpenAI: any;
try {
  OpenAI = require('openai');
} catch (error) {
  console.log('OpenAI not available');
}

const batchSuggestRequestSchema = z.object({
  issues: z.array(z.object({
    id: z.string().optional(),
    ruleId: z.string().min(1, 'Rule ID is required'),
    message: z.string().min(1, 'Message is required'),
    wcag: z.string().min(1, 'WCAG reference is required'),
    selector: z.string().min(1, 'Selector is required'),
    impact: z.enum(['critical', 'serious', 'moderate', 'minor']).optional(),
    nodes: z.array(z.object({
      target: z.array(z.string()).optional()
    })).optional()
  })).min(1, 'At least one issue is required').max(50, 'Maximum 50 issues per batch'),
  tier: z.enum(['free', 'paid'], { required_error: 'Tier must be free or paid' })
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = batchSuggestRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request format', 
          details: validation.error.issues,
          guidance: 'Please provide issues array with ruleId, message, wcag, selector, and tier (free/paid)'
        },
        { status: 400 }
      );
    }

    const { issues, tier } = validation.data;
    
    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    // Check rate limit (more generous for batch requests)
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

    // Check if OpenAI is available
    if (!OpenAI) {
      return NextResponse.json(
        { error: 'AI service not configured', details: 'OpenAI package not available' },
        { status: 503 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured', details: 'OpenAI API key not set' },
        { status: 503 }
      );
    }

    // Create OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Process issues in batches to avoid token limits
    const batchSize = tier === 'free' ? 10 : 5; // Smaller batches for paid tier due to more detailed responses
    const results: Record<string, { summary: string; code?: string; wcag?: string }> = {};

    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);
      
      // Prepare batch prompt
      const systemPrompt = "You are an accessibility expert. Output valid JSON only. Be concise and WCAG-aligned.";
      
      const batchIssues = batch.map((issue, index) => {
        const htmlSnippet = issue.nodes?.[0]?.target?.[0] || issue.selector;
        const sanitizedHtml = sanitizeHtmlSnippet(htmlSnippet, 500); // Shorter for batch processing
        
        return `Issue ${index + 1}:
- RuleId: ${issue.ruleId}
- Message: ${issue.message}
- WCAG: ${issue.wcag}
- Selector: ${issue.selector}
- Impact: ${issue.impact || 'moderate'}
- HTML: \`\`\`${sanitizedHtml}\`\`\``;
      }).join('\n\n');

      const userPrompt = `Tier: ${tier}

${batchIssues}

Return JSON array with objects for each issue:
${tier === 'free' 
  ? '[{"id": "issue_1", "summary": "one-line fix description"}, ...]'
  : '[{"id": "issue_1", "summary": "why it fails, 1-2 sentences", "code": "<code snippet>", "wcag": "mapped sc id with note"}, ...]'
}

Use "issue_1", "issue_2", etc. as IDs matching the order above.`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: tier === 'free' ? 200 * batch.length : 400 * batch.length,
          temperature: 0.3,
          response_format: { type: "json_object" }
        });

        const responseContent = completion.choices[0]?.message?.content;
        if (!responseContent) {
          throw new Error('No response from OpenAI');
        }

        // Parse JSON response
        let batchResults: any[];
        try {
          const parsed = JSON.parse(responseContent);
          // Handle both array and object with numbered keys
          if (Array.isArray(parsed)) {
            batchResults = parsed;
          } else {
            // Convert object with numbered keys to array
            batchResults = Object.keys(parsed)
              .sort()
              .map(key => ({ id: key, ...parsed[key] }));
          }
        } catch (parseError) {
          console.error('Failed to parse OpenAI response:', responseContent);
          throw new Error('Invalid response format from AI service');
        }

        // Map results back to original issues
        batch.forEach((issue, index) => {
          const result = batchResults[index];
          if (result && result.summary) {
            const issueKey = `${issue.ruleId}-${issue.selector}`;
            results[issueKey] = {
              summary: result.summary,
              ...(tier === 'paid' && result.code && { code: result.code }),
              ...(tier === 'paid' && result.wcag && { wcag: result.wcag })
            };
          }
        });

        // Add small delay between batches to be respectful to API
        if (i + batchSize < issues.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (batchError) {
        console.error('Batch processing error:', batchError);
        
        // For batch errors, return partial results
        batch.forEach(issue => {
          const issueKey = `${issue.ruleId}-${issue.selector}`;
          if (!results[issueKey]) {
            results[issueKey] = {
              summary: tier === 'free' 
                ? 'Unable to generate suggestion at this time.'
                : 'Unable to generate detailed suggestion. Please try again later.'
            };
          }
        });
      }
    }

    return NextResponse.json({
      suggestions: results,
      processed: Object.keys(results).length,
      total: issues.length
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
      }
    });

  } catch (error) {
    console.error('Batch suggestion API error:', error);
    
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
      { error: 'Failed to generate batch suggestions', details: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST method with issues array and tier to get batch AI suggestions' },
    { status: 405 }
  );
}
