'use client';

import { useState } from 'react';
import { Issue, SuggestResponse } from '@/lib/types';

interface ScanResult {
  selector: string;
  ruleId: string;
  wcag: string[];
  severity: string;
  message: string;
  source: 'axe' | 'simple';
}

interface ScanResponse {
  url: string;
  timestamp: string;
  totalIssues: number;
  axe?: any[];
  issues: ScanResult[];
  summary: {
    axe: number;
    pa11y: number;
    simple?: number;
  };
  note?: string;
  metadata?: {
    launchStrategy?: string;
    scanType?: string;
  };
}

interface ScanResultsProps {
  results: ScanResponse;
}

export default function ScanResults({ results }: ScanResultsProps) {
  const [isPaidTier, setIsPaidTier] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = useState<Record<string, SuggestResponse>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pdfLoading, setPdfLoading] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
      case 'minor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'axe':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'simple':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    setErrors(prev => ({ ...prev, pdf: '' }));
    
    try {
      // Convert scan results to the format expected by PDF API
      const scanData = {
        url: results.url,
        timestamp: results.timestamp,
        totalIssues: results.totalIssues,
        issues: results.issues.map(issue => ({
          ruleId: issue.ruleId,
          impact: issue.severity as any,
          message: issue.message,
          wcag: issue.wcag.join(', '),
          selector: issue.selector,
          source: issue.source
        })),
        mode: results.metadata?.scanType || 'standard'
      };

      const response = await fetch('/api/report/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan: scanData })
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

  const handleGetSuggestion = async (issue: ScanResult) => {
    const issueKey = `${issue.ruleId}-${issue.selector}`;
    setLoadingStates(prev => ({ ...prev, [issueKey]: true }));
    setErrors(prev => ({ ...prev, [issueKey]: '' }));
    
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue: {
            ruleId: issue.ruleId,
            message: issue.message,
            wcag: issue.wcag.join(', '),
            selector: issue.selector,
            htmlSnippet: issue.selector
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

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Results Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Scan Results</h2>
            <p className="text-sm text-gray-600 mt-1">
              Scanned: {results.url}
            </p>
            {results.note && (
              <p className="text-sm text-blue-600 mt-1">{results.note}</p>
            )}
            {results.metadata?.launchStrategy && (
              <p className="text-sm text-gray-500 mt-1">
                Launch strategy: {results.metadata.launchStrategy}
              </p>
            )}
            <p className="text-sm text-gray-600">
              Mode: {results.metadata?.scanType || 'standard'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{results.totalIssues}</div>
            <div className="text-sm text-gray-600">Total Issues</div>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="flex gap-4 mt-4">
          {results.summary.axe > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
              <span className="text-sm text-gray-600">
                Axe: {results.summary.axe} issues
              </span>
            </div>
          )}
          {results.summary.simple && results.summary.simple > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-sm text-gray-600">
                Simple: {results.summary.simple} issues
              </span>
            </div>
          )}
          {results.summary.pa11y > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span className="text-sm text-gray-600">
                Pa11y: {results.summary.pa11y} issues
              </span>
            </div>
          )}
        </div>

        {/* PDF Download and Tier Toggle */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {pdfLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
                             ) : (
                 <>
                   📄 Download Report
                 </>
               )}
            </button>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">AI Tier:</label>
              <select
                value={isPaidTier ? 'paid' : 'free'}
                onChange={(e) => setIsPaidTier(e.target.value === 'paid')}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </div>

        {/* PDF Error */}
        {errors.pdf && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {errors.pdf}
          </div>
        )}
      </div>

      {/* Raw Axe Results */}
      {results.axe && results.axe.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Raw Axe Results</h3>
          {results.axe.map((issue, idx) => (
            <div key={idx} className="border p-3 my-3 rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">
                {issue.id} — {issue.help}
              </h4>
              <p className="text-sm text-gray-600 mb-3">{issue.description}</p>
              <div className="space-y-2">
                {issue.nodes.map((node: any, i: number) => (
                  <div key={i} className="text-xs font-mono bg-white p-2 rounded border">
                    {node.target.join(", ")}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issues List */}
      <div className="divide-y divide-gray-200">
        {results.issues.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Issues Found!</h3>
            <p className="text-gray-600">Great job! This website appears to be accessible.</p>
          </div>
        ) : (
          results.issues.map((issue, index) => {
            const issueKey = `${issue.ruleId}-${issue.selector}`;
            const suggestion = suggestions[issueKey];
            const isLoading = loadingStates[issueKey];
            const error = errors[issueKey];

            return (
              <div key={index} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      {issue.ruleId}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {issue.message}
                    </p>
                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                      {issue.selector}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {/* Severity Chip */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(issue.severity)}`}>
                      {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                    </span>
                    
                    {/* Source Chip */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSourceColor(issue.source)}`}>
                      {issue.source.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                {/* WCAG Tags */}
                {issue.wcag.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {issue.wcag.map((wcag, wcagIndex) => (
                      <span
                        key={wcagIndex}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                      >
                        {wcag}
                      </span>
                    ))}
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
          })
        )}
      </div>
    </div>
  );
}
