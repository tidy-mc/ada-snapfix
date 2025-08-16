'use client';

import { useState } from 'react';
import { Issue, SuggestResponse } from '@/lib/types';

// Sample data for demonstration
const sampleResults = {
  url: "https://example.com",
  timestamp: "2024-01-01T12:00:00.000Z",
  totalIssues: 6,
  mode: "quick",
  axe: [
    {
      id: "link-name-clarity",
      help: "Links must have descriptive text",
      description: "Avoid vague link text like 'click here' or 'read more'",
      nodes: [
        {
          target: ["body > div > a"],
          failureSummary: "Link text 'Click here' is too vague"
        }
      ]
    },
    {
      id: "form-field-labels",
      help: "Form fields must have accessible labels",
      description: "Ensure all form fields have proper labels",
      nodes: [
        {
          target: ["body > div > input"],
          failureSummary: "Input field lacks accessible label"
        }
      ]
    }
  ],
  issues: [
    {
      selector: "body > div > img",
      ruleId: "image-alt",
      wcag: "WCAG 2.1 - 1.1.1",
      impact: "critical" as const,
      message: "Images must have alternate text",
      source: "axe" as const,
    },
    {
      selector: "body > div > button",
      ruleId: "button-name",
      wcag: "WCAG 2.1 - 4.1.2",
      impact: "serious" as const,
      message: "Buttons must have accessible names",
      source: "axe" as const,
    },
    {
      selector: "body > div > a",
      ruleId: "link-name-clarity",
      wcag: "WCAG 2.1 - 2.4.4",
      impact: "moderate" as const,
      message: "Link text 'Click here' is too vague",
      source: "axe" as const,
    },
    {
      selector: "body > div > input",
      ruleId: "form-field-labels",
      wcag: "WCAG 2.1 - 1.3.1",
      impact: "critical" as const,
      message: "Form field lacks accessible label",
      source: "axe" as const,
    },
  ],
  summary: {
    axe: 4,
    pa11y: 0,
  },
};

