// Test script for worker integration
const fetch = require('node-fetch');

const NEXTJS_URL = process.env.NEXTJS_URL || 'http://localhost:3000';
const WORKER_URL = process.env.WORKER_URL || 'http://localhost:9999';

async function testWorkerIntegration() {
  console.log('🧪 Testing Worker Integration with Next.js App...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await fetch(`${NEXTJS_URL}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: 'https://example.com' })
    });

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check passed:', {
        status: healthResponse.status,
        hasResults: !!healthData.issues,
        totalIssues: healthData.totalIssues,
        scanType: healthData.metadata?.scanType
      });
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
    }

    // Test 2: Streaming scan
    console.log('\n2️⃣ Testing streaming scan...');
    const streamResponse = await fetch(`${NEXTJS_URL}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ url: 'https://example.com' })
    });

    if (streamResponse.ok) {
      console.log('✅ Streaming scan started successfully');
      
      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let logCount = 0;
      let resultsReceived = false;

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
                console.log('✅ Streaming scan completed:', {
                  url: data.data.url,
                  totalIssues: data.data.totalIssues,
                  scanType: data.data.metadata?.scanType
                });
                resultsReceived = true;
              } else if (data.type === 'log') {
                logCount++;
                if (logCount <= 3) {
                  console.log(`📝 Log: ${data.message}`);
                }
              } else if (data.type === 'error') {
                console.log(`❌ Error: ${data.message}`);
              }
            } catch (parseError) {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      }

      if (resultsReceived) {
        console.log('✅ Streaming scan test passed');
      } else {
        console.log('❌ Streaming scan test failed - no results received');
      }
    } else {
      console.log('❌ Streaming scan failed:', streamResponse.status);
    }

    console.log('\n🎉 Worker integration test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testWorkerIntegration();
}

module.exports = { testWorkerIntegration };
