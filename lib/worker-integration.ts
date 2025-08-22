interface WorkerScanOptions {
  url: string;
  onLog?: (message: string, type: 'log' | 'error' | 'success') => void;
}

interface WorkerScanResult {
  url: string;
  timestamp: string;
  totalIssues: number;
  issues: any[];
  summary: {
    axe: number;
    pa11y: number;
    simple?: number;
  };
  metadata?: {
    launchStrategy?: string;
    scanType?: string;
  };
}

export class WorkerIntegration {
  private workerUrl: string;
  private workerSyncUrl: string;

  constructor() {
    this.workerUrl = process.env.WORKER_SCAN_URL || 'http://192.70.246.109:9999/api/scan';
    this.workerSyncUrl = process.env.WORKER_SCAN_SYNC_URL || 'http://192.70.246.109:9999/api/scan-sync';
  }

  async performStreamingScan(options: WorkerScanOptions): Promise<WorkerScanResult> {
    if (!this.workerUrl) {
      throw new Error('Worker scan URL not configured');
    }

    const response = await fetch(this.workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ url: options.url })
    });

    if (!response.ok) {
      throw new Error(`Worker scan failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let results: WorkerScanResult | null = null;
    let buffer = '';

    let timeoutId: NodeJS.Timeout;
    const startTime = Date.now();
    const maxDuration = 300000; // 5 minutes

    while (true) {
      // Check for timeout
      if (Date.now() - startTime > maxDuration) {
        throw new Error('Stream timeout - no results received within 5 minutes');
      }

      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      buffer += chunk;
      
      // Process complete lines only
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6).trim();
            
            // Skip empty lines
            if (!jsonStr) continue;
            
            // Try to fix common JSON issues
            let cleanJsonStr = jsonStr;
            
            // Skip if JSON is clearly truncated (missing closing brace)
            if (!cleanJsonStr.includes('}') || cleanJsonStr.split('{').length !== cleanJsonStr.split('}').length) {
              console.log('Skipping truncated JSON:', cleanJsonStr.substring(0, 100) + '...');
              continue;
            }
            
            // Remove any trailing commas before closing braces/brackets
            cleanJsonStr = cleanJsonStr.replace(/,(\s*[}\]])/g, '$1');
            
            // Ensure proper string escaping
            cleanJsonStr = cleanJsonStr.replace(/\\/g, '\\\\');
            
            const data = JSON.parse(cleanJsonStr);

            if (data.type === 'results') {
              results = data.data;
            } else if (data.type === 'results-encoded') {
              // Decode base64 results
              try {
                const decodedData = Buffer.from(data.data, 'base64').toString('utf8');
                const parsedResults = JSON.parse(decodedData);
                results = parsedResults.data;
              } catch (decodeError) {
                console.error('Failed to decode base64 results:', decodeError);
                throw new Error('Failed to decode scan results');
              }
            } else if (data.type === 'complete') {
              // Stream completed successfully
              console.log('Stream completed successfully');
            } else if (data.type === 'log' && options.onLog) {
              options.onLog(data.message, data.type);
            } else if (data.type === 'error' && options.onLog) {
              options.onLog(data.message, 'error');
            }
          } catch (parseError) {
            console.error('Failed to parse worker response:', parseError);
            console.error('Problematic JSON string:', line.slice(6));
            
            // Try to extract partial data if possible
            try {
              const partialData = JSON.parse(line.slice(6) + '"}');
              if (partialData.type === 'log' && options.onLog) {
                options.onLog(partialData.message || 'Partial log data', partialData.type);
              }
            } catch (partialError) {
              // If all parsing fails, just log the raw message
              if (options.onLog) {
                options.onLog(`Raw message: ${line.slice(6)}`, 'log');
              }
            }
          }
        }
      }
    }

    if (!results) {
      throw new Error('No results received from worker');
    }

    return results;
  }

  async performSyncScan(url: string): Promise<WorkerScanResult> {
    if (!this.workerSyncUrl) {
      throw new Error('Worker sync scan URL not configured');
    }

    const response = await fetch(this.workerSyncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`Worker sync scan failed: ${response.status}`);
    }

    return response.json();
  }

  async checkHealth(): Promise<boolean> {
    try {
      const healthUrl = this.workerUrl.replace('/api/scan', '/health');
      const response = await fetch(healthUrl);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getWorkerStats() {
    try {
      const healthUrl = this.workerUrl.replace('/api/scan', '/health');
      const response = await fetch(healthUrl);
      const data = await response.json();
      return {
        healthy: response.ok,
        version: data.version,
        timestamp: data.timestamp
      };
    } catch {
      return { healthy: false };
    }
  }
}

export const workerIntegration = new WorkerIntegration();
