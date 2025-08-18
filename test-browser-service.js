const { chromium } = require('playwright-chromium');

async function testBrowserService() {
  const browserServiceUrl = process.env.PLAYWRIGHT_BROWSER_WS_ENDPOINT;
  
  if (!browserServiceUrl) {
    console.log('❌ No browser service URL configured');
    console.log('Please set PLAYWRIGHT_BROWSER_WS_ENDPOINT environment variable');
    return;
  }

  console.log('🔍 Testing browser service connection...');
  console.log(`URL: ${browserServiceUrl}`);

  try {
    // Test health endpoint first
    const healthUrl = browserServiceUrl.replace('wss://', 'https://').replace('/browser', '/health');
    console.log(`\n🏥 Testing health endpoint: ${healthUrl}`);
    
    const healthResponse = await fetch(healthUrl);
    const healthData = await healthResponse.json();
    console.log('Health check response:', healthData);

    // Test browser connection
    console.log('\n🌐 Testing browser connection...');
    const browser = await chromium.connect({
      wsEndpoint: browserServiceUrl
    });

    console.log('✅ Successfully connected to browser service!');

    // Test basic browser functionality
    console.log('\n🧪 Testing browser functionality...');
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const title = await page.title();
    console.log(`✅ Page title: ${title}`);

    await page.close();
    await browser.close();
    console.log('\n🎉 All tests passed! Browser service is working correctly.');

  } catch (error) {
    console.error('\n❌ Browser service test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if browser service is deployed and running');
    console.log('2. Verify the WebSocket URL is correct');
    console.log('3. Check browser service logs for errors');
    console.log('4. Ensure CORS is properly configured');
  }
}

// Run the test
testBrowserService();
