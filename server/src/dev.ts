#!/usr/bin/env node

/**
 * Development helper for testing the MCP server locally
 * This script sends test messages to the server to verify functionality
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

interface TestCase {
  name: string;
  message: any;
  expectedResponse?: (response: any) => boolean;
}

class McpServerTester {
  private serverProcess: ChildProcess | null = null;
  private serverReady = false;

  public async runTests(): Promise<void> {
    console.log('🚀 Starting MCP Server development tests...\n');

    try {
      await this.startServer();
      await this.runTestCases();
      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Tests failed:', error);
      process.exit(1);
    } finally {
      this.stopServer();
    }
  }

  private async startServer(): Promise<void> {
    const serverPath = path.join(__dirname, 'index.ts');
    
    return new Promise((resolve, reject) => {
      // Use ts-node to run the TypeScript server directly
      this.serverProcess = spawn('npx', ['ts-node', serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, DEBUG: '1' }
      });

      if (!this.serverProcess) {
        reject(new Error('Failed to start server process'));
        return;
      }

      // Listen for server ready signal
      this.serverProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        console.log('Server log:', output.trim());
        
        if (output.includes('MCP server is ready to accept connections')) {
          this.serverReady = true;
          resolve();
        }
      });

      this.serverProcess.stdout?.on('data', (data) => {
        console.log('Server response:', data.toString().trim());
      });

      this.serverProcess.on('error', (error) => {
        reject(error);
      });

      this.serverProcess.on('exit', (code) => {
        if (code !== 0 && !this.serverReady) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this.serverReady) {
          reject(new Error('Server did not start within 5 seconds'));
        }
      }, 5000);
    });
  }

  private async runTestCases(): Promise<void> {
    const testCases: TestCase[] = [
      {
        name: 'Initialize Request',
        message: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {
              experimental: {}
            },
            clientInfo: {
              name: 'test-client',
              version: '1.0.0'
            }
          }
        },
        expectedResponse: (response) => 
          response.result?.protocolVersion === '2024-11-05' &&
          response.result?.serverInfo?.name === 'team-think-mcp'
      },
      {
        name: 'Initialized Notification',
        message: {
          jsonrpc: '2.0',
          method: 'initialized',
          params: {}
        }
      },
      {
        name: 'Tools List Request',
        message: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        },
        expectedResponse: (response) => Array.isArray(response.result?.tools)
      },
      {
        name: 'Invalid Method Request',
        message: {
          jsonrpc: '2.0',
          id: 3,
          method: 'invalid/method',
          params: {}
        },
        expectedResponse: (response) => response.error?.code === -32601
      }
    ];

    for (const testCase of testCases) {
      console.log(`📤 Testing: ${testCase.name}`);
      await this.sendTestMessage(testCase);
      await this.sleep(100); // Small delay between tests
    }
  }

  private async sendTestMessage(testCase: TestCase): Promise<void> {
    if (!this.serverProcess?.stdin) {
      throw new Error('Server process not available');
    }

    return new Promise((resolve, reject) => {
      const messageStr = JSON.stringify(testCase.message) + '\n';
      
      // Set up response handler if we expect a response
      if (testCase.expectedResponse) {
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout waiting for response to ${testCase.name}`));
        }, 2000);

        const responseHandler = (data: Buffer) => {
          const response = data.toString().trim();
          if (!response) return;

          try {
            const parsed = JSON.parse(response);
            clearTimeout(timeout);
            this.serverProcess?.stdout?.off('data', responseHandler);

            if (testCase.expectedResponse!(parsed)) {
              console.log(`✅ ${testCase.name} - Response validation passed`);
              resolve();
            } else {
              console.log(`❌ ${testCase.name} - Response validation failed:`, parsed);
              reject(new Error(`Response validation failed for ${testCase.name}`));
            }
          } catch (error) {
            console.log(`❌ ${testCase.name} - Invalid JSON response:`, response);
            clearTimeout(timeout);
            this.serverProcess?.stdout?.off('data', responseHandler);
            reject(error);
          }
        };

        if (this.serverProcess?.stdout) {
          this.serverProcess.stdout.on('data', responseHandler);
        }
      }

      // Send the message
      if (this.serverProcess?.stdin) {
        this.serverProcess.stdin.write(messageStr);
      }
      
      // If no response expected, resolve immediately
      if (!testCase.expectedResponse) {
        console.log(`✅ ${testCase.name} - Notification sent`);
        resolve();
      }
    });
  }

  private stopServer(): void {
    if (this.serverProcess) {
      console.log('\n🛑 Stopping server...');
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new McpServerTester();
  tester.runTests().catch(console.error);
}