#!/usr/bin/env node

/**
 * Test Authentication Client for Team Think MCP WebSocket Server
 * 
 * This client tests the authentication flow by connecting to the WebSocket server
 * and attempting to authenticate with a provided token.
 * 
 * Usage:
 *   npm run test:auth <token>
 *   npx tsx src/websocket/test-auth-client.ts <token>
 * 
 * Examples:
 *   npm run test:auth abc123def456  # Test with a specific token
 *   npm run test:auth invalid       # Test with an invalid token
 */

import WebSocket from 'ws';
import { AuthenticationMessage } from '@team-think-mcp/shared';
import { WEBSOCKET_PORT } from '../config/constants';

// Get token from command line arguments
const token = process.argv[2];

if (!token) {
  console.error('❌ Error: Token argument is required');
  console.log('Usage: npm run test:auth <token>');
  console.log('   or: npx tsx src/websocket/test-auth-client.ts <token>');
  process.exit(1);
}

console.log('🔧 Testing WebSocket Authentication');
console.log(`🌐 Connecting to: ws://localhost:${WEBSOCKET_PORT}`);
console.log(`🔑 Testing token: ${token}`);
console.log('');

// Create WebSocket connection
const ws = new WebSocket(`ws://localhost:${WEBSOCKET_PORT}`);

// Connection timeout
const connectionTimeout = setTimeout(() => {
  console.log('❌ Connection timeout - server may not be running');
  process.exit(1);
}, 5000);

ws.on('open', () => {
  clearTimeout(connectionTimeout);
  console.log('✅ Connected to WebSocket server');
  
  // Send authentication message
  const authMessage: AuthenticationMessage = {
    schema: '1.0',
    timestamp: Date.now(),
    action: 'authenticate',
    token: token
  };
  
  console.log('📤 Sending authentication message...');
  ws.send(JSON.stringify(authMessage));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Received message from server:', message);
    
    if (message.action === 'auth-success') {
      console.log('✅ Authentication successful!');
      console.log('🎉 Token is valid and authentication flow working correctly');
    } else {
      console.log('📝 Received other message type:', message.action);
    }
  } catch (error) {
    console.log('📥 Received raw message:', data.toString());
  }
});

ws.on('close', (code, reason) => {
  clearTimeout(connectionTimeout);
  console.log(`📤 Connection closed - Code: ${code}, Reason: ${reason.toString()}`);
  
  if (code === 1008) {
    if (reason.toString().includes('timeout')) {
      console.log('❌ Authentication failed: Timeout (took longer than 5 seconds)');
    } else if (reason.toString().includes('Invalid')) {
      console.log('❌ Authentication failed: Invalid token');
      console.log('💡 Make sure to use the token displayed in the server logs');
    } else {
      console.log('❌ Authentication failed: Policy violation');
    }
  } else if (code === 1011) {
    console.log('❌ Server error: Token not initialized');
    console.log('💡 Make sure the server is fully started');
  } else if (code === 1000) {
    console.log('✅ Connection closed normally');
  } else {
    console.log(`ℹ️  Connection closed with code ${code}`);
  }
  
  console.log('');
  console.log('🔚 Test completed');
});

ws.on('error', (error) => {
  clearTimeout(connectionTimeout);
  console.error('❌ WebSocket error:', error.message);
  
  if (error.message.includes('ECONNREFUSED')) {
    console.log('💡 Make sure the WebSocket server is running on port', WEBSOCKET_PORT);
    console.log('   Start the server with: npm run dev');
  }
  
  process.exit(1);
});

// Handle process interruption
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  process.exit(0);
});

// Auto-close after 30 seconds if still connected
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('⏰ Auto-closing connection after 30 seconds');
    ws.close();
  }
}, 30000);