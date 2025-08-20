# Playwright Browser Service

A standalone browser service for Vercel deployments.

## Deployment Options

### Option 1: Railway (Recommended)

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Deploy**:
   ```bash
   railway up
   ```

4. **Get your domain**:
   ```bash
   railway domain
   ```

### Option 2: Render

1. **Connect your GitHub repo to Render**
2. **Create a new Web Service**
3. **Set build command**: `npm install`
4. **Set start command**: `npm start`
5. **Deploy**

### Option 3: Fly.io

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**:
   ```bash
   fly auth login
   ```

3. **Deploy**:
   ```bash
   fly launch
   fly deploy
   ```

## Usage

Once deployed, your browser service will be available at:
- **Health check**: `https://your-domain.com/health`
- **Browser endpoint**: `https://your-domain.com/browser`

## Environment Variables

No environment variables required for basic setup.

## Integration with Vercel

Add this environment variable to your Vercel project:
```
PLAYWRIGHT_BROWSER_WS_ENDPOINT=https://your-domain.com/browser
```
