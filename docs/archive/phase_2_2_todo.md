# Multi-Agent Todo: Implement WebSocket Server (Phase 2.2)

## Context
This plan implements item 2.2 from the main plan: "Implement a WebSocket server that listens on a new port (e.g., 55156) to avoid conflicts with CWC."

## Prerequisites for Implementation Agent
- [X] Read @team-think-mcp/docs/BLUEPRINT.md to understand the overall architecture
- [X] Read @team-think-mcp/shared/src/types/websocket-messages.ts to understand the message protocol
- [X] Read @team-think-mcp/CLAUDE.md for environment-specific notes

## Implementation Steps

### Step 1: Create WebSocket Server Module
- [X] Create file `/mnt/c/VS Code Projects/Code Web Chat/CodeWebChat/team-think-mcp/server/src/websocket/websocket-server.ts`
- [X] Import necessary dependencies:
  ```typescript
  import { WebSocket, WebSocketServer } from 'ws';
  import { logger } from '../utils/logger';
  import { WebSocketMessage } from '@team-think-mcp/shared';
  ```

### Step 2: Define WebSocket Server Class Structure
- [X] Create `WebSocketServerManager` class with the following structure:
  - Private property for WebSocketServer instance
  - Private property for port (default: 55156)
  - Private property to track connected clients (Map<string, WebSocket>)
  - Constructor that accepts optional port number
  - Public `start()` method
  - Public `stop()` method
  - Private `handleConnection()` method
  - Private `handleMessage()` method
  - Private `broadcastMessage()` method

### Step 3: Implement Server Initialization
- [X] In the `start()` method:
  - Create WebSocketServer instance listening on specified port
  - Log server startup message: "WebSocket server listening on port {port}"
  - Set up connection event handler
  - Set up error handling for server startup failures

### Step 4: Implement Connection Handling
- [X] In the `handleConnection()` method:
  - Generate unique client ID for each connection
  - Add client to connected clients map
  - Log new connection: "New WebSocket client connected: {clientId}"
  - Set up message handler for the client
  - Set up close handler to remove client from map
  - Set up error handler for client-specific errors

### Step 5: Implement Message Handling
- [X] In the `handleMessage()` method:
  - Parse incoming message as WebSocketMessage type
  - Validate message schema version (should be '1.0')
  - Log received message type and requestId
  - Add TODO comment for future integration with request queue (Phase 2.4)

### Step 6: Implement Message Broadcasting
- [X] In the `broadcastMessage()` method:
  - Accept WebSocketMessage as parameter
  - Iterate through all connected clients
  - Send message to each client with error handling
  - Log successful broadcasts

### Step 7: Implement Graceful Shutdown
- [X] In the `stop()` method:
  - Close all client connections gracefully
  - Stop the WebSocket server
  - Clear the connected clients map
  - Log shutdown message

### Step 8: Add Type Guards
- [X] Create helper functions to validate message types:
  ```typescript
  function isSendPromptMessage(msg: WebSocketMessage): msg is SendPromptMessage
  function isChatResponseMessage(msg: WebSocketMessage): msg is ChatResponseMessage
  ```

### Step 9: Export WebSocket Server Instance
- [X] Create file `/mnt/c/VS Code Projects/Code Web Chat/CodeWebChat/team-think-mcp/server/src/websocket/index.ts`
- [X] Export WebSocketServerManager and create singleton instance

### Step 10: Integrate with MCP Server
- [X] Read @team-think-mcp/server/src/index.ts to understand current server setup
- [X] Modify `/mnt/c/VS Code Projects/Code Web Chat/CodeWebChat/team-think-mcp/server/src/index.ts`:
  - Import WebSocketServerManager
  - Create WebSocket server instance after MCP server
  - Start WebSocket server after MCP server starts
  - Add WebSocket server to shutdown handler

### Step 11: Update Package Dependencies
- [X] Check if 'ws' package is already installed in server/package.json
- [X] If not, add `"ws": "^8.16.0"` to dependencies
- [X] Add `"@types/ws": "^8.5.10"` to devDependencies if not present

### Step 12: Test Basic Functionality
- [X] Create simple test file `/mnt/c/VS Code Projects/Code Web Chat/CodeWebChat/team-think-mcp/server/src/websocket/test-client.ts`
- [X] Implement basic WebSocket client that:
  - Connects to localhost:55156
  - Sends a test message
  - Logs received messages
  - Disconnects after 5 seconds

### Step 13: Add Configuration
- [X] Create constants file `/mnt/c/VS Code Projects/Code Web Chat/CodeWebChat/team-think-mcp/server/src/config/constants.ts`
- [X] Define:
  ```typescript
  export const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT ? parseInt(process.env.WEBSOCKET_PORT) : 55156;
  export const WEBSOCKET_HOST = process.env.WEBSOCKET_HOST || 'localhost';
  ```

### Step 14: Error Handling Improvements
- [X] Add connection retry logic with exponential backoff
- [X] Add maximum connection limit (e.g., 10 concurrent connections)
- [X] Add heartbeat/ping-pong mechanism to detect stale connections

### Step 15: Documentation
- [X] Add JSDoc comments to all public methods
- [X] Document the WebSocket protocol in comments
- [X] Add usage example in class header comment

## Validation Checklist for Review Agent
- [X] WebSocket server starts on port 55156
- [X] Server handles multiple client connections
- [X] Messages conform to WebSocketMessage types from shared package
- [X] Graceful shutdown is implemented
- [X] Error handling is comprehensive
- [X] Logging provides good debugging information
- [X] No conflicts with existing MCP server functionality
- [X] Code follows TypeScript best practices
- [X] All TODOs are clearly marked for future phases

## Notes for Implementation Agent
- The WebSocket server is a critical component that will bridge the MCP server with the browser extension
- Focus on robustness and clear error messages - this will help during integration testing
- Keep the implementation modular to easily add authentication (Phase 2.3) and queue management (Phase 2.4) later
- Remember to use npm (not pnpm) for any package installations as per CLAUDE.md