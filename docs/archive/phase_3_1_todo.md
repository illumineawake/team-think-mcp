# Multi-Agent Todo: Phase 3.1 - Adapt CWC Browser Extension

## Context
We need to adapt the Code Web Chat (CWC) browser extension code into our Team Think MCP extension. The goal is to create a minimal browser extension that:
- Connects to our MCP server via WebSocket on port 55156
- Supports only Gemini AI Studio and ChatGPT (no other chatbots)
- Automatically injects prompts and extracts responses (no user buttons)
- Implements security token authentication

## Prerequisites
- [X] Read `@team-think-mcp/docs/BLUEPRINT.md` sections 3-4 to understand the extension architecture
- [X] Read `@team-think-mcp/shared/src/types/websocket-messages.ts` to understand message formats
- [X] Review CWC's WebSocket implementation at `@packages/browser/src/background/websocket.ts`

## Implementation Steps

### Step 1: Basic Extension Structure
- [X] Create `@team-think-mcp/extension/src/` directory structure
- [X] Create `@team-think-mcp/extension/src/manifest.json` with minimal permissions:
  - Host permissions for `https://aistudio.google.com/*` and `https://chatgpt.com/*`
  - Storage permission for saving auth token
  - Tabs permission for creating new tabs
- [X] Create `@team-think-mcp/extension/webpack.config.js` based on CWC's webpack config but simplified

### Step 2: Background Script Foundation
- [X] Create `@team-think-mcp/extension/src/background/` directory
- [X] Create `@team-think-mcp/extension/src/background/index.ts` as the main entry point
- [X] Create `@team-think-mcp/extension/src/background/config.ts` with:
  - MCP_SERVER_URL = 'ws://127.0.0.1:55156'
  - Storage keys for auth token
- [X] Create `@team-think-mcp/extension/src/types/messages.ts` for internal extension messages

### Step 3: WebSocket Client Implementation
- [X] Create `@team-think-mcp/extension/src/background/websocket-client.ts` adapted from CWC's websocket.ts
- [X] Implement connection to MCP server on port 55156 (not CWC's port)
- [X] Implement authentication flow:
  - Read auth token from browser storage
  - Send authentication message on connect: `{ action: 'authenticate', token: string }`
  - Handle authentication success/failure
- [X] Implement heartbeat/reconnection logic from CWC
- [X] Implement message handlers for `send-prompt` messages from server

### Step 4: Message Router
- [X] Create `@team-think-mcp/extension/src/background/message-handler.ts`
- [X] Implement Chrome runtime message listener
- [X] Handle messages from content scripts (chat responses)
- [X] Route `send-prompt` messages to appropriate tab creation logic

### Step 5: Tab Management
- [X] Create `@team-think-mcp/extension/src/background/tab-manager.ts`
- [X] Implement function to create new tab for chatbot:
  - Gemini: `https://aistudio.google.com/app/prompts/new_chat`
  - ChatGPT: `https://chatgpt.com/`
- [X] Add request tracking to associate tabs with requestIds
- [X] Implement tab-to-request mapping for response routing

### Step 6: Content Script Structure
- [X] Create `@team-think-mcp/extension/src/content-scripts/` directory
- [X] Create `@team-think-mcp/extension/src/content-scripts/index.ts` as entry point
- [X] Create `@team-think-mcp/extension/src/content-scripts/chatbots/` directory
- [X] Create base chatbot interface based on CWC's pattern

### Step 7: Gemini Content Script
- [X] Create `@team-think-mcp/extension/src/content-scripts/chatbots/gemini.ts`
- [X] Adapt from CWC's `ai-studio.ts` with these changes:
  - Remove button creation logic
  - Implement automatic response detection
  - Add prompt injection logic
  - Send response back automatically when complete
- [ ] Test selectors against current AI Studio UI

### Step 8: ChatGPT Content Script
- [X] Create `@team-think-mcp/extension/src/content-scripts/chatbots/chatgpt.ts`
- [X] Adapt from CWC's `chatgpt.ts` with these changes:
  - Remove button creation logic
  - Implement automatic response detection using stop button selector
  - Add prompt injection logic
  - Send response back automatically when complete
- [ ] Test selectors against current ChatGPT UI

### Step 9: Extension Options Page
- [X] Create `@team-think-mcp/extension/src/options/` directory
- [X] Create simple HTML page for auth token input
- [X] Create script to save token to browser.storage.local
- [X] Add options page to manifest.json

### Step 10: Build and Package
- [X] Update `@team-think-mcp/extension/package.json` scripts
- [X] Test webpack build configuration
- [X] Create development build
- [X] Document how to load unpacked extension in Chrome

## Testing Checklist
- [X] Extension loads without errors in Chrome
- [X] WebSocket connects to MCP server with valid token
- [X] WebSocket rejects connection with invalid token
- [ ] Extension opens correct tab for each chatbot
- [ ] Content scripts inject successfully
- [ ] Manual test: Can inject prompt into Gemini
- [ ] Manual test: Can inject prompt into ChatGPT

## Notes
- Focus on MVP functionality - no UI beyond options page
- Keep authentication simple with ephemeral tokens
- Each step should be independently testable
- Refer to CWC code for patterns but simplify where possible