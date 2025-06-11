#!/usr/bin/env node

/**
 * Simple WebSocket test client for Team Think MCP Server
 * 
 * This client connects to the WebSocket server, sends a test message,
 * logs any received messages, and disconnects after 5 seconds.
 */

import WebSocket from 'ws';
import { ChatResponseMessage } from '@team-think-mcp/shared';

const WEBSOCKET_URL = 'ws://localhost:55156';
const TEST_TIMEOUT = 5000; // 5 seconds

console.log('🧪 Starting WebSocket test client...');

const ws = new WebSocket(WEBSOCKET_URL);

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  
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
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Received message from server:', JSON.stringify(message, null, 2));
  } catch (error) {
    console.log('📥 Received raw message from server:', data.toString());
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed (code: ${code}, reason: ${reason.toString()})`);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
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