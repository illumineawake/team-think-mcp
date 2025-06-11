import { 
  McpInitializeRequest, 
  McpInitializeResponse, 
  McpInitializedNotification,
  McpServerCapabilities,
  McpServerInfo 
} from './types';
import { logger } from '../utils/logger';

export class McpHandshakeHandler {
  private initialized: boolean = false;
  private readonly serverInfo: McpServerInfo = {
    name: "team-think-mcp",
    version: "0.1.0"
  };

  private readonly capabilities: McpServerCapabilities = {
    tools: {}
  };

  public handleInitialize(request: McpInitializeRequest): McpInitializeResponse {
    logger.info('Handling initialize request from client:', request.params.clientInfo.name);
    
    const response: McpInitializeResponse = {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: this.capabilities,
        serverInfo: this.serverInfo
      }
    };

    return response;
  }

  public handleInitialized(notification: McpInitializedNotification): void {
    logger.info('Received initialized notification, handshake complete');
    this.initialized = true;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getServerInfo(): McpServerInfo {
    return this.serverInfo;
  }

  public getCapabilities(): McpServerCapabilities {
    return this.capabilities;
  }
}