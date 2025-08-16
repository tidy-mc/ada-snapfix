async function testEnhancedScan(url) {
  console.log(`\n🔍 Testing enhanced scan for: ${url}`);
  console.log('=' .repeat(60));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Failed to scan ${url}: ${response.status} ${response.statusText}`);
      console.log(`Error details: ${errorText}`);
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

async function runTest() {
  console.log('🚀 Testing Enhanced Accessibility Scanner');
  console.log('=' .repeat(60));
  
  const result = await testEnhancedScan('https://example.com');
  
  if (result && result.success) {
    console.log('\n📊 TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`✅ Test successful!`);
    console.log(`⏱️  Scan duration: ${result.duration}ms`);
    console.log(`📈 Issues found: ${result.totalIssues}`);
    console.log(`🎯 WCAG coverage: ${result.wcagCoverage}%`);
    
    // Coverage analysis
    if (result.wcagCoverage >= 80) {
      console.log(`🎉 Excellent! WCAG coverage is ${result.wcagCoverage}% (target: 80%+)`);
    } else if (result.wcagCoverage >= 60) {
      console.log(`👍 Good! WCAG coverage is ${result.wcagCoverage}% (target: 80%+)`);
    } else {
      console.log(`⚠️  WCAG coverage is ${result.wcagCoverage}% (target: 80%+)`);
    }
  } else {
    console.log('\n❌ TEST FAILED');
    console.log('=' .repeat(60));
    console.log('The enhanced scanner test failed. Please check the server logs.');
  }
  
  console.log('\n✨ Test completed!');
}

// Run test if this file is executed directly
if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = { testEnhancedScan, runTest };
