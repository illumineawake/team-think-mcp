#!/usr/bin/env node

/**
 * WebSocket test client for Team Think MCP Server with Authentication
 * 
 * This client connects to the WebSocket server, authenticates with a token,
 * sends a test message, logs any received messages, and disconnects after 10 seconds.
 * 
 * Usage:
 *   npm run test <token>
 *   npx tsx src/websocket/test-client.ts <token>
 */

import WebSocket from 'ws';
import { ChatResponseMessage, AuthenticationMessage } from '@team-think-mcp/shared';

const WEBSOCKET_URL = 'ws://localhost:55156';
const TEST_TIMEOUT = 10000; // 10 seconds

// Get token from command line arguments
const token = process.argv[2];

if (!token) {
  console.error('❌ Error: Token argument is required');
  console.log('Usage: npm run test <token>');
  console.log('   or: npx tsx src/websocket/test-client.ts <token>');
  console.log('');
  console.log('💡 Get the token from the server logs when you start the server');
  process.exit(1);
}

console.log('🧪 Starting WebSocket test client with authentication...');
console.log(`🔑 Using token: ${token}`);

let isAuthenticated = false;

const ws = new WebSocket(WEBSOCKET_URL);

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  
  // Send authentication message first
  const authMessage: AuthenticationMessage = {
    schema: '1.0',
    timestamp: Date.now(),
    action: 'authenticate',
    token: token
  };
  
  console.log('📤 Sending authentication message...');
  ws.send(JSON.stringify(authMessage));
});

function sendTestMessage() {
  if (!isAuthenticated) {
    console.log('⚠️  Cannot send test message - not authenticated yet');
    return;
  }
  
  // Send a test chat response message
  const testMessage: ChatResponseMessage = {
    schema: '1.0',
    timestamp: Date.now(),
    action: 'chat-response',
    requestId: 'test-request-123',
    response: 'This is a test response from the WebSocket test client.'
  };
  
  console.log('📤 Sending test message:', JSON.stringify(testMessage, null, 2));
  ws.send(JSON.stringify(testMessage));
}

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Received message from server:', JSON.stringify(message, null, 2));
    
    // Check for authentication success
    if (message.action === 'auth-success') {
      console.log('✅ Authentication successful!');
      isAuthenticated = true;
      
      // Wait a moment then send test message
      setTimeout(() => {
        sendTestMessage();
      }, 1000);
    }
  } catch (error) {
    console.log('📥 Received raw message from server:', data.toString());
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed (code: ${code}, reason: ${reason.toString()})`);
  
  if (code === 1008) {
    if (reason.toString().includes('timeout')) {
      console.log('❌ Authentication failed: Timeout');
    } else if (reason.toString().includes('Invalid')) {
      console.log('❌ Authentication failed: Invalid token');
      console.log('💡 Make sure to use the token displayed in the server logs');
    } else {
      console.log('❌ Authentication failed: Policy violation');
    }
  } else if (code === 1011) {
    console.log('❌ Server error: Token not initialized');
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  
  if (error.message.includes('ECONNREFUSED')) {
    console.log('💡 Make sure the WebSocket server is running');
    console.log('   Start the server with: npm run dev');
  }
});

// Close connection after timeout
setTimeout(() => {
  console.log('⏰ Test timeout reached, closing connection...');
  ws.close();
  process.exit(0);
}, TEST_TIMEOUT);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, closing connection...');
  ws.close();
  process.exit(0);
});

console.log(`⏳ Test will run for ${TEST_TIMEOUT / 1000} seconds...`);
console.log('🔗 Attempting to connect to:', WEBSOCKET_URL);
console.log('🔧 This test will authenticate and then send a chat response message');