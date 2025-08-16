import pa11y from 'pa11y';

export interface Pa11yResult {
  issues: Array<{
    selector: string;
    ruleId: string;
    wcag: string[];
    severity: string;
    message: string;
    source: 'pa11y';
  }>;
  documentTitle: string;
  pageUrl: string;
  issuesByType: {
    error: number;
    warning: number;
    notice: number;
  };
}

export async function runPa11yAnalysis(url: string): Promise<Pa11yResult> {
  try {
    console.log('Starting Pa11y analysis for:', url);
    
    const results = await pa11y(url, {
      // Standard configuration
      standard: 'WCAG2AA',
      hideElements: 'iframe[src*="google-analytics"], iframe[src*="googletagmanager"]',
      ignore: [
        'notice', // Ignore notices to focus on errors and warnings
      ],
      // Timeout settings
      timeout: 30000,
      wait: 2000,
      // User agent
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      // Headers
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    console.log(`Pa11y analysis completed. Found ${results.issues.length} issues.`);

    // Convert Pa11y results to our format
    const issues = results.issues.map(issue => ({
      selector: issue.selector || 'unknown',
      ruleId: issue.code || 'pa11y-issue',
      wcag: issue.wcag ? [issue.wcag] : [],
      severity: issue.type === 'error' ? 'critical' : issue.type === 'warning' ? 'moderate' : 'minor',
      message: issue.message,
      source: 'pa11y' as const,
    }));

    // Count issues by type
    const issuesByType = {
      error: results.issues.filter(issue => issue.type === 'error').length,
      warning: results.issues.filter(issue => issue.type === 'warning').length,
      notice: results.issues.filter(issue => issue.type === 'notice').length,
    };

    return {
      issues,
      documentTitle: results.documentTitle || '',
      pageUrl: results.pageUrl || url,
      issuesByType
    };

  } catch (error) {
    console.error('Pa11y analysis failed:', error);
    
    // Return empty result on failure
    return {
      issues: [],
      documentTitle: '',
      pageUrl: url,
      issuesByType: {
        error: 0,
        warning: 0,
        notice: 0
      }
    };
  }
}

// Pa11y configuration for different WCAG levels
export const PA11Y_CONFIGS = {
  WCAG2A: {
    standard: 'WCAG2A',
    description: 'WCAG 2.0 Level A compliance'
  },
  WCAG2AA: {
    standard: 'WCAG2AA',
    description: 'WCAG 2.0 Level AA compliance'
  },
  WCAG2AAA: {
    standard: 'WCAG2AAA',
    description: 'WCAG 2.0 Level AAA compliance'
  }
};

// Custom Pa11y rules that complement axe-core
export const CUSTOM_PA11Y_RULES = {
  // Color contrast rules
  'color-contrast': {
    description: 'Elements must have sufficient color contrast',
    wcag: ['1.4.3', '1.4.6']
  },
  // Focus management
  'focus-order-semantics': {
    description: 'Focus order should match logical tab order',
    wcag: ['2.4.3']
  },
  // Keyboard navigation
  'keyboard': {
    description: 'All interactive elements must be keyboard accessible',
    wcag: ['2.1.1', '2.1.2']
  },
  // Form validation
  'form-field-multiple-labels': {
    description: 'Form fields should not have multiple labels',
    wcag: ['1.3.1']
  },
  // Link purpose
  'link-in-text-block': {
    description: 'Links should be distinguishable from surrounding text',
    wcag: ['1.4.1']
  }
};
