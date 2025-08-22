const fs = require('fs');
const path = require('path');

// Sample scan data for testing
const sampleScan = {
  url: "https://example.com",
  timestamp: new Date().toISOString(),
  totalIssues: 5,
  issues: [
    {
      id: "color-contrast",
      ruleId: "color-contrast",
      impact: "serious",
      description: "Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds",
      help: "Elements must meet minimum color contrast ratio requirements",
      message: "Elements must meet minimum color contrast ratio requirements",
      wcag: "1.4.3",
      selector: "body > div:nth-child(1) > p:nth-child(2)",
      nodes: [{ target: ["body > div:nth-child(1) > p:nth-child(2)"] }]
    },
    {
      id: "image-alt",
      ruleId: "image-alt",
      impact: "critical",
      description: "Ensures <img> elements have alternate text or a role of none or presentation",
      help: "Images must have alternate text",
      message: "Images must have alternate text",
      wcag: "1.1.1",
      selector: "img[src='logo.png']",
      nodes: [{ target: ["img[src='logo.png']"] }]
    },
    {
      id: "button-name",
      ruleId: "button-name",
      impact: "critical",
      description: "Ensures buttons have accessible names",
      help: "Buttons must have accessible names",
      message: "Buttons must have accessible names",
      wcag: "4.1.2",
      selector: "button[type='submit']",
      nodes: [{ target: ["button[type='submit']"] }]
    },
    {
      id: "heading-order",
      ruleId: "heading-order",
      impact: "moderate",
      description: "Ensures the order of headings is semantically correct",
      help: "Heading levels should only increase by one",
      message: "Heading levels should only increase by one",
      wcag: "1.3.1",
      selector: "h1, h2, h3",
      nodes: [{ target: ["h1", "h2", "h3"] }]
    },
    {
      id: "link-name",
      ruleId: "link-name",
      impact: "minor",
      description: "Ensures links have discernible text",
      help: "Links must have discernible text",
      message: "Links must have discernible text",
      wcag: "2.4.4",
      selector: "a[href='#']",
      nodes: [{ target: ["a[href='#']"] }]
    }
  ],
  mode: "standard"
};

// Test request payload
const testPayload = {
  scan: sampleScan,
  includeAI: true,
  tier: "paid"
};

console.log('Sample scan data created for testing:');
console.log('- URL:', sampleScan.url);
console.log('- Total Issues:', sampleScan.totalIssues);
console.log('- Issues by severity:');
const severityCounts = {};
sampleScan.issues.forEach(issue => {
  severityCounts[issue.impact] = (severityCounts[issue.impact] || 0) + 1;
});
Object.entries(severityCounts).forEach(([severity, count]) => {
  console.log(`  ${severity}: ${count}`);
});

console.log('\nTo test the PDF generation:');
console.log('1. Start the development server: npm run dev');
console.log('2. Send a POST request to /api/report/pdf with this payload:');
console.log(JSON.stringify(testPayload, null, 2));

// Save test data to file for easy access
fs.writeFileSync(
  path.join(__dirname, 'test-pdf-data.json'),
  JSON.stringify(testPayload, null, 2)
);

console.log('\nTest data saved to test-pdf-data.json');
