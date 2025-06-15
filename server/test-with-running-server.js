/**
 * Test script that connects to an already-running MCP server
 * This avoids having to stop/start the server and reconfigure tokens
 */

const { spawn } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🧪 Team Think MCP Interactive Tester');
console.log('====================================\n');
console.log('This will connect to your already-running MCP server.\n');
console.log('Commands:');
console.log('  gemini <prompt>  - Send prompt to Gemini');
console.log('  chatgpt <prompt> - Send prompt to ChatGPT');
console.log('  exit            - Exit tester\n');

let requestId = 1;

// Connect to the running server via a new MCP client
const client = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Initialize connection
client.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: requestId++,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0' }
  }
}) + '\n');

// Handle responses
client.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      if (msg.result?.content?.[0]?.text) {
        if (msg.result.isError) {
          console.log('\n❌ Error:', msg.result.content[0].text);
        } else {
          console.log('\n✅ AI Response:', msg.result.content[0].text);
        }
      }
    } catch {
      // Not JSON, ignore
    }
  }
});

// Command prompt
function prompt() {
  rl.question('> ', (input) => {
    const parts = input.trim().split(' ');
    const cmd = parts[0];
    const text = parts.slice(1).join(' ');
    
    switch (cmd) {
      case 'gemini':
        if (!text) {
          console.log('Usage: gemini <your prompt>');
        } else {
          console.log('\n📤 Sending to Gemini...');
          console.log('👀 Watch your browser!\n');
          client.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            id: requestId++,
            method: 'tools/call',
            params: {
              name: 'chat_gemini',
              arguments: { prompt: text }
            }
          }) + '\n');
        }
        break;
        
      case 'chatgpt':
        if (!text) {
          console.log('Usage: chatgpt <your prompt>');
        } else {
          console.log('\n📤 Sending to ChatGPT...');
          console.log('👀 Watch your browser!\n');
          client.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            id: requestId++,
            method: 'tools/call',
            params: {
              name: 'chat_chatgpt',
              arguments: { prompt: text }
            }
          }) + '\n');
        }
        break;
        
      case 'exit':
        client.kill();
        process.exit(0);
        break;
        
      default:
        console.log('Unknown command. Try: gemini, chatgpt, or exit');
    }
    
    prompt();
  });
}

// Start after initialization
setTimeout(() => {
  prompt();
}, 1000);