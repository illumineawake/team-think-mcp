import { McpProtocolHandler, JsonRpcMessage, JsonRpcRequest, JsonRpcNotification } from './protocol';
import { McpHandshakeHandler } from './handshake';
import { ToolRegistry } from '../tools/registry';
import { logger } from '../utils/logger';
import { 
  McpInitializeRequest, 
  McpInitializedNotification,
  McpToolsListRequest,
  McpToolCallRequest 
} from './types';

export class McpServer {
  private protocol: McpProtocolHandler;
  private handshake: McpHandshakeHandler;
  private toolRegistry: ToolRegistry;

  constructor(toolRegistry?: ToolRegistry) {
    this.protocol = new McpProtocolHandler();
    this.handshake = new McpHandshakeHandler();
    this.toolRegistry = toolRegistry || new ToolRegistry();
  }

  public start(): void {
    logger.info('Starting MCP server...');
    this.protocol.start(this.handleMessage.bind(this));
  }

  private async handleMessage(message: JsonRpcMessage): Promise<void> {
    try {
      if (this.isRequest(message)) {
        await this.handleRequest(message as JsonRpcRequest);
      } else if (this.isNotification(message)) {
        await this.handleNotification(message as JsonRpcNotification);
      }
    } catch (error) {
      logger.error('Error handling message:', error);
      if (this.isRequest(message)) {
        this.protocol.sendErrorResponse(
          (message as JsonRpcRequest).id,
          -32603,
          'Internal error',
          String(error)
        );
      }
    }
  }

  private async handleRequest(request: JsonRpcRequest): Promise<void> {
    switch (request.method) {
      case 'initialize':
        const initRequest = request as McpInitializeRequest;
        const response = this.handshake.handleInitialize(initRequest);
        this.protocol.sendResponse(response);
        break;

      case 'tools/list':
        const toolsListRequest = request as McpToolsListRequest;
        const tools = this.toolRegistry.list();
        const toolsResponse = {
          jsonrpc: "2.0" as const,
          id: toolsListRequest.id,
          result: {
            tools
          }
        };
        this.protocol.sendResponse(toolsResponse);
        break;

      case 'tools/call':
        const toolCallRequest = request as McpToolCallRequest;
        try {
          const result = await this.toolRegistry.execute(
            toolCallRequest.params.name,
            toolCallRequest.params.arguments
          );
          const response = {
            jsonrpc: "2.0" as const,
            id: toolCallRequest.id,
            result
          };
          this.protocol.sendResponse(response);
        } catch (error) {
          this.protocol.sendErrorResponse(
            toolCallRequest.id,
            -32601,
            'Tool execution failed',
            String(error)
          );
        }
        break;

      default:
        this.protocol.sendErrorResponse(
          request.id,
          -32601,
          'Method not found',
          `Unknown method: ${request.method}`
        );
    }
  }

  private async handleNotification(notification: JsonRpcNotification): Promise<void> {
    switch (notification.method) {
      case 'initialized':
        const initNotification = notification as McpInitializedNotification;
        this.handshake.handleInitialized(initNotification);
        break;

      default:
        logger.warn(`Unknown notification method: ${notification.method}`);
    }
  }

  private isRequest(message: JsonRpcMessage): boolean {
    return 'id' in message && 'method' in message;
  }

  private isNotification(message: JsonRpcMessage): boolean {
    return 'method' in message && !('id' in message);
  }

  public getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  public close(): void {
    this.protocol.close();
  }
}