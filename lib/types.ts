export type Issue = {
  id?: string;             // axe id
  ruleId?: string;         // alias
  impact?: "critical"|"serious"|"moderate"|"minor"|null;
  description?: string;
  help?: string;
  message?: string;
  wcag?: string;           // e.g., "WCAG 2.1 - 2.4.4"
  selector?: string;       // CSS selector or xpath
  nodes?: { target?: string[] }[];
  suggestion?: { summary?: string; code?: string; wcag?: string };
};

export type ScanResult = {
  url: string;
  timestamp: string;
  totalIssues: number;
  issues: Issue[];
  score?: number;
  mode?: string;
  axe?: any[];
  summary?: {
    axe: number;
    pa11y: number;
  };
  metadata?: {
    launchStrategy?: string;
    scanType?: string;
  };
};

export type PDFRequest = {
  url?: string;
  scan?: ScanResult;
};

export type SuggestRequest = {
  issue: {
    ruleId: string;
    message: string;
    wcag: string;
    selector: string;
    htmlSnippet: string;
  };
  tier: "free" | "paid";
};

export type SuggestResponse = {
  summary: string;
  code?: string;
  wcag?: string;
};

export type AxeResult = {
  violations: Array<{
    id: string;
    impact: string;
    tags: string[];
    description: string;
    help: string;
    helpUrl: string;
    nodes: Array<{
      html: string;
      target: string[];
      failureSummary: string;
      impact: string;
    }>;
  }>;
};
