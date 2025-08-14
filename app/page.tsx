'use client';

import { useState } from 'react';
import DemoResults from '../components/DemoResults';

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

export default function Home() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanType, setScanType] = useState<'full' | 'simple'>('simple');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      let response;
      let apiEndpoint = scanType === 'full' ? '/api/scan' : '/api/scan-simple';

      response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // If full scan fails, automatically try simple scan
        if (scanType === 'full' && errorData.type === 'browser_launch_error') {
          console.log('Full scan failed, trying simple scan...');
          const simpleResponse = await fetch('/api/scan-simple', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url.trim() }),
          });
          
          if (simpleResponse.ok) {
            const simpleData = await simpleResponse.json();
            setResults(simpleData);
            setScanType('simple');
            return;
          }
        }
        
        throw new Error(errorData.error || 'Failed to scan URL');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Ada SnapFix
          </h1>
          <p className="text-lg text-gray-600">
            Accessibility Scanner & Fix Generator
          </p>
        </div>

        {/* URL Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <div className="flex gap-3">
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  style={{ color: 'black' }}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !url.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Scanning...' : 'Scan'}
                </button>
              </div>
            </div>
            
            {/* Scan Type Selection */}
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scanType"
                  value="simple"
                  checked={scanType === 'simple'}
                  onChange={(e) => setScanType(e.target.value as 'full' | 'simple')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 font-medium">Simple Scan (Basic Checks) - Always Works</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scanType"
                  value="full"
                  checked={scanType === 'full'}
                  onChange={(e) => setScanType(e.target.value as 'full' | 'simple')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Full Scan (Playwright + Axe) - Enhanced Testing</span>
              </label>
            </div>
            
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Scan Options</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p><strong>Simple Scan:</strong> Fast, reliable checks for basic accessibility issues. Works on all platforms.</p>
                    <p><strong>Full Scan:</strong> Comprehensive testing with Playwright + Axe-core. May not work on all serverless platforms.</p>
                  </div>
                </div>
              </div>
            </div>
          </form>
          
          {/* Demo Results */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <DemoResults />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {scanType === 'full' ? 'Running comprehensive accessibility scan...' : 'Scanning website for accessibility issues...'}
            </p>
          </div>
        )}

        {/* Results Display */}
        {results && (
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

            {/* Processed Issues List */}
            <div className="divide-y divide-gray-200">
              {results.issues.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <div className="text-green-500 text-4xl mb-4">✓</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Issues Found!</h3>
                  <p className="text-gray-600">Great job! This website appears to be accessible.</p>
                </div>
              ) : (
                results.issues.map((issue, index) => (
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
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}