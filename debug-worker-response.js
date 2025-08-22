const fetch = require('node-fetch');

async function debugWorkerResponse() {
  const workerUrl = 'http://192.70.246.109:9999/api/scan';
  const testUrl = 'https://example.com';

  console.log('Testing worker response...');
  console.log('Worker URL:', workerUrl);
  console.log('Test URL:', testUrl);

  try {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ url: testUrl })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    console.log('\n--- Raw Response Data ---');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      console.log('Raw chunk:', JSON.stringify(chunk));
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          console.log('\n--- Parsing JSON ---');
          console.log('JSON string:', jsonStr);
          
          try {
            const data = JSON.parse(jsonStr);
            console.log('✅ Parsed successfully:', data);
          } catch (parseError) {
            console.error('❌ JSON parse error:', parseError.message);
            console.error('Problematic string:', jsonStr);
            console.error('String length:', jsonStr.length);
            console.error('String bytes:', Buffer.from(jsonStr).toString('hex'));
          }
        }
      }
    }

  } catch (error) {
    console.error('Request failed:', error);
  }
}

debugWorkerResponse();
