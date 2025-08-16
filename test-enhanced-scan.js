const fetch = require('node-fetch');

// Test URLs with known accessibility issues
const TEST_URLS = [
  'https://example.com', // Basic test
  'https://www.w3.org/WAI/WCAG21/quickref/', // WCAG reference site
  'https://www.google.com', // Complex site
  'https://www.github.com', // Another complex site
  'https://www.wikipedia.org' // Content-heavy site
];

async function testEnhancedScan(url) {
  console.log(`\n🔍 Testing enhanced scan for: ${url}`);
  console.log('=' .repeat(60));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3000/api/scan/enhanced-simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!response.ok) {
      console.log(`❌ Failed to scan ${url}: ${response.status} ${response.statusText}`);
      return;
    }

    const result = await response.json();
    
    if (!result.success) {
      console.log(`❌ Scan failed for ${url}: ${result.error}`);
      return;
    }

    console.log(`✅ Scan completed in ${duration}ms`);
    console.log(`📊 Mode: ${result.mode}`);
    console.log(`📈 Total issues: ${result.meta.totalIssues}`);
    console.log(`🎯 WCAG coverage: ${result.meta.wcagCoverage.percentage}% (${result.meta.wcagCoverage.covered}/${result.meta.wcagCoverage.total})`);
    
    console.log('\n📋 Issues by source:');
    Object.entries(result.meta.issuesBySource).forEach(([source, count]) => {
      console.log(`   ${source}: ${count} issues`);
    });
    
    console.log('\n🚨 Issues by severity:');
    Object.entries(result.meta.issuesBySeverity).forEach(([severity, count]) => {
      console.log(`   ${severity}: ${count} issues`);
    });
    
    console.log('\n📄 Page info:');
    console.log(`   Title: ${result.meta.pageInfo.title || 'N/A'}`);
    console.log(`   Language: ${result.meta.pageInfo.language || 'N/A'}`);
    console.log(`   Skip link: ${result.meta.pageInfo.hasSkipLink ? '✅' : '❌'}`);
    console.log(`   Forms: ${result.meta.pageInfo.formCount}`);
    console.log(`   Images: ${result.meta.pageInfo.imageCount}`);
    console.log(`   Links: ${result.meta.pageInfo.linkCount}`);
    
    // Show some sample issues
    if (result.issues.length > 0) {
      console.log('\n🔍 Sample issues:');
      result.issues.slice(0, 5).forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.source}] ${issue.ruleId}: ${issue.message}`);
        console.log(`      WCAG: ${issue.wcag.join(', ')} | Severity: ${issue.severity}`);
      });
      
      if (result.issues.length > 5) {
        console.log(`   ... and ${result.issues.length - 5} more issues`);
      }
    }
    
    return {
      url,
      success: true,
      duration,
      totalIssues: result.meta.totalIssues,
      wcagCoverage: result.meta.wcagCoverage.percentage,
      issuesBySource: result.meta.issuesBySource,
      issuesBySeverity: result.meta.issuesBySeverity
    };

  } catch (error) {
    console.log(`❌ Error testing ${url}: ${error.message}`);
    return {
      url,
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🚀 Starting Enhanced Accessibility Scanner Tests');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const url of TEST_URLS) {
    const result = await testEnhancedScan(url);
    results.push(result);
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  console.log(`✅ Successful tests: ${successfulTests.length}/${results.length}`);
  console.log(`❌ Failed tests: ${failedTests.length}/${results.length}`);
  
  if (successfulTests.length > 0) {
    const avgDuration = Math.round(successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length);
    const avgIssues = Math.round(successfulTests.reduce((sum, r) => sum + r.totalIssues, 0) / successfulTests.length);
    const avgCoverage = Math.round(successfulTests.reduce((sum, r) => sum + r.wcagCoverage, 0) / successfulTests.length);
    
    console.log(`⏱️  Average scan duration: ${avgDuration}ms`);
    console.log(`📈 Average issues found: ${avgIssues}`);
    console.log(`🎯 Average WCAG coverage: ${avgCoverage}%`);
    
    // Coverage analysis
    const highCoverage = successfulTests.filter(r => r.wcagCoverage >= 80);
    const mediumCoverage = successfulTests.filter(r => r.wcagCoverage >= 60 && r.wcagCoverage < 80);
    const lowCoverage = successfulTests.filter(r => r.wcagCoverage < 60);
    
    console.log(`\n🎯 Coverage Analysis:`);
    console.log(`   High coverage (80%+): ${highCoverage.length} tests`);
    console.log(`   Medium coverage (60-79%): ${mediumCoverage.length} tests`);
    console.log(`   Low coverage (<60%): ${lowCoverage.length} tests`);
  }
  
  if (failedTests.length > 0) {
    console.log('\n❌ Failed tests:');
    failedTests.forEach(test => {
      console.log(`   ${test.url}: ${test.error}`);
    });
  }
  
  console.log('\n✨ Test completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEnhancedScan, runTests };
