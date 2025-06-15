const WebSocket = require('ws');

// Simple script to trigger a test prompt through the WebSocket
async function triggerTest() {
  console.log('🧪 Triggering test prompt...\n');
  
  // This simulates what the MCP server would send to the extension
  const ws = new WebSocket('ws://localhost:55156');
  
  ws.on('open', () => {
    console.log('✅ Connected to WebSocket server');
    
    // First authenticate (use the token from your server)
    const authToken = process.argv[2];
    if (!authToken) {
      console.error('❌ Please provide the auth token as an argument');
      console.log('Usage: node trigger-test.js YOUR_AUTH_TOKEN');
      process.exit(1);
    }
    
    ws.send(JSON.stringify({
      schema: '1.0',
      timestamp: Date.now(),
      action: 'authenticate',
      token: authToken
    }));
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📥 Received:', message);
    
    if (message.action === 'auth-success') {
      console.log('✅ Authenticated! Sending test prompt...\n');
      
      // Now send the prompt command
      ws.send(JSON.stringify({
        schema: '1.0',
        timestamp: Date.now(),
        action: 'send-prompt',
        chatbot: 'gemini',
        requestId: 'test-' + Date.now(),
        prompt: 'Hello Gemini! This is a test from Team Think MCP. Can you tell me a fun fact about WebSockets?',
        options: {
          temperature: 0.7,
          model: 'gemini-2.5-flash'
        }
      }));
      
      console.log('📤 Sent test prompt to Gemini');
      console.log('👀 Watch your browser - a new tab should open!\n');
      
      // Keep connection open to receive response
      setTimeout(() => {
        console.log('✅ Test complete!');
        ws.close();
        process.exit(0);
      }, 30000); // Wait 30 seconds for response
    }
    
    if (message.action === 'chat-response') {
      console.log('\n🎉 Got response from AI:');
      console.log(message.response);
      ws.close();
      process.exit(0);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });
}

triggerTest();