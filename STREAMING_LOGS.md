# Real-Time Streaming Logs

This document describes the real-time streaming logs functionality that allows users to see server-side logs during the scanning process.

## Overview

The application now supports Server-Sent Events (SSE) to provide real-time feedback during accessibility scans. Users can see detailed progress logs as the scan progresses, including:

- Browser launch attempts and strategies
- Page navigation status
- Axe-core injection and analysis progress
- Error handling and fallback strategies
- Final results summary

## How It Works

### Server-Side Implementation

The scan APIs (`/api/scan` and `/api/scan-simple`) now support two modes:

1. **Regular Mode**: Returns JSON response (backward compatible)
2. **Streaming Mode**: Returns Server-Sent Events with real-time logs

The API detects streaming mode by checking the `Accept` header for `text/event-stream`.

### Client-Side Implementation

The `ScanLogs` component handles the streaming connection and displays logs in real-time:

- Connects to the appropriate API endpoint
- Parses SSE data and updates the UI
- Handles connection errors and fallbacks
- Provides visual feedback for different log types

## API Endpoints

### Full Scan (`/api/scan`)

**Regular Request:**
```javascript
fetch('/api/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com' })
});
```

**Streaming Request:**
```javascript
fetch('/api/scan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  },
  body: JSON.stringify({ url: 'https://example.com' })
});
```

### Simple Scan (`/api/scan-simple`)

Both endpoints support the same streaming pattern.

## Log Message Types

The streaming API sends different types of log messages:

- **`log`**: General information messages
- **`error`**: Error messages (red styling)
- **`success`**: Success messages (green styling)
- **`results`**: Final scan results (closes the stream)

## Example Log Flow

For a full scan, users will see logs like:

```
[LOG] Starting enhanced scan for URL: https://example.com
[LOG] Browser launched successfully with standard strategy
[LOG] Navigating to URL...
[LOG] Page loaded successfully
[LOG] Injecting axe-core...
[LOG] Axe-core injected successfully
[LOG] Running axe-core analysis...
[LOG] Browser closed successfully
[LOG] Processing results...
[SUCCESS] Scan completed successfully. Found 5 issues using standard strategy.
[RESULTS] Final results data...
```

## UI Components

### ScanLogs Component

Located at `components/ScanLogs.tsx`, this component:

- Displays real-time logs in a scrollable container
- Shows connection status (connecting/connected/complete)
- Uses color-coded icons for different log types
- Auto-scrolls to show the latest logs
- Handles connection errors gracefully

### Integration with Main Page

The main page (`app/page.tsx`) now:

- Shows the ScanLogs component during scanning
- Handles scan completion and error states
- Provides fallback to regular loading state if streaming fails

## Error Handling

The streaming implementation includes comprehensive error handling:

1. **Connection Errors**: Falls back to regular scan mode
2. **Parse Errors**: Logs errors but continues processing
3. **Timeout Errors**: Shows appropriate error messages
4. **Browser Launch Failures**: Shows detailed fallback attempts

## Browser Compatibility

The streaming functionality uses modern web APIs:

- `ReadableStream` for streaming responses
- `TextDecoder` for parsing stream data
- `fetch` with streaming support

These APIs are supported in all modern browsers.

## Performance Considerations

- Streaming logs are sent as they occur, providing immediate feedback
- The UI updates efficiently using React state management
- Connection cleanup is handled properly to prevent memory leaks
- Fallback mechanisms ensure the app remains functional even if streaming fails

## Testing

Use the provided test script to verify streaming functionality:

```bash
node test-streaming.js
```

This script demonstrates the streaming API and shows the log flow.

## Future Enhancements

Potential improvements for the streaming functionality:

1. **Progress Indicators**: Add percentage completion for long-running scans
2. **Log Filtering**: Allow users to filter logs by type
3. **Log Export**: Save logs to file for debugging
4. **WebSocket Support**: Use WebSockets for bi-directional communication
5. **Log Persistence**: Store logs in database for historical analysis
