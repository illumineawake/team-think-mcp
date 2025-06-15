#!/usr/bin/env node

/**
 * Test client that triggers MCP tools through the server
 * This simulates what an MCP client like Claude would do
 */

import WebSocket from 'ws';
import * as readline from 'readline';
import { spawn } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class MCPTestClient {
  private serverProcess: any;
  private requestId = 1;

  async start() {
    console.log('🚀 Team Think MCP Tool Test Client');
    console.log('==================================\n');
    
    // Start interacting with the MCP server via stdio
    this.serverProcess = spawn('node', ['dist/index.js'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.serverProcess.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const message = JSON.parse(line);
          if (message.result || message.error) {
            console.log('\n📥 Server response:', JSON.stringify(message, null, 2));
            if (message.result?.content?.[0]?.text) {
              console.log('\n✅ AI Response:', message.result.content[0].text);
            }
          }
        } catch {
          // Not JSON, ignore
        }
      }
    });

    this.serverProcess.stderr.on('data', (data: Buffer) => {
      // Ignore stderr logs
    });

    // Initialize MCP connection
    await this.initialize();
    
    // Show help
    console.log('\nAvailable commands:');
    console.log('  gemini <prompt>  - Send a prompt to Gemini');
    console.log('  chatgpt <prompt> - Send a prompt to ChatGPT');
    console.log('  exit            - Exit the test client\n');
    
    // Start prompt
    this.prompt();
  }

  private async initialize() {
    const initRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };
    
    this.serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
    
    // Wait a bit for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private prompt() {
    rl.question('> ', async (input) => {
      const parts = input.trim().split(' ');
      const command = parts[0];
      const prompt = parts.slice(1).join(' ');

      switch (command.toLowerCase()) {
        case 'gemini':
          if (!prompt) {
            console.log('❌ Please provide a prompt');
          } else {
            await this.callTool('chat_gemini', { prompt });
          }
          break;
          
        case 'chatgpt':
          if (!prompt) {
            console.log('❌ Please provide a prompt');
          } else {
            await this.callTool('chat_chatgpt', { prompt });
          }
          break;
          
        case 'exit':
          console.log('👋 Goodbye!');
          this.serverProcess.kill();
          process.exit(0);
          break;
          
        default:
          console.log('❌ Unknown command');
      }
      
      this.prompt();
    });
  }

  private async callTool(toolName: string, args: any) {
    console.log(`\n📤 Calling ${toolName} with prompt: "${args.prompt}"`);
    console.log('⏳ Watch your browser - a new tab should open...\n');
    
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };
    
    this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
  }
}

// Check if server is built
import * as fs from 'fs';
if (!fs.existsSync('dist/index.js')) {
  console.error('❌ Server not built. Run "npm run build" first.');
  process.exit(1);
}

const client = new MCPTestClient();
client.start().catch(console.error);