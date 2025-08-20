import { Issue, ScanResult } from './types';

export interface ReportIssue extends Issue {
  priorityScore?: number;
  pageUrl?: string;
  category?: string;
}

export interface ReportPayload {
  url: string;
  timestamp: string;
  totalIssues: number;
  issues: ReportIssue[];
  score: number;
  mode: string;
  reportId: string;
  severityCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  pagesWithIssues: Array<{ url: string; count: number }>;
  topIssues: ReportIssue[];
  suggestionsByIssueId: Record<string, { summary: string; code?: string; wcag?: string }>;
}

export function computePriorityScore(issue: Issue): number {
  // Impact weights
  const impactWeights = {
    critical: 4,
    serious: 3,
    moderate: 2,
    minor: 1
  };

  // User impact bonuses
  const userImpactBonuses = {
    keyboard: 2,    // Keyboard navigation issues
    contrast: 2,    // Color contrast issues
    forms: 2,       // Form accessibility issues
    aria: 1,        // ARIA-only issues
    landmarks: 1,   // Landmark issues
    media: 1        // Media accessibility issues
  };

  // Effort estimation (1 = small fix, 2 = refactor, 3 = major change)
  const effortScores = {
    small: 1,
    refactor: 2,
    major: 3
  };

  const impact = issue.impact?.toLowerCase() as keyof typeof impactWeights;
  const impactWeight = impactWeights[impact] || 1;

  // Determine user impact bonus based on issue type
  let userImpactBonus = 0;
  const message = (issue.message || '').toLowerCase();
  const ruleId = (issue.ruleId || '').toLowerCase();
  const wcag = (issue.wcag || '').toLowerCase();

  if (message.includes('keyboard') || message.includes('focus') || ruleId.includes('keyboard')) {
    userImpactBonus = userImpactBonuses.keyboard;
  } else if (message.includes('contrast') || message.includes('color') || wcag.includes('1.4.3') || wcag.includes('1.4.6')) {
    userImpactBonus = userImpactBonuses.contrast;
  } else if (message.includes('form') || message.includes('input') || message.includes('label')) {
    userImpactBonus = userImpactBonuses.forms;
  } else if (message.includes('aria') || message.includes('role')) {
    userImpactBonus = userImpactBonuses.aria;
  } else if (message.includes('landmark') || message.includes('navigation') || message.includes('main')) {
    userImpactBonus = userImpactBonuses.landmarks;
  } else if (message.includes('image') || message.includes('video') || message.includes('audio')) {
    userImpactBonus = userImpactBonuses.media;
  }

  // Estimate effort based on issue complexity
  let effort = effortScores.small;
  if (message.includes('structure') || message.includes('semantic') || message.includes('heading')) {
    effort = effortScores.refactor;
  } else if (message.includes('navigation') || message.includes('menu') || message.includes('complex')) {
    effort = effortScores.major;
  }

  // Calculate final score: (impactWeight + userImpactBonus) * (3 - effort)
  // Higher score = higher priority
  const score = (impactWeight + userImpactBonus) * (3 - effort);
  
  return Math.round(score);
}

export function categorizeIssue(issue: Issue): string {
  const message = (issue.message || '').toLowerCase();
  const ruleId = (issue.ruleId || '').toLowerCase();
  const wcag = (issue.wcag || '').toLowerCase();

  if (message.includes('keyboard') || message.includes('focus') || message.includes('tab') || ruleId.includes('keyboard')) {
    return 'Keyboard Navigation';
  }
  
  if (message.includes('contrast') || message.includes('color') || wcag.includes('1.4.3') || wcag.includes('1.4.6')) {
    return 'Color & Contrast';
  }
  
  if (message.includes('form') || message.includes('input') || message.includes('label') || message.includes('button')) {
    return 'Forms & Controls';
  }
  
  if (message.includes('aria') || message.includes('role') || message.includes('semantic')) {
    return 'ARIA & Semantics';
  }
  
  if (message.includes('landmark') || message.includes('navigation') || message.includes('main') || message.includes('header')) {
    return 'Landmarks & Structure';
  }
  
  if (message.includes('image') || message.includes('alt') || message.includes('video') || message.includes('audio')) {
    return 'Media & Images';
  }
  
  if (message.includes('heading') || message.includes('title') || message.includes('page')) {
    return 'Headings & Titles';
  }
  
  if (message.includes('link') || message.includes('href') || message.includes('anchor')) {
    return 'Links & Navigation';
  }
  
  return 'Other';
}

