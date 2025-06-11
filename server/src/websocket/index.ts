import { WebSocketServerManager } from './websocket-server';

export { WebSocketServerManager } from './websocket-server';

// Singleton instance for application-wide use
// This will be initialized when the server starts
let serverInstance: WebSocketServerManager | null = null;

/**
 * Get or create the WebSocket server singleton instance
 */
export function getWebSocketServer(port: number = 55156): WebSocketServerManager {
  if (!serverInstance) {
    serverInstance = new WebSocketServerManager(port);
  }
  return serverInstance;
}

/**
 * Clear the singleton instance (used for testing)
 */
export function clearWebSocketServerInstance(): void {
  serverInstance = null;
}