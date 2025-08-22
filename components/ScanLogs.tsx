'use client';

import { useEffect, useRef, useState } from 'react';

interface LogEntry {
  type: 'log' | 'error' | 'success';
  message: string;
  timestamp: string;
}

interface ScanLogsProps {
  isVisible: boolean;
  url: string;
  scanType: 'full' | 'simple';
  onComplete?: (results: any) => void;
  onError?: (error: string) => void;
}

export default function ScanLogs({ isVisible, url, scanType, onComplete, onError }: ScanLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    if (!isVisible || !url) return;

    // Reset state
    setLogs([]);
    setIsConnected(false);
    setIsComplete(false);

    // Use streaming for both full and simple scans
    const apiEndpoint = scanType === 'full' ? '/api/scan' : '/api/scan-simple';

    // Add request deduplication
    let isRequestActive = false;
    let abortController: AbortController | null = null;

    // Use fetch with streaming for full scans
    const startStreamingScan = async () => {
      // Prevent multiple simultaneous requests
      if (isRequestActive) {
        console.log('Scan already in progress, skipping duplicate request');
        return;
      }

      isRequestActive = true;
      abortController = new AbortController();
      try {
        setIsConnected(true);
        setLogs(prev => [...prev, { 
          type: 'log', 
          message: 'Starting streaming scan...', 
          timestamp: new Date().toISOString() 
        }]);

        // Add timeout to prevent hanging requests
        const timeoutId = setTimeout(() => {
          if (abortController) {
            abortController.abort();
          }
        }, 300000); // 5 minutes timeout

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({ url }),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'results') {
                  setIsComplete(true);
                  setIsConnected(false);
                  onComplete?.(data.data);
                  return;
                } else if (data.type === 'results-encoded') {
                  // Decode base64 results
                  try {
                    const decodedData = Buffer.from(data.data, 'base64').toString('utf8');
                    const parsedResults = JSON.parse(decodedData);
                    setIsComplete(true);
                    setIsConnected(false);
                    onComplete?.(parsedResults.data);
                    return;
                  } catch (decodeError) {
                    console.error('Failed to decode base64 results:', decodeError);
                    setLogs(prev => [...prev, { 
                      type: 'error', 
                      message: 'Failed to decode scan results', 
                      timestamp: new Date().toISOString() 
                    }]);
                  }
                } else if (data.type === 'log' || data.type === 'error' || data.type === 'success') {
                  setLogs(prev => [...prev, data]);
                }
              } catch (error) {
                console.error('Error parsing SSE data:', error);
              }
            }
          }
        }
      } catch (error) {
        setIsConnected(false);
        isRequestActive = false;
        
        // Don't show error for aborted requests
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Request was aborted');
          return;
        }
        
        setLogs(prev => [...prev, { 
          type: 'error', 
          message: `Streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          timestamp: new Date().toISOString() 
        }]);
        
        // Try fallback to sync endpoint
        if (scanType === 'full') {
          setLogs(prev => [...prev, { 
            type: 'log', 
            message: 'Trying fallback sync scan...', 
            timestamp: new Date().toISOString() 
          }]);
          
          try {
            const syncResponse = await fetch('/api/scan-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url }),
              signal: abortController.signal,
            });
            
            if (syncResponse.ok) {
              const syncResults = await syncResponse.json();
              setIsComplete(true);
              setIsConnected(false);
              onComplete?.(syncResults);
              return;
            }
          } catch (syncError) {
            console.error('Sync fallback also failed:', syncError);
          }
        }
        
        onError?.(error instanceof Error ? error.message : 'Streaming failed');
      }
    };

    startStreamingScan();

    return () => {
      // Cleanup: abort any ongoing request
      if (abortController) {
        abortController.abort();
      }
      isRequestActive = false;
    };
  }, [isVisible, url, scanType, onComplete, onError]);

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-300 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-700/50';
      case 'error':
        return 'text-red-300 bg-gradient-to-r from-red-900/30 to-pink-900/30 border-red-700/50';
      default:
        return 'text-gray-300 bg-gradient-to-r from-gray-700/50 to-gray-600/50 border-gray-600/50';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-700/80 to-gray-600/80 px-4 py-3 border-b border-gray-600/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-200">Scan Progress</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-sm font-medium text-gray-400">
              {isComplete ? 'Complete' : isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="max-h-64 overflow-y-auto p-4 space-y-2">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="relative mx-auto mb-4">
              <div className="w-10 h-10 border-4 border-gray-600 border-t-cyan-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-gray-400 font-medium text-sm">Waiting for scan to start...</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${getLogColor(log.type)}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getLogIcon(log.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-relaxed">{log.message}</p>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
