import * as readline from 'readline';
import { logger } from '../utils/logger';

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;

export class McpProtocolHandler {
  private readline: readline.Interface;

  constructor() {
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
  }

  public start(messageHandler: (message: JsonRpcMessage) => Promise<void>): void {
    this.readline.on('line', async (line: string) => {
      try {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        const message = JSON.parse(trimmed) as JsonRpcMessage;
        await messageHandler(message);
      } catch (error) {
        logger.error('Error parsing JSON-RPC message:', error);
        if (this.isRequest(line)) {
          try {
            const parsed = JSON.parse(line);
            this.sendErrorResponse(parsed.id, -32700, 'Parse error');
          } catch {
            // Cannot recover from malformed JSON
          }
        }
      }
    });

    this.readline.on('close', () => {
      logger.info('stdin closed, exiting...');
      process.exit(0);
    });
  }

  public sendResponse(response: JsonRpcResponse): void {
    const responseStr = JSON.stringify(response);
    console.log(responseStr);
  }

  public sendNotification(notification: JsonRpcNotification): void {
    const notificationStr = JSON.stringify(notification);
    console.log(notificationStr);
  }

  public sendErrorResponse(id: string | number, code: number, message: string, data?: any): void {
    const errorResponse: JsonRpcResponse = {
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
        data
      }
    };
    this.sendResponse(errorResponse);
  }

  private isRequest(line: string): boolean {
    try {
      const parsed = JSON.parse(line);
      return parsed.hasOwnProperty('id') && parsed.hasOwnProperty('method');
    } catch {
      return false;
    }
  }

  public close(): void {
    this.readline.close();
  }
}