/**
 * Interactive test client for Team Think MCP
 * This keeps the MCP server running and allows multiple tests
 */

const { spawn } = require('child_process');
const readline = require('readline');

console.log('==========================================');
console.log('Team Think MCP Interactive Test Client');
console.log('==========================================\n');

// Start the MCP server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let isInitialized = false;
let requestId = 1;
let authToken = null;

// Capture the auth token from stderr
server.stderr.on('data', (data) => {
  const output = data.toString();
  
  // Look for the auth token in the output
  if (output.includes('SECURITY TOKEN FOR BROWSER EXTENSION:')) {
    const lines = output.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('SECURITY TOKEN FOR BROWSER EXTENSION:') && lines[i + 1]) {
        authToken = lines[i + 1].trim();
        if (authToken && authToken.length > 20) {
          console.log('🔐 AUTH TOKEN:', authToken);
          console.log('\nIMPORTANT STEPS:');
          console.log('1. Copy the auth token above');
          console.log('2. Open Chrome extension options');
          console.log('3. Paste the token and save');
          console.log('4. Wait for "Connected" status');
          console.log('5. Type "ready" here when done\n');
        }
      }
    }
  }
});

// Handle server responses
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      try {
        const msg = JSON.parse(line);
        console.log('DEBUG - Server response:', JSON.stringify(msg));
        
        if (msg.id === 1 && msg.result) {
          console.log('✅ Connected to MCP server\n');
          isInitialized = true;
        } else if (msg.result?.content?.[0]?.text) {
          console.log('\n' + (msg.result.isError ? '❌' : '✅') + ' Response:', msg.result.content[0].text);
          console.log('\nType "gemini <prompt>" or "chatgpt <prompt>" to test again\n');
        } else if (msg.error) {
          console.log('\n❌ Error:', msg.error.message);
        }
      } catch (e) {
        console.log('DEBUG - Raw output:', line);
      }
    }
  }
});

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize the MCP connection
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: requestId++,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0' }
  }
}) + '\n');

// Command prompt
function prompt() {
  rl.question('> ', (input) => {
    const parts = input.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const text = parts.slice(1).join(' ');
    
    switch (cmd) {
      case 'ready':
        if (!isInitialized) {
          console.log('Waiting for server initialization...');
        } else {
          console.log('\n✅ Great! Now you can test the tools:');
          console.log('  gemini <your prompt>  - Test Gemini AI Studio');
          console.log('  chatgpt <your prompt> - Test ChatGPT');
          console.log('  exit                  - Exit the test client\n');
        }
        break;
        
      case 'gemini':
        if (!text) {
          console.log('Usage: gemini <your prompt>');
        } else if (!isInitialized) {
          console.log('Server not initialized yet. Type "ready" first.');
        } else {
          console.log('\n📤 Sending to Gemini: "' + text + '"');
          console.log('👀 Watch your browser - a new tab should open!\n');
          server.stdin.write(JSON.stringify({
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
        } else if (!isInitialized) {
          console.log('Server not initialized yet. Type "ready" first.');
        } else {
          console.log('\n📤 Sending to ChatGPT: "' + text + '"');
          console.log('👀 Watch your browser - a new tab should open!\n');
          server.stdin.write(JSON.stringify({
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
      case 'quit':
        console.log('\n👋 Goodbye!');
        server.kill();
        process.exit(0);
        break;
        
      default:
        if (input.trim()) {
          console.log('Unknown command. Try: ready, gemini <prompt>, chatgpt <prompt>, or exit');
        }
    }
    
    prompt();
  });
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  server.kill();
  process.exit(0);
});

// Start prompting
prompt();