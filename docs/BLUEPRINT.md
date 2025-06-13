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
│   │   ├── index.ts              # MCP server entry point
│   │   ├── mcp/                  # MCP protocol implementation
│   │   │   ├── protocol.ts       # JSON-RPC protocol handler
│   │   │   ├── types.ts          # MCP type definitions
│   │   │   ├── handshake.ts      # MCP initialization
│   │   │   └── server.ts         # Main MCP server
│   │   ├── tools/
│   │   │   └── registry.ts       # Tool registry system
│   │   ├── utils/
│   │   │   └── logger.ts         # Structured logging
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
│   ├── manifest.json             # Extension manifest (v3 for Chrome, v2 for Firefox)
│   ├── src/
│   │   ├── background/
│   │   │   ├── index.ts         # Background script
│   │   │   └── websocket.ts     # WebSocket client (adapted from CWC)
│   │   └── content-scripts/
│   │       ├── index.ts         # Content script entry
│   │       └── chatbots/        # Adapted from CWC
│   │           ├── gemini.ts    # AI Studio adapter
│   │           └── chatgpt.ts   # ChatGPT adapter
│   ├── package.json
│   └── build-firefox.js         # Firefox compatibility script
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
}
```

### 4. MCP Tool Definitions

#### chat_gemini Tool

```typescript
{
  name: "chat_gemini",
  description: "Send a prompt to Google Gemini AI Studio and get response",
  inputSchema: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "The prompt to send" },
      temperature: { type: "number", description: "Temperature (0-1)", default: 0.7 },
      model: { type: "string", description: "Model name", default: "gemini-pro" }
    },
    required: ["prompt"]
  }
}
```

#### chat_chatgpt Tool

```typescript
{
  name: "chat_chatgpt",
  description: "Send a prompt to ChatGPT and get response",
  inputSchema: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "The prompt to send" },
      temperature: { type: "number", description: "Temperature (0-2)", default: 1 },
      model: { type: "string", description: "Model name", default: "gpt-4" }
    },
    required: ["prompt"]
  }
}
```

### 5. Request Flow

1. **MCP Client Request**
   ```
   Client → MCP Server: Execute tool "chat_gemini" with prompt
   ```

2. **Server Queues Request**
   ```typescript
   const promise = queueManager.addRequest('chat_gemini', prompt, options);
   // Automatically handles concurrency limits and timeouts
   ```

3. **Server Sends to Extension**
   ```
   MCP Server → Extension (WebSocket): { action: 'send-prompt', requestId, ... }
   ```

4. **Extension Opens Tab & Injects**
   - Creates new browser tab with AI chat URL
   - Waits for page load using CWC's wait conditions
   - Injects prompt using CWC's DOM manipulation code

5. **Extension Monitors Response**
   - Uses MutationObserver from CWC
   - Detects completion using CWC's selectors
   - Extracts response text

6. **Extension Sends Response**
   ```
   Extension → MCP Server (WebSocket): { action: 'chat-response', requestId, response }
   ```

7. **Server Returns to Client**
   ```
   MCP Server → Client: Tool result with AI response
   ```

## Implementation Phases

### Phase 1: MVP
- Basic MCP server with chat_gemini and chat_chatgpt tools
- Simple browser extension (no UI, just background + content scripts)
- New tab for each request
- Automatic response detection and capture

### Phase 2: Enhancements
- ✅ Robust request queue manager with concurrency control, timeout handling, and TTL-based memory leak prevention
- Continue conversation in same tab
- Support for more AI services
- Firefox support using CWC's build script

### Phase 3: Team Think Features
- Parallel requests to multiple AIs
- Response aggregation and comparison
- Consensus mechanisms

## Security Considerations

1. **WebSocket Security**
   - Localhost-only connections (127.0.0.1:55156)
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

1. **Unit Tests**
   - MCP tool logic
   - Message parsing
   - Comprehensive queue management (25 tests covering concurrency, timeouts, race conditions, memory leak prevention)

2. **Integration Tests**
   - WebSocket communication
   - Extension ↔ Server interaction

3. **E2E Tests**
   - Full flow: MCP request → AI response
   - Multiple AI services
   - Error scenarios

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
   - Can send prompts to Gemini AI Studio and ChatGPT
   - Receives complete responses automatically
   - Works with existing browser sessions

2. **Performance**
   - Response detection within 500ms of completion
   - Minimal browser resource usage

3. **Reliability**
   - Handles network errors gracefully
   - Recovers from extension crashes
   - Queue prevents request loss

4. **Developer Experience**
   - Simple MCP tool interface
   - Clear error messages
   - Easy to extend with new AI services