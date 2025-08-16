'use client';

import { useState } from 'react';
import DemoResults from '../components/DemoResults';
import ScanResults from '../components/ScanResults';
import ScanLogs from '../components/ScanLogs';

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
  const [showLogs, setShowLogs] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults(null);
    setShowLogs(true);

    // For both scan types, we'll use the streaming logs component
    // The actual scan will be handled by the ScanLogs component
    return;
  };

  const handleScanComplete = (scanResults: ScanResponse) => {
    setResults(scanResults);
    setIsLoading(false);
    setShowLogs(false);
  };

  const handleScanError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
    setShowLogs(false);
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
        {isLoading && !showLogs && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {scanType === 'full' ? 'Running comprehensive accessibility scan...' : 'Scanning website for accessibility issues...'}
            </p>
          </div>
        )}

        {/* Real-time Logs */}
        {showLogs && (
          <div className="mb-8">
            <ScanLogs
              isVisible={showLogs}
              url={url}
              scanType={scanType}
              onComplete={handleScanComplete}
              onError={handleScanError}
            />
          </div>
        )}

        {/* Results Display */}
        {results && <ScanResults results={results} />}
      </div>
    </div>
  );
}