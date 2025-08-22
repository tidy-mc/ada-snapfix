const { workerIntegration } = require('./lib/worker-integration.ts');

async function testWorkerFix() {
  console.log('Testing improved worker integration...');
  
  try {
    // Test health check
    console.log('\n1. Testing health check...');
    const isHealthy = await workerIntegration.checkHealth();
    console.log('Worker healthy:', isHealthy);
    
    if (!isHealthy) {
      console.log('❌ Worker is not healthy, skipping scan test');
      return;
    }
    
    // Test sync scan
    console.log('\n2. Testing sync scan...');
    const results = await workerIntegration.performSyncScan('https://example.com');
    console.log('✅ Sync scan completed successfully');
    console.log('Results summary:', {
      url: results.url,
      totalIssues: results.totalIssues,
      scanType: results.metadata?.scanType
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWorkerFix();
