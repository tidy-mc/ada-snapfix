'use client';

import { useState } from 'react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-indigo-400/20 to-cyan-500/20 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="relative z-10">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-2 lg:py-3">
        {/* Header */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl mb-2 shadow-xl shadow-cyan-500/25">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent mb-1">
            Ada SnapFix
          </h1>
          <p className="text-sm text-gray-300 max-w-lg mx-auto">
            Intelligent Accessibility Scanner & AI-Powered Fix Generator
          </p>
        </div>

        {/* URL Form */}
        <div className="max-w-4xl mx-auto mb-3">
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-4 lg:p-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="url" className="block text-base font-semibold text-gray-200 mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                  Website URL
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 px-3 py-2 text-base border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-200 bg-gray-700/50 backdrop-blur-sm text-white placeholder-gray-400"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !url.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-base font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-700 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span>Start Scan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            
              
              {/* Scan Type Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="relative cursor-pointer group">
                  <input
                    type="radio"
                    name="scanType"
                    value="simple"
                    checked={scanType === 'simple'}
                    onChange={(e) => setScanType(e.target.value as 'full' | 'simple')}
                    className="sr-only"
                  />
                  <div className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    scanType === 'simple' 
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-md shadow-cyan-500/25' 
                      : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700/70'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                        scanType === 'simple' ? 'border-cyan-500 bg-cyan-500' : 'border-gray-500'
                      }`}>
                        {scanType === 'simple' && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-200 flex items-center gap-2 text-sm">
                        <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Simple Scan
                      </h3>
                    </div>
                    <p className="text-gray-400 text-xs">
                      Fast, reliable checks for basic accessibility issues.
                    </p>
                  </div>
                </label>
                
                <label className="relative cursor-pointer group">
                  <input
                    type="radio"
                    name="scanType"
                    value="full"
                    checked={scanType === 'full'}
                    onChange={(e) => setScanType(e.target.value as 'full' | 'simple')}
                    className="sr-only"
                  />
                  <div className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    scanType === 'full' 
                      ? 'border-blue-500 bg-blue-500/10 shadow-md shadow-blue-500/25' 
                      : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700/70'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                        scanType === 'full' ? 'border-blue-500 bg-blue-500' : 'border-gray-500'
                      }`}>
                        {scanType === 'full' && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-200 flex items-center gap-2 text-sm">
                        <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Full Scan
                      </h3>
                    </div>
                    <p className="text-gray-400 text-xs">
                      Comprehensive testing with Playwright + Axe-core.
                    </p>
                  </div>
                </label>
              </div>
              
              {/* Info Box */}
              <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 border border-gray-600/50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-200 mb-1">Scan Options</h3>
                    <div className="text-gray-400 text-xs space-y-0.5">
                      <p><strong className="text-cyan-400">Simple Scan:</strong> Quick checks for basic accessibility validation.</p>
                      <p><strong className="text-blue-400">Full Scan:</strong> Comprehensive analysis with AI-powered suggestions.</p>
                    </div>
                  </div>
                </div>
              </div>
            </form>
            
            {/* Real-time Logs */}
            <div className="mt-3 pt-3 border-t border-gray-600/50">
              <ScanLogs
                isVisible={showLogs}
                url={url}
                scanType={scanType}
                onComplete={handleScanComplete}
                onError={handleScanError}
              />
            </div>
          </div>
        </div>

                 {/* Results Display */}
         {results && (
           <div className="max-w-6xl mx-auto mt-3">
             <ScanResults results={results} />
           </div>
         )}

         {/* Error Display */}
         {error && (
           <div className="max-w-4xl mx-auto mt-3">
             <div className="bg-gradient-to-r from-red-900/80 to-pink-900/80 border border-red-700/50 rounded-lg p-3 shadow-lg">
               <div className="flex items-start gap-2">
                 <div className="flex-shrink-0">
                   <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                     <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                   </div>
                 </div>
                 <div>
                   <h3 className="text-sm font-semibold text-red-300 mb-1">Error</h3>
                   <div className="text-red-200 text-xs">{error}</div>
                 </div>
               </div>
             </div>
           </div>
         )}

         {/* Loading State */}
         {isLoading && !showLogs && (
           <div className="max-w-4xl mx-auto mt-3">
             <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700/50 p-4 text-center">
               <div className="relative">
                 <div className="w-12 h-12 border-4 border-gray-600 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-pulse"></div>
                 </div>
               </div>
               <h3 className="text-sm font-semibold text-gray-200 mb-1">
                 {scanType === 'full' ? 'Running Comprehensive Scan' : 'Analyzing Website'}
               </h3>
               <p className="text-gray-400 text-xs">
                 {scanType === 'full' 
                   ? 'Performing detailed accessibility analysis...' 
                   : 'Checking for basic accessibility issues...'
                 }
               </p>
             </div>
           </div>
                   )}
       </div>
     </div>
     </div>
   );
 }