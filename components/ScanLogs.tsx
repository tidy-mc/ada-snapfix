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

    // Use fetch with streaming for full scans
    const startStreamingScan = async () => {
      try {
        setIsConnected(true);
        setLogs(prev => [...prev, { 
          type: 'log', 
          message: 'Starting streaming scan...', 
          timestamp: new Date().toISOString() 
        }]);

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({ url }),
        });

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
        setLogs(prev => [...prev, { 
          type: 'error', 
          message: `Streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          timestamp: new Date().toISOString() 
        }]);
        onError?.(error instanceof Error ? error.message : 'Streaming failed');
      }
    };

    startStreamingScan();

    return () => {
      // Cleanup will be handled by the fetch request
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
        return 'text-green-700 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Scan Progress</h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isComplete ? 'Complete' : isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto p-4 space-y-2">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Waiting for scan to start...</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg border ${getLogColor(log.type)}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getLogIcon(log.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{log.message}</p>
                <p className="text-xs opacity-75 mt-1">
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
