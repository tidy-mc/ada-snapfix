// Simple test script for the scan API
const testScan = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://example.com'
      })
    });

    const result = await response.json();
    console.log('Scan result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run test if this file is executed directly
if (require.main === module) {
  testScan();
}

module.exports = { testScan };
