#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Chromium for Ada SnapFix...\n');

try {
  // Install Playwright Chromium
  console.log('📦 Installing Playwright Chromium...');
  execSync('npx playwright install chromium', { stdio: 'inherit' });
  
  console.log('\n✅ Chromium installation completed!');
  console.log('\n📝 Notes:');
  console.log('- PDF generation will work in production (Vercel)');
  console.log('- In local development, if PDF fails, you\'ll get an HTML report instead');
  console.log('- Make sure you have Chrome/Chromium installed on your system for best results');
  
} catch (error) {
  console.error('\n❌ Error installing Chromium:', error.message);
  console.log('\n💡 Alternative solutions:');
  console.log('1. Install Chrome/Chromium manually on your system');
  console.log('2. The app will fallback to HTML reports if PDF generation fails');
  console.log('3. PDF generation will work properly when deployed to Vercel');
}
