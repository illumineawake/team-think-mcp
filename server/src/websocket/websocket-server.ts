import { WebSocket, WebSocketServer } from 'ws';
import { logger } from '../utils/logger';
import { WebSocketMessage, SendPromptMessage, ChatResponseMessage } from '@team-think-mcp/shared';
import { MAX_CONCURRENT_CONNECTIONS, CONNECTION_TIMEOUT_MS, HEARTBEAT_INTERVAL_MS } from '../config/constants';

/**
 * WebSocket Server Manager for Team Think MCP
 * 
 * Manages WebSocket connections between the MCP server and browser extension.
 * Handles message routing, connection management, and graceful shutdown.
 * 
 * Usage:
 * ```typescript
 * const wsServer = new WebSocketServerManager(55156);
 * await wsServer.start();
 * // ... later
 * await wsServer.stop();
 * ```
 */
interface ClientInfo {
  socket: WebSocket;
  isAlive: boolean;
  connectionTime: number;
}

export class WebSocketServerManager {
  private server: WebSocketServer | null = null;
  private readonly port: number;
  private readonly connectedClients = new Map<string, ClientInfo>();
  private clientIdCounter = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 55156) {
    this.port = port;
  }

  /**
   * Start the WebSocket server
   */
  public async start(): Promise<void> {
    try {
      this.server = new WebSocketServer({ port: this.port });
      
      this.server.on('connection', (ws) => {
        this.handleConnection(ws);
      });

      this.server.on('error', (error) => {
        logger.error(`WebSocket server error: ${error.message}`, error);
      });

      // Start heartbeat mechanism
      this.startHeartbeat();

      logger.info(`WebSocket server listening on port ${this.port}`);
    } catch (error) {
      logger.error(`Failed to start WebSocket server: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Stop the WebSocket server and close all connections
   */
  public async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    logger.info('Stopping WebSocket server...');

    // Stop heartbeat mechanism
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections gracefully
    for (const [clientId, clientInfo] of this.connectedClients.entries()) {
      try {
        clientInfo.socket.terminate();
        logger.debug(`Closed connection for client: ${clientId}`);
      } catch (error) {
        logger.warn(`Error closing connection for client ${clientId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Clear the connected clients map
    this.connectedClients.clear();

    // Stop the server
    return new Promise<void>((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('WebSocket server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle new WebSocket connections
   */
  private handleConnection(ws: WebSocket): void {
    // Check connection limit
    if (this.connectedClients.size >= MAX_CONCURRENT_CONNECTIONS) {
      logger.warn(`Connection rejected - maximum concurrent connections reached (${MAX_CONCURRENT_CONNECTIONS})`);
      ws.close(1013, 'Server overloaded');
      return;
    }

    const clientId = `client-${++this.clientIdCounter}`;
    const clientInfo: ClientInfo = {
      socket: ws,
      isAlive: true,
      connectionTime: Date.now()
    };
    
    this.connectedClients.set(clientId, clientInfo);
    
    logger.info(`New WebSocket client connected: ${clientId} (${this.connectedClients.size}/${MAX_CONCURRENT_CONNECTIONS})`);

    // Set up ping/pong for heartbeat
    ws.on('pong', () => {
      const client = this.connectedClients.get(clientId);
      if (client) {
        client.isAlive = true;
      }
    });

    // Set up message handler
    ws.on('message', (data) => {
      this.handleMessage(clientId, ws, data);
    });

    // Set up close handler
    ws.on('close', (code, reason) => {
      this.connectedClients.delete(clientId);
      logger.info(`WebSocket client disconnected: ${clientId} (code: ${code}, reason: ${reason.toString()}) (remaining: ${this.connectedClients.size})`);
    });

    // Set up error handler
    ws.on('error', (error) => {
      logger.error(`WebSocket client error for ${clientId}: ${error.message}`, error);
      this.connectedClients.delete(clientId);
    });
  }

  /**
   * Handle incoming messages from WebSocket clients
   */
  private handleMessage(clientId: string, ws: WebSocket, data: any): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      
      // Validate message schema version
      if (message.schema !== '1.0') {
        logger.warn(`Invalid message schema version from ${clientId}: ${message.schema}`);
        return;
      }

      logger.info(`Received message from ${clientId}: action=${message.action}, requestId=${message.requestId}`);

      // Handle different message types
      if (isChatResponseMessage(message)) {
        // TODO: Integrate with request queue (Phase 2.4)
        // For now, just log the response
        logger.info(`Chat response received: ${message.response.substring(0, 100)}...`);
        if (message.error) {
          logger.warn(`Chat response included error: ${message.error}`);
        }
      } else if (isSendPromptMessage(message)) {
        logger.warn(`Received unexpected send-prompt message from client ${clientId} - this should come from server`);
      } else {
        logger.warn(`Unknown message type from ${clientId}: ${JSON.stringify(message)}`);
      }
    } catch (error) {
      logger.error(`Error parsing message from ${clientId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  public broadcastMessage(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    let successCount = 0;
    let errorCount = 0;

    for (const [clientId, clientInfo] of this.connectedClients.entries()) {
      try {
        if (clientInfo.socket.readyState === WebSocket.OPEN) {
          clientInfo.socket.send(messageStr);
          successCount++;
        } else {
          logger.warn(`Skipping message to ${clientId} - connection not open (state: ${clientInfo.socket.readyState})`);
        }
      } catch (error) {
        logger.error(`Error sending message to ${clientId}: ${error instanceof Error ? error.message : String(error)}`);
        errorCount++;
      }
    }

    logger.info(`Broadcasted message to ${successCount} clients (${errorCount} errors): action=${message.action}, requestId=${message.requestId}`);
  }

  /**
   * Send a message to a specific client
   */
  public sendToClient(clientId: string, message: WebSocketMessage): boolean {
    const clientInfo = this.connectedClients.get(clientId);
    if (!clientInfo) {
      logger.warn(`Cannot send message to ${clientId} - client not found`);
      return false;
    }

    try {
      if (clientInfo.socket.readyState === WebSocket.OPEN) {
        clientInfo.socket.send(JSON.stringify(message));
        logger.info(`Sent message to ${clientId}: action=${message.action}, requestId=${message.requestId}`);
        return true;
      } else {
        logger.warn(`Cannot send message to ${clientId} - connection not open (state: ${clientInfo.socket.readyState})`);
        return false;
      }
    } catch (error) {
      logger.error(`Error sending message to ${clientId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get the number of connected clients
   */
  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get list of connected client IDs
   */
  public getConnectedClientIds(): string[] {
    return Array.from(this.connectedClients.keys());
  }

  /**
   * Start the heartbeat mechanism to detect stale connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const currentTime = Date.now();
      const staleClients: string[] = [];

      // Check for stale connections and send pings
      for (const [clientId, clientInfo] of this.connectedClients.entries()) {
        const connectionAge = currentTime - clientInfo.connectionTime;
        
        // Check for connection timeout
        if (connectionAge > CONNECTION_TIMEOUT_MS && !clientInfo.isAlive) {
          staleClients.push(clientId);
          continue;
        }

        // Send ping if connection is open
        if (clientInfo.socket.readyState === WebSocket.OPEN) {
          if (clientInfo.isAlive === false) {
            // Client didn't respond to previous ping
            staleClients.push(clientId);
          } else {
            // Reset alive status and send ping
            clientInfo.isAlive = false;
            try {
              clientInfo.socket.ping();
            } catch (error) {
              logger.warn(`Failed to ping client ${clientId}: ${error instanceof Error ? error.message : String(error)}`);
              staleClients.push(clientId);
            }
          }
        } else {
          // Connection is not open
          staleClients.push(clientId);
        }
      }

      // Remove stale clients
      for (const clientId of staleClients) {
        this.removeStaleClient(clientId);
      }

      if (staleClients.length > 0) {
        logger.info(`Removed ${staleClients.length} stale connections. Active connections: ${this.connectedClients.size}`);
      }
    }, HEARTBEAT_INTERVAL_MS);

    logger.debug(`Heartbeat mechanism started with ${HEARTBEAT_INTERVAL_MS}ms interval`);
  }

  /**
   * Remove a stale client connection
   */
  private removeStaleClient(clientId: string): void {
    const clientInfo = this.connectedClients.get(clientId);
    if (clientInfo) {
      try {
        clientInfo.socket.terminate();
      } catch (error) {
        logger.warn(`Error terminating stale client ${clientId}: ${error instanceof Error ? error.message : String(error)}`);
      }
      this.connectedClients.delete(clientId);
      logger.debug(`Removed stale client: ${clientId}`);
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): { 
    totalConnections: number; 
    activeConnections: number; 
    connectionDetails: Array<{ clientId: string; connectionTime: number; isAlive: boolean }> 
  } {
    const connectionDetails = Array.from(this.connectedClients.entries()).map(([clientId, clientInfo]) => ({
      clientId,
      connectionTime: clientInfo.connectionTime,
      isAlive: clientInfo.isAlive
    }));

    return {
      totalConnections: this.clientIdCounter,
      activeConnections: this.connectedClients.size,
      connectionDetails
    };
  }
}

/**
 * Type guard to check if a message is a SendPromptMessage
 */
function isSendPromptMessage(msg: WebSocketMessage): msg is SendPromptMessage {
  return msg.action === 'send-prompt';
}

/**
 * Type guard to check if a message is a ChatResponseMessage
 */
function isChatResponseMessage(msg: WebSocketMessage): msg is ChatResponseMessage {
  return msg.action === 'chat-response';
}