export default function DemoResults() {
  const [showDemo, setShowDemo] = useState(false);
  const [isPaidTier, setIsPaidTier] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = useState<Record<string, SuggestResponse>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pdfLoading, setPdfLoading] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-900/30 text-red-300 border-red-700';
      case 'serious':
        return 'bg-orange-900/30 text-orange-300 border-orange-700';
      case 'moderate':
      case 'medium':
        return 'bg-yellow-900/30 text-yellow-300 border-yellow-700';
      case 'minor':
        return 'bg-blue-900/30 text-blue-300 border-blue-700';
      default:
        return 'bg-gray-700/30 text-gray-300 border-gray-600';
    }
  };

  const getSourceColor = (source: string) => {
    return source === 'axe' 
      ? 'bg-purple-900/30 text-purple-300 border-purple-700'
      : 'bg-green-900/30 text-green-300 border-green-700';
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    setErrors(prev => ({ ...prev, pdf: '' }));
    
    try {
      const response = await fetch('/api/report/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan: sampleResults })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Check if it's HTML or PDF based on content type
      const contentType = response.headers.get('content-type');
      const isHtml = contentType && contentType.includes('text/html');
      const extension = isHtml ? 'html' : 'pdf';
      const filename = `ada-snapfix-report-${new Date().toISOString().split('T')[0]}.${extension}`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        pdf: error instanceof Error ? error.message : 'Failed to download PDF' 
      }));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleGetSuggestion = async (issue: Issue) => {
    const issueKey = `${issue.ruleId}-${issue.selector}`;
    setLoadingStates(prev => ({ ...prev, [issueKey]: true }));
    setErrors(prev => ({ ...prev, [issueKey]: '' }));
    
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue: {
            ruleId: issue.ruleId || issue.id || '',
            message: issue.message || '',
            wcag: issue.wcag || '',
            selector: issue.selector || '',
            htmlSnippet: issue.selector || ''
          },
          tier: isPaidTier ? 'paid' : 'free'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get suggestion');
      }

      const suggestion = await response.json();
      setSuggestions(prev => ({ ...prev, [issueKey]: suggestion }));
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        [issueKey]: error instanceof Error ? error.message : 'Failed to get suggestion' 
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [issueKey]: false }));
    }
  };

  if (!showDemo) {
    return (
      <div className="text-center">
        <button
          onClick={() => setShowDemo(true)}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          View Demo Results
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 overflow-hidden">
      {/* Results Header */}
      <div className="bg-gray-700/80 px-4 py-3 border-b border-gray-600/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-200">Demo Scan Results</h2>
            <p className="text-sm text-gray-400 mt-1">
              Scanned: {sampleResults.url}
            </p>
            <p className="text-sm text-gray-400">
              Mode: {sampleResults.mode}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-200">{sampleResults.totalIssues}</div>
            <div className="text-sm text-gray-400">Total Issues</div>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="flex gap-3 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span className="text-xs text-gray-400">
              Axe: {sampleResults.summary.axe} issues
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-xs text-gray-400">
              Pa11y: {sampleResults.summary.pa11y} issues
            </span>
          </div>
        </div>

        {/* PDF Download and Tier Toggle */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600/50">
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {pdfLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Report</span>
                </>
              )}
            </button>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300">AI Tier:</label>
              <select
                value={isPaidTier ? 'paid' : 'free'}
                onChange={(e) => setIsPaidTier(e.target.value === 'paid')}
                className="text-sm border border-gray-600 rounded px-2 py-1 bg-gray-700/50 text-gray-200"
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </div>

        {/* PDF Error */}
        {errors.pdf && (
          <div className="mt-2 p-2 bg-red-900/30 border border-red-700/50 rounded text-red-300 text-sm">
            {errors.pdf}
          </div>
        )}
      </div>

      {/* Issues List */}
      <div className="divide-y divide-gray-600/50">
        {sampleResults.issues.map((issue, index) => {
          const issueKey = `${issue.ruleId}-${issue.selector}`;
          const suggestion = suggestions[issueKey];
          const isLoading = loadingStates[issueKey];
          const error = errors[issueKey];

          return (
            <div key={index} className="px-4 py-3 hover:bg-gray-700/30">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-200 mb-1">
                    {issue.ruleId}
                  </h3>
                  <p className="text-sm text-gray-400 mb-2">
                    {issue.message}
                  </p>
                  <div className="text-xs text-gray-500 font-mono bg-gray-700/50 px-2 py-1 rounded border border-gray-600/50">
                    {issue.selector}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  {/* Severity Chip */}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(issue.impact || 'moderate')}`}>
                    {(issue.impact || 'moderate').charAt(0).toUpperCase() + (issue.impact || 'moderate').slice(1)}
                  </span>
                  
                  {/* Source Chip */}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSourceColor(issue.source)}`}>
                    {issue.source.toUpperCase()}
                  </span>
                </div>
              </div>
              
              {/* WCAG Tags */}
              {issue.wcag && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                    {issue.wcag}
                  </span>
                </div>
              )}

              {/* AI Suggestion Section */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">AI Fix Suggestion</h4>
                  <button
                    onClick={() => handleGetSuggestion(issue)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        🤖 Get AI Fix
                      </>
                    )}
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs mb-2">
                    {error}
                  </div>
                )}

                {/* Suggestion Content */}
                {suggestion && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-sm text-gray-800 mb-2">
                      <strong>Summary:</strong> {suggestion.summary}
                    </p>
                    
                    {isPaidTier && suggestion.code && (
                      <div className="mb-2">
                        <strong className="text-sm text-gray-800">Code Fix:</strong>
                        <pre className="text-xs bg-white border border-green-300 rounded p-2 mt-1 overflow-x-auto">
                          {suggestion.code}
                        </pre>
                      </div>
                    )}
                    
                    {isPaidTier && suggestion.wcag && (
                      <p className="text-xs text-gray-600">
                        <strong>WCAG Note:</strong> {suggestion.wcag}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="px-6 py-4 bg-gray-50 text-center">
        <button
          onClick={() => setShowDemo(false)}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Hide Demo
        </button>
      </div>
    </div>
  );
}
