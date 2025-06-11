# Multi-Agent Todo: Set up Basic Node.js MCP Server

## Task: Phase 2, Step 2.1 - Set up a basic Node.js server using TypeScript

This plan breaks down the implementation of a basic MCP (Model Context Protocol) server that will serve as the foundation for the Team Think MCP project.

### Prerequisites
- [X] Read @team-think-mcp/docs/BLUEPRINT.md to understand the overall architecture
- [X] Read @team-think-mcp/shared/src/types/websocket-messages.ts to understand the message types

### Implementation Steps

#### 1. Create Basic Server Structure
- [X] Create `/team-think-mcp/server/src/index.ts` as the main entry point
- [X] Add basic imports for Node.js built-in modules (readline, process)
- [X] Add a simple console log to verify the server starts

#### 2. Implement MCP Protocol Handler
- [X] Create `/team-think-mcp/server/src/mcp/protocol.ts` for MCP protocol handling
- [X] Implement a function to read JSON-RPC messages from stdin
- [X] Implement a function to write JSON-RPC messages to stdout
- [X] Add proper TypeScript types for JSON-RPC messages

#### 3. Create MCP Message Types
- [X] Create `/team-think-mcp/server/src/mcp/types.ts` for MCP-specific types
- [X] Define interfaces for MCP requests (initialize, tool calls, etc.)
- [X] Define interfaces for MCP responses
- [X] Define error response types

#### 4. Implement MCP Handshake
- [X] In `protocol.ts`, add handler for "initialize" request
- [X] Respond with server capabilities (tools will be added later)
- [X] Handle "initialized" notification
- [X] Add logging for handshake completion

#### 5. Create Tools Registry
- [X] Create `/team-think-mcp/server/src/tools/registry.ts` for tool management
- [X] Implement a ToolRegistry class with methods to register and get tools
- [X] Define the Tool interface with name, description, and inputSchema
- [X] Add placeholder for tool execution (will be implemented in later steps)

#### 6. Add Logging System
- [X] Create `/team-think-mcp/server/src/utils/logger.ts` for structured logging
- [X] Implement log levels (debug, info, warn, error)
- [X] Add timestamps to log messages
- [X] Ensure logs go to stderr (not stdout, which is for MCP)

#### 7. Wire Everything Together
- [X] Update `index.ts` to initialize the protocol handler
- [X] Set up the main message loop to handle incoming requests
- [X] Add graceful shutdown handling (SIGINT, SIGTERM)
- [X] Handle unexpected errors and log them appropriately

#### 8. Add Basic Error Handling
- [X] Implement error response formatting according to JSON-RPC spec
- [X] Add try-catch blocks around message handling
- [X] Handle malformed JSON input gracefully
- [X] Add timeout handling for long-running operations

#### 9. Create Development Helpers
- [X] Add a `dev.ts` file for testing the server locally
- [X] Implement a simple test client that sends initialize request
- [X] Add npm script for running in development mode
- [X] Document how to test the server manually

#### 10. Verify Basic Functionality
- [X] Test that server starts without errors
- [X] Verify it responds to initialize request correctly
- [X] Check that logging works and goes to stderr
- [X] Ensure graceful shutdown works properly
- [X] Test error handling with malformed input

### Code Snippets for Reference

Basic JSON-RPC message structure:
```typescript
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}
```

Basic MCP initialize response:
```typescript
{
  jsonrpc: "2.0",
  id: 1,
  result: {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {}
    },
    serverInfo: {
      name: "team-think-mcp",
      version: "0.1.0"
    }
  }
}
```

### Notes for Implementation
- Keep each file focused on a single responsibility
- Use TypeScript's strict mode to catch errors early
- Follow the existing code style from the shared package
- All MCP communication must use stdin/stdout
- WebSocket functionality will be added in step 2.2 (not part of this task)
- Tools (chat_gemini, chat_chatgpt) will be implemented in step 2.5

### Success Criteria
- [X] Server starts and logs "Team Think MCP Server started"
- [X] Server responds correctly to MCP initialize request
- [X] Server handles errors gracefully without crashing
- [X] All TypeScript compiles without errors
- [X] Logging system works and provides useful debugging info