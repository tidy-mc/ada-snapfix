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
    this.workerUrl = process.env.WORKER_SCAN_URL || '';
    this.workerSyncUrl = process.env.WORKER_SCAN_SYNC_URL || '';
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'results') {
              results = data.data;
            } else if (data.type === 'log' && options.onLog) {
              options.onLog(data.message, data.type);
            } else if (data.type === 'error' && options.onLog) {
              options.onLog(data.message, 'error');
            }
          } catch (parseError) {
            console.error('Failed to parse worker response:', parseError);
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
