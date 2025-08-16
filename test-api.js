// Simple test script to verify API endpoints
const BASE_URL = 'http://localhost:3000';

async function testScanAPI() {
  console.log('Testing scan API...');
  try {
    const response = await fetch(`${BASE_URL}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Scan API working:', data.totalIssues, 'issues found');
      return data;
    } else {
      console.log('❌ Scan API failed:', response.status);
      return null;
    }
  } catch (error) {
    console.log('❌ Scan API error:', error.message);
    return null;
  }
}

async function testPDFAPI(scanData) {
  console.log('Testing PDF API...');
  try {
    const response = await fetch(`${BASE_URL}/api/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scan: scanData })
    });
    
    if (response.ok) {
      console.log('✅ PDF API working');
      return true;
    } else {
      const error = await response.json();
      console.log('❌ PDF API failed:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ PDF API error:', error.message);
    return false;
  }
}

async function testSuggestAPI() {
  console.log('Testing suggest API...');
  try {
    const response = await fetch(`${BASE_URL}/api/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issue: {
          ruleId: 'image-alt',
          message: 'Images must have alternate text',
          wcag: 'WCAG 2.1 - 1.1.1',
          selector: 'body > img',
          htmlSnippet: '<img src="logo.png">'
        },
        tier: 'free'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Suggest API working:', data.summary);
      return true;
    } else {
      const error = await response.json();
      console.log('❌ Suggest API failed:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ Suggest API error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting API tests...\n');
  
  const scanData = await testScanAPI();
  if (scanData) {
    await testPDFAPI(scanData);
  }
  await testSuggestAPI();
  
  console.log('\n✨ Tests completed!');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runTests();
}
