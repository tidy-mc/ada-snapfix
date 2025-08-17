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
        return 'bg-gradient-to-r from-red-900/30 to-pink-900/30 text-red-300 border-red-700';
      case 'high':
        return 'bg-gradient-to-r from-orange-900/30 to-amber-900/30 text-orange-300 border-orange-700';
      case 'moderate':
      case 'medium':
        return 'bg-gradient-to-r from-yellow-900/30 to-amber-900/30 text-yellow-300 border-yellow-700';
      case 'low':
      case 'minor':
        return 'bg-gradient-to-r from-blue-900/30 to-cyan-900/30 text-blue-300 border-blue-700';
      default:
        return 'bg-gradient-to-r from-gray-700/30 to-gray-600/30 text-gray-300 border-gray-600';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'axe':
        return 'bg-gradient-to-r from-purple-900/30 to-pink-900/30 text-purple-300 border-purple-700';
      case 'simple':
        return 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 text-green-300 border-green-700';
      default:
        return 'bg-gradient-to-r from-gray-700/30 to-gray-600/30 text-gray-300 border-gray-600';
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
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 overflow-hidden">
      {/* Results Header */}
      <div className="bg-gradient-to-r from-gray-700/80 via-gray-600/80 to-gray-700/80 px-6 py-4 border-b border-gray-600/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-200">Scan Results</h2>
            </div>
            <p className="text-gray-400 mb-1 text-sm">
              <span className="font-medium">Scanned:</span> {results.url}
            </p>
            {results.note && (
              <p className="text-cyan-400 text-sm mb-1">{results.note}</p>
            )}
            {results.metadata?.scanType === 'simple-fallback' && (
              <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-700/50 rounded-lg p-2 mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-yellow-300 text-sm font-medium">Fallback Mode Active</span>
                </div>
                <p className="text-yellow-200 text-xs mt-1">
                  Full scan failed on serverless environment. Using simple scan as fallback.
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              {results.metadata?.launchStrategy && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                  Strategy: {results.metadata.launchStrategy}
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Mode: {results.metadata?.scanType || 'standard'}
              </span>
            </div>
          </div>
          <div className="text-center lg:text-right">
            <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {results.totalIssues}
            </div>
            <div className="text-gray-400 font-medium text-sm">Total Issues</div>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {results.summary.axe > 0 && (
            <div className="bg-gray-700/60 backdrop-blur-sm rounded-lg p-3 border border-gray-600/50">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-base font-bold text-gray-200">{results.summary.axe}</div>
                  <div className="text-xs text-gray-400">Axe Issues</div>
                </div>
              </div>
            </div>
          )}
          {results.summary.simple && results.summary.simple > 0 && (
            <div className="bg-gray-700/60 backdrop-blur-sm rounded-lg p-3 border border-gray-600/50">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-base font-bold text-gray-200">{results.summary.simple}</div>
                  <div className="text-xs text-gray-400">Simple Issues</div>
                </div>
              </div>
            </div>
          )}
          {results.summary.pa11y > 0 && (
            <div className="bg-gray-700/60 backdrop-blur-sm rounded-lg p-3 border border-gray-600/50">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-base font-bold text-gray-200">{results.summary.pa11y}</div>
                  <div className="text-xs text-gray-400">Pa11y Issues</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PDF Download and Tier Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-600/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
            >
              {pdfLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-medium">Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium">Download Report</span>
                </>
              )}
            </button>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-300">AI Tier:</label>
              <select
                value={isPaidTier ? 'paid' : 'free'}
                onChange={(e) => setIsPaidTier(e.target.value === 'paid')}
                className="text-sm border-2 border-gray-600 rounded-lg px-2 py-1 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-200 bg-gray-700/50 backdrop-blur-sm text-gray-200"
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </div>

        {/* PDF Error */}
        {errors.pdf && (
          <div className="mt-3 p-3 bg-gradient-to-r from-red-900/30 to-pink-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errors.pdf}
            </div>
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
      <div className="divide-y divide-gray-600/50">
        {results.issues.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-200 mb-2">No Issues Found!</h3>
            <p className="text-gray-400 text-sm">Excellent! This website appears to be highly accessible.</p>
          </div>
        ) : (
          results.issues.map((issue, index) => {
            const issueKey = `${issue.ruleId}-${issue.selector}`;
            const suggestion = suggestions[issueKey];
            const isLoading = loadingStates[issueKey];
            const error = errors[issueKey];

            return (
              <div key={index} className="px-6 py-4 hover:bg-gray-700/30 transition-colors duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-200 mb-2">
                      {issue.ruleId}
                    </h3>
                    <p className="text-gray-400 mb-2 leading-relaxed text-sm">
                      {issue.message}
                    </p>
                    <div className="text-xs text-gray-500 font-mono bg-gray-700/50 px-2 py-1.5 rounded border border-gray-600/50">
                      {issue.selector}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {/* Severity Chip */}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(issue.severity)}`}>
                      {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                    </span>
                    
                    {/* Source Chip */}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSourceColor(issue.source)}`}>
                      {issue.source.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                {/* WCAG Tags */}
                {issue.wcag.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {issue.wcag.map((wcag, wcagIndex) => (
                      <span
                        key={wcagIndex}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-900/30 to-purple-900/30 text-indigo-300 border border-indigo-700/50"
                      >
                        {wcag}
                      </span>
                    ))}
                  </div>
                )}

                {/* AI Suggestion Section */}
                <div className="mt-4 pt-4 border-t border-gray-600/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-gray-200">AI Fix Suggestion</h4>
                    <button
                      onClick={() => handleGetSuggestion(issue)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span>Get AI Fix</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-3 bg-gradient-to-r from-red-900/30 to-pink-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                      </div>
                    </div>
                  )}

                  {/* Suggestion Content */}
                  {suggestion && (
                    <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg p-4">
                      <p className="text-gray-300 mb-3 leading-relaxed text-sm">
                        <strong className="text-gray-200">Summary:</strong> {suggestion.summary}
                      </p>
                      
                      {isPaidTier && suggestion.code && (
                        <div className="mb-3">
                          <strong className="text-gray-200 block mb-1 text-sm">Code Fix:</strong>
                          <pre className="text-xs bg-gray-800/80 backdrop-blur-sm border border-green-700/50 rounded p-3 mt-1 overflow-x-auto font-mono text-gray-300">
                            {suggestion.code}
                          </pre>
                        </div>
                      )}
                      
                      {isPaidTier && suggestion.wcag && (
                        <p className="text-xs text-gray-400">
                          <strong className="text-gray-300">WCAG Note:</strong> {suggestion.wcag}
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
