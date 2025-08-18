const express = require('express');
const { chromium } = require('playwright');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'playwright-browser-service' });
});

// Browser service endpoint
app.get('/browser', async (req, res) => {
  try {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const browserWSEndpoint = browser.wsEndpoint();
    
    res.json({
      success: true,
      wsEndpoint: browserWSEndpoint,
      message: 'Browser launched successfully'
    });
  } catch (error) {
    console.error('Failed to launch browser:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Playwright Browser Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Browser endpoint: http://localhost:${PORT}/browser`);
});