export function groupIssues(issues: Issue[]): {
  bySeverity: Record<string, Issue[]>;
  byWCAG: Record<string, Issue[]>;
  byCategory: Record<string, Issue[]>;
  byPage: Record<string, Issue[]>;
} {
  const bySeverity: Record<string, Issue[]> = {
    critical: [],
    serious: [],
    moderate: [],
    minor: []
  };

  const byWCAG: Record<string, Issue[]> = {};
  const byCategory: Record<string, Issue[]> = {};
  const byPage: Record<string, Issue[]> = {};

  issues.forEach(issue => {
    // Group by severity
    const severity = issue.impact?.toLowerCase() || 'moderate';
    if (bySeverity[severity]) {
      bySeverity[severity].push(issue);
    }

    // Group by WCAG
    if (issue.wcag) {
      const wcagKey = issue.wcag.split(',')[0].trim(); // Take first WCAG reference
      if (!byWCAG[wcagKey]) {
        byWCAG[wcagKey] = [];
      }
      byWCAG[wcagKey].push(issue);
    }

    // Group by category
    const category = categorizeIssue(issue);
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(issue);

    // Group by page (for now, assume single page - could be enhanced for multi-page scans)
    const pageKey = 'main';
    if (!byPage[pageKey]) {
      byPage[pageKey] = [];
    }
    byPage[pageKey].push(issue);
  });

  return { bySeverity, byWCAG, byCategory, byPage };
}

export function overallScore(issues: Issue[]): number {
  if (issues.length === 0) return 100;

  const severityCounts = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0
  };

  issues.forEach(issue => {
    const severity = issue.impact?.toLowerCase() as keyof typeof severityCounts;
    if (severity && severityCounts.hasOwnProperty(severity)) {
      severityCounts[severity]++;
    }
  });

  // Weighted scoring: critical = -10, serious = -5, moderate = -2, minor = -1
  const weightedScore = 100 - (
    severityCounts.critical * 10 +
    severityCounts.serious * 5 +
    severityCounts.moderate * 2 +
    severityCounts.minor * 1
  );

  return Math.max(0, Math.min(100, weightedScore));
}

export function buildReportPayload(
  scan: ScanResult,
  suggestionsByIssueId: Record<string, { summary: string; code?: string; wcag?: string }> = {}
): ReportPayload {
  // Add priority scores and categories to issues
  const reportIssues: ReportIssue[] = scan.issues.map(issue => ({
    ...issue,
    priorityScore: computePriorityScore(issue),
    category: categorizeIssue(issue),
    pageUrl: scan.url // For now, assume single page
  }));

  // Sort issues by priority score (highest first)
  const sortedIssues = [...reportIssues].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  // Group issues for analysis
  const { bySeverity, byCategory } = groupIssues(reportIssues);

  // Calculate counts
  const severityCounts = {
    critical: bySeverity.critical.length,
    serious: bySeverity.serious.length,
    moderate: bySeverity.moderate.length,
    minor: bySeverity.minor.length
  };

  const categoryCounts: Record<string, number> = {};
  Object.keys(byCategory).forEach(category => {
    categoryCounts[category] = byCategory[category].length;
  });

  // Get pages with most issues (for now, just the main page)
  const pagesWithIssues = [
    { url: scan.url, count: reportIssues.length }
  ];

  // Get top 5 critical issues
  const topIssues = sortedIssues
    .filter(issue => issue.impact === 'critical')
    .slice(0, 5);

  // Generate report ID
  const reportId = `ada-snapfix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    url: scan.url,
    timestamp: scan.timestamp,
    totalIssues: scan.totalIssues,
    issues: reportIssues,
    score: overallScore(reportIssues),
    mode: scan.mode || 'standard',
    reportId,
    severityCounts,
    categoryCounts,
    pagesWithIssues,
    topIssues,
    suggestionsByIssueId
  };
}

export function getNextSteps(categoryCounts: Record<string, number>): string {
  const sortedCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (sortedCategories.length === 0) {
    return "No accessibility issues found. Continue monitoring for new content.";
  }

  const topCategory = sortedCategories[0];
  const suggestions = [];

  if (topCategory[0] === 'Keyboard Navigation') {
    suggestions.push('Focus on keyboard trap resolution and tab order optimization');
  } else if (topCategory[0] === 'Color & Contrast') {
    suggestions.push('Prioritize contrast ratio improvements for text and UI elements');
  } else if (topCategory[0] === 'Forms & Controls') {
    suggestions.push('Ensure all form inputs have proper labels and validation');
  } else if (topCategory[0] === 'ARIA & Semantics') {
    suggestions.push('Implement proper ARIA attributes and semantic HTML structure');
  } else if (topCategory[0] === 'Landmarks & Structure') {
    suggestions.push('Add proper landmark elements and improve page structure');
  } else if (topCategory[0] === 'Media & Images') {
    suggestions.push('Add alt text to images and captions to media content');
  }

  if (suggestions.length > 0) {
    return `Focus sprint on ${suggestions[0].toLowerCase()}. Consider implementing automated testing for ${topCategory[0].toLowerCase()} issues.`;
  }

  return `Address ${topCategory[0].toLowerCase()} issues first, as they represent the highest impact area.`;
}
