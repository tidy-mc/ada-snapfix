import { Issue } from './types';

export interface BatchSuggestionsResponse {
  suggestions: Record<string, { summary: string; code?: string; wcag?: string }>;
  processed: number;
  total: number;
}

export async function getSuggestionsForIssues(
  issues: Issue[], 
  tier: 'free' | 'paid'
): Promise<BatchSuggestionsResponse> {
  try {
    const response = await fetch('/api/suggest/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issues, tier })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get suggestions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting batch suggestions:', error);
    throw error;
  }
}

export function getIssueKey(issue: Issue): string {
  return `${issue.ruleId}-${issue.selector}`;
}

export function getSuggestionForIssue(
  issue: Issue,
  suggestions: Record<string, { summary: string; code?: string; wcag?: string }>
): { summary: string; code?: string; wcag?: string } | null {
  const key = getIssueKey(issue);
  return suggestions[key] || null;
}
