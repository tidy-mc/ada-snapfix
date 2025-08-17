const testStreamingScan = async () => {
  console.log('Testing streaming scan functionality...');
  
  try {
    const response = await fetch('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({ url: 'https://example.com' }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Streaming response received, reading data...');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('Stream completed');
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            console.log(`[${data.type.toUpperCase()}] ${data.message}`);
            
            if (data.type === 'results') {
              console.log('Scan completed successfully!');
              console.log(`Found ${data.data.totalIssues} issues`);
              return;
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testStreamingScan();
