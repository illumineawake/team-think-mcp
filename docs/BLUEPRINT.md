# Team Think MCP Server - Design Blueprint

## Project Overview

Team Think MCP is a Model Context Protocol (MCP) server that enables programmatic interaction with web-based AI chat interfaces (Google Gemini AI Studio and ChatGPT). It allows users to send prompts to multiple AI services and receive responses automatically, facilitating "team think" workflows where multiple AI models collaborate on problems.

This project is inspired by and references Code Web Chat (CWC) for its browser interaction patterns, but is a completely separate implementation focused on MCP integration.

## Architecture

### High-Level Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  Claude Code    │────▶│   MCP Server     │────▶│ Browser Extension│
│  (or other MCP  │ MCP │  (Node.js/TS)    │ WS  │   (Modified     │
│    client)      │     │                  │     │   from CWC)     │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                           │
                                                           ▼
                                               ┌──────────────────────┐
                                               │   AI Chat Services   │
                                               │  • Gemini AI Studio  │
                                               │  • ChatGPT          │
                                               └──────────────────────┘
```

### Component Breakdown

1. **MCP Server** (`/server`)
   - Exposes MCP tools: `chat_gemini`, `chat_chatgpt`
   - Manages WebSocket server for browser communication
   - Robust request queue manager with concurrency limits, timeouts, race condition protection, and TTL-based memory leak prevention

2. **Browser Extension** (`/extension`)
   - Modified fork of CWC browser extension
   - Connects to MCP server via WebSocket
   - Injects prompts into AI chat interfaces
   - Automatically captures responses (no user interaction required)

3. **Shared Types** (`/shared`)
   - Common TypeScript interfaces and types
   - WebSocket message definitions

## Implementation Details

### 1. MCP Server Structure

```
team-think-mcp/
├── server/
│   ├── src/
│   │   ├── index.ts              # MCP server entry point with tool registration
│   │   ├── mcp/                  # MCP protocol implementation
│   │   │   ├── protocol.ts       # JSON-RPC protocol handler
│   │   │   ├── types.ts          # MCP type definitions
│   │   │   ├── handshake.ts      # MCP initialization
│   │   │   └── server.ts         # Main MCP server
│   │   ├── tools/
│   │   │   ├── registry.ts       # Tool registry system
│   │   │   ├── base-chat-tool.ts # Base class for chat tools (Phase 2.5)
│   │   │   ├── chat-gemini.ts    # Gemini tool implementation (Phase 2.5)
│   │   │   ├── chat-chatgpt.ts   # ChatGPT tool implementation (Phase 2.5)
│   │   │   └── chat-tools.test.ts # Comprehensive test suite (Phase 2.5)
│   │   ├── utils/
│   │   │   ├── logger.ts         # Structured logging
│   │   │   ├── security.ts       # Security utilities
│   │   │   └── validator.ts      # AJV schema validation with caching (Phase 2.5)
│   │   ├── websocket/            # WebSocket server implementation (Phase 2.2)
│   │   │   ├── websocket-server.ts # WebSocket server with heartbeat & connection mgmt
│   │   │   ├── index.ts          # WebSocket exports and singleton
│   │   │   └── test-client.ts    # WebSocket test client
│   │   ├── queue/                # Request queue manager (Phase 2.4)
│   │   │   ├── queue-manager.ts  # Robust queue with concurrency, timeout & memory leak prevention
│   │   │   ├── types.ts          # Queue-related type definitions
│   │   │   └── index.ts          # Queue exports and lazy singleton
│   │   ├── config/
│   │   │   └── constants.ts      # Server configuration constants
│   │   └── dev.ts                # Development testing client
│   ├── package.json
│   └── tsconfig.json
```

### 2. Browser Extension Structure

```
team-think-mcp/
├── extension/
│   ├── manifest.json             # Extension manifest (v3 for Chrome)
│   ├── src/
│   │   ├── background/
│   │   │   ├── index.ts         # Background script entry point
│   │   │   ├── config.ts        # Configuration constants
│   │   │   ├── websocket-client.ts # WebSocket client (adapted from CWC)
│   │   │   ├── message-handler.ts  # Chrome runtime message routing
│   │   │   └── tab-manager.ts   # Browser tab management
│   │   ├── content-scripts/
│   │   │   ├── index.ts         # Content script entry
│   │   │   └── chatbots/        # Adapted from CWC
│   │   │       ├── base-chatbot.ts # Base chatbot interface
│   │   │       ├── gemini.ts    # AI Studio adapter
│   │   │       └── chatgpt.ts   # ChatGPT adapter
│   │   ├── options/              # Extension options page
│   │   │   ├── options.html     # Auth token configuration UI
│   │   │   └── options.ts       # Options page logic
│   │   └── types/
│   │       └── messages.ts      # Internal message types
│   ├── package.json
│   └── webpack.config.js        # Webpack build configuration
```

### 3. Key Adaptations from CWC

#### Response Detection (No Button Required)

CWC Reference: `packages/browser/src/content-scripts/send-prompt-content-script/chatbots/*.ts`

Our implementation will modify CWC's response detection to:
1. Use the same MutationObserver patterns
2. Detect response completion using the same selectors
3. **Automatically extract the response text** instead of injecting a button
4. Send response back via WebSocket immediately

Example for ChatGPT (adapted from CWC's `chatgpt.ts`):
```typescript
// CWC checks for stop button to know when complete
const isGenerating = !!document.querySelector('button[data-testid="stop-button"]');

// Our version: when not generating, extract and send response
if (!isGenerating) {
  const responseText = extractResponseText();
  sendToMCPServer({
    action: 'chat-response',
    text: responseText,
    requestId: currentRequestId
  });
}
```

#### WebSocket Communication

CWC Reference: `packages/browser/src/background/websocket.ts`

Our WebSocket protocol:
```typescript
// Extension → MCP Server (Authentication)
interface AuthenticationMessage {
  action: 'authenticate';
  token: string;
}

// MCP Server → Extension
interface SendPromptMessage {
  action: 'send-prompt';
  requestId: string;
  chatbot: 'gemini' | 'chatgpt';
  prompt: string;
  options?: {
    temperature?: number;
    model?: string;
  };
}

// Extension → MCP Server
interface ChatResponseMessage {
  action: 'chat-response';
  requestId: string;
  response: string;
  error?: string;
  errorCode?: 'SESSION_EXPIRED' | 'LOGIN_REQUIRED' | 'AUTHENTICATION_FAILED' | 'NETWORK_ERROR' | 'UNKNOWN';
}
```

### 4. MCP Tool Definitions

#### chat_gemini Tool

```typescript
{
  name: "chat_gemini",
  description: "Send a prompt to Google Gemini AI and get a response",
  inputSchema: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "The prompt to send to Gemini" },
      temperature: { 
        type: "number", 
        description: "Controls randomness in the response (0.0 = deterministic, 1.0 = very random)", 
        minimum: 0,
        maximum: 1,
        default: 0.7 
      },
      model: { 
        type: "string", 
        description: "The Gemini model to use for the request", 
        enum: ["gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"],
        default: "gemini-2.5-flash" 
      }
    },
    required: ["prompt"],
    additionalProperties: false
  }
}
```

#### chat_chatgpt Tool

```typescript
{
  name: "chat_chatgpt",
  description: "Send a prompt to OpenAI ChatGPT and get a response",
  inputSchema: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "The prompt to send to ChatGPT" }
    },
    required: ["prompt"],
    additionalProperties: false
  }
}
```

### 5. Tool Implementation Architecture

The chat tools follow a robust architecture pattern:

1. **Base Chat Tool Class**
   - Implements the `Tool` interface from registry
   - Handles WebSocket connection state validation
   - Provides schema validation using compiled AJV validators
   - Manages error handling and MCP response formatting

2. **Tool-Specific Implementations**
   - `ChatGeminiTool`: Supports temperature and model parameters
   - `ChatGptTool`: Minimal interface with prompt-only parameter
   - Both tools use dependency injection for QueueManager

3. **Validation Layer**
   - AJV validator with schema compilation and caching
   - Input validation before queue operations
   - Type-safe parameter handling with TypeScript

4. **Error Handling**
   - WebSocket connection state checking
   - Session/login failure detection with specific error codes
   - Graceful degradation when browser extension is not connected

### 6. Request Flow

1. **MCP Client Request**
   ```
   Client → MCP Server: Execute tool "chat_gemini" with prompt
   ```

2. **Tool Validation & WebSocket Check**
   ```typescript
   // Tool checks WebSocket connection
   if (!hasAuthenticatedClients()) {
     return error("No browser extension connected");
   }
   // Validates input parameters
   const validationResult = validator.validate(args);
   ```

3. **Server Queues Request**
   ```typescript
   const promise = queueManager.addRequest('chat_gemini', prompt, options);
   // Automatically handles concurrency limits and timeouts
   ```

4. **Server Sends to Extension**
   ```
   MCP Server → Extension (WebSocket): { action: 'send-prompt', requestId, ... }
   ```

5. **Extension Opens Tab & Injects**
   - Creates new browser tab with AI chat URL
   - Waits for page load using CWC's wait conditions
   - Injects prompt using CWC's DOM manipulation code

6. **Extension Monitors Response**
   - Uses MutationObserver from CWC
   - Detects completion using CWC's selectors
   - Extracts response text

7. **Extension Sends Response**
   ```
   Extension → MCP Server (WebSocket): { action: 'chat-response', requestId, response }
   ```

8. **Server Returns to Client**
   ```
   MCP Server → Client: Tool result with AI response
   ```

### Important Implementation Note
The queue manager must actively send `send-prompt` messages to the extension when requests are activated. This was initially missing but has been fixed in the implementation.

## Implementation Phases

### Phase 1: MVP ✅
- ✅ Basic MCP server with chat_gemini and chat_chatgpt tools
- Simple browser extension (no UI, just background + content scripts)
- New tab for each request
- Automatic response detection and capture

### Phase 2: Server Implementation (Completed)
- ✅ Robust request queue manager with concurrency control, timeout handling, and TTL-based memory leak prevention (Phase 2.4)
- ✅ MCP tools implementation with comprehensive validation using AJV (Phase 2.5)
- ✅ WebSocket connection state checking in tools (Phase 2.5)
- ✅ Session/login error handling with specific error codes (Phase 2.5)
- ✅ 100% test coverage for chat tools with 24 comprehensive tests (Phase 2.5)
- ✅ Tool registration integrated into server startup (Phase 2.5)

### Phase 3: Browser Extension (In Progress)
- ✅ Adapt CWC browser extension code (Phase 3.1 - Complete)
- ✅ WebSocket client connection to MCP server (Phase 3.1 - Complete)
- ✅ Authentication flow with options page (Phase 3.1 - Complete)
- ⏳ Message handling for send-prompt (Phase 3.3 - Pending)
- ⏳ Tab creation and management (Phase 3.4 - Pending)
- ⏳ Content scripts for Gemini and ChatGPT (Phase 4 - Pending)
- ⏳ Automatic response extraction and sending (Phase 4 - Pending)

### Phase 4: Enhanced Features
- Continue conversation in same tab
- Support for more AI services
- Firefox support using CWC's build script

### Phase 5: Team Think Features
- Parallel requests to multiple AIs
- Response aggregation and comparison
- Consensus mechanisms

## Security Considerations

1. **WebSocket Security**
   - Localhost-only connections (localhost:55156)
     - Note: Use `localhost` instead of `127.0.0.1` for WSL compatibility
   - Ephemeral token authentication with cryptographically secure generation
   - 5-second authentication timeout to prevent hanging connections
   - Constant-time token validation to prevent timing attacks
   - Different port from CWC to avoid conflicts

2. **Extension Permissions**
   - Minimal permissions: tabs, storage, specific AI chat domains
   - No broad host permissions

3. **Data Privacy**
   - No data persistence
   - All communication local
   - Relies on user's existing AI chat sessions

## Development Setup

### Prerequisites
- Node.js 18+
- TypeScript 5+
- Chrome/Firefox browser
- MCP-compatible client (e.g., Claude Code)

### Key Dependencies
- **ws**: WebSocket server implementation
- **ajv**: JSON Schema validation for tool input validation
- **@team-think-mcp/shared**: Shared types for WebSocket messages
- **jest**: Testing framework with 100% coverage for chat tools

### Build Commands
```bash
# Install dependencies
npm install

# Build MCP server
npm run build:server

# Build extension
npm run build:extension

# Build Firefox version
npm run build:firefox

# Start MCP server
npm run start:server
```

## Testing Strategy

1. **Unit Tests (Implemented)**
   - ✅ Chat tools implementation (24 comprehensive tests with 100% coverage)
   - ✅ Validation logic with AJV schema compilation
   - ✅ WebSocket connection state handling
   - ✅ Error propagation and MCP response formatting
   - ✅ Tool registry integration
   - ✅ Comprehensive queue management (25 tests covering concurrency, timeouts, race conditions, memory leak prevention)

2. **Integration Tests (Planned)**
   - WebSocket communication
   - Extension ↔ Server interaction
   - Session/login failure scenarios

3. **E2E Tests (Planned)**
   - Full flow: MCP request → AI response
   - Multiple AI services
   - Error scenarios with specific error codes

4. **Manual Testing During Development**
   - Use `phased-testing-guide.md` for testing incomplete implementations
   - Use `manual-testing-guide.md` only after all phases complete
   - MCP server requires new instance per client (cannot share connections)

## Key Files to Reference from CWC

When implementing, refer to these CWC files:

1. **WebSocket Implementation**
   - `/packages/browser/src/background/websocket.ts` - WebSocket client
   - `/packages/vscode/src/services/websocket-server-process.ts` - Server setup

2. **Content Script Patterns**
   - `/packages/browser/src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts` - Main logic
   - `/packages/browser/src/content-scripts/send-prompt-content-script/chatbots/ai-studio.ts` - Gemini handling
   - `/packages/browser/src/content-scripts/send-prompt-content-script/chatbots/chatgpt.ts` - ChatGPT handling

3. **Message Types**
   - `/packages/shared/src/types/websocket-message.ts` - Message definitions

4. **Firefox Compatibility**
   - `/packages/browser/create-firefox-build.js` - Manifest conversion

## Success Criteria

1. **Functionality**
   - ✅ MCP tools for Gemini AI Studio and ChatGPT implemented
   - ✅ Robust input validation with proper schemas
   - ✅ WebSocket connection state checking
   - ✅ Browser extension structure and authentication (Phase 3.1)
   - ⏳ Receives complete responses automatically (pending Phase 3.3-4)
   - ⏳ Works with existing browser sessions (pending Phase 4)

2. **Performance**
   - ✅ Efficient schema validation with caching
   - ✅ Queue manager handles concurrent requests with limits
   - ⏳ Response detection within 500ms of completion (pending Phase 4)
   - ⏳ Minimal browser resource usage (pending optimization)

3. **Reliability**
   - ✅ Handles WebSocket disconnections gracefully
   - ✅ Server-side session/login error detection with specific codes
   - ✅ Comprehensive error handling and user-friendly messages
   - ✅ Queue prevents request loss with TTL and timeout handling
   - ✅ Extension reconnects automatically after disconnection
   - ⏳ Client-side session detection (pending Phase 4.1)
   - ⏳ Recovers from extension crashes (pending Phase 4)

4. **Developer Experience**
   - ✅ Simple MCP tool interface with TypeScript types
   - ✅ Clear error messages for all failure scenarios
   - ✅ Easy to extend with new AI services using base class
   - ✅ 100% test coverage for server components
   - ✅ Well-documented architecture and implementation
   - ✅ Phased testing guide for development