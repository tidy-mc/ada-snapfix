import { Issue } from './types';

// Rate limiting store (in-memory for serverless)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function getSeverityScore(issues: Issue[]): number {
  const impactScores = {
    critical: 4,
    serious: 3,
    moderate: 2,
    minor: 1
  };

  const totalScore = issues.reduce((sum, issue) => {
    const impact = issue.impact?.toLowerCase() as keyof typeof impactScores;
    return sum + (impactScores[impact] || 1);
  }, 0);

  const maxPossibleScore = issues.length * 4;
  return maxPossibleScore > 0 ? Math.round(((maxPossibleScore - totalScore) / maxPossibleScore) * 100) : 100;
}

export function sanitizeHtmlSnippet(html: string, maxLength: number = 1000): string {
  if (!html) return '';
  
  // Remove scripts and style tags
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .trim();

  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  return sanitized;
}

export function extractHtmlSnippet(issue: Issue): string {
  if (!issue.nodes || issue.nodes.length === 0) {
    return issue.selector || '';
  }

  const firstNode = issue.nodes[0];
  if (!firstNode.target || firstNode.target.length === 0) {
    return issue.selector || '';
  }

  // For now, return the selector. In a full implementation, you might want to
  // make a follow-up request to get the actual HTML snippet
  return firstNode.target[0] || issue.selector || '';
}

export function checkRateLimit(ip: string, tier: 'free' | 'paid'): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `${ip}:${tier}`;
  const limit = tier === 'free' ? 10 : 30;
  const windowMs = 60 * 1000; // 1 minute

  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }

  // Increment count
  current.count++;
  rateLimitStore.set(key, current);
  
  return { 
    allowed: true, 
    remaining: limit - current.count, 
    resetTime: current.resetTime 
  };
}

export function getSeverityCounts(issues: Issue[]): Record<string, number> {
  const counts: Record<string, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0
  };

  issues.forEach(issue => {
    const impact = issue.impact?.toLowerCase() as keyof typeof counts;
    if (impact && counts.hasOwnProperty(impact)) {
      counts[impact]++;
    }
  });

  return counts;
}
