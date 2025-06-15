# Multi-Agent Todo: Complete Browser Extension (Phases 3.2-4)

## Context
The browser extension structure has been created (Phase 3.1), but it's not functional yet. It can connect to the MCP server but doesn't handle messages or interact with AI websites. We need to complete the implementation to enable the full end-to-end flow.

## Current State
- ✅ Extension structure created
- ✅ WebSocket connection works
- ✅ Authentication works
- ❌ No message handling for `send-prompt`
- ❌ No browser tab management
- ❌ No prompt injection
- ❌ No response extraction

## Prerequisites
- [ ] Read `@team-think-mcp/docs/BLUEPRINT.md` to understand the full architecture
- [ ] Read `@team-think-mcp/docs/plan.md` Phases 3-4 for detailed requirements
- [ ] Review existing extension code in `@team-think-mcp/extension/src/`

## Phase 3: Core Logic Implementation

### Step 1: Fix WebSocket Message Handler (Phase 3.3)
- [ ] Open `@team-think-mcp/extension/src/background/websocket-client.ts`
- [ ] In the `handleMessage` function, add a case for `'send-prompt'`
- [ ] When receiving `send-prompt`, call the tab manager's `handleSendPrompt` function
- [ ] Test that messages are being received by adding console.log statements

### Step 2: Implement Tab Manager Send Prompt Handler (Phase 3.4)
- [ ] Open `@team-think-mcp/extension/src/background/tab-manager.ts`
- [ ] Review the existing `handleSendPrompt` function
- [ ] Ensure it:
  - Creates a new tab with the correct URL
  - Stores the requestId-to-tabId mapping
  - Waits for tab to load before injecting prompt
- [ ] Test tab creation with both Gemini and ChatGPT URLs

### Step 3: Implement Message Passing to Content Scripts
- [ ] In `tab-manager.ts`, after tab loads, send message to content script:
  ```typescript
  chrome.tabs.sendMessage(tabId, {
    action: 'inject-prompt',
    data: { requestId, prompt, options }
  })
  ```
- [ ] Add error handling for cases where content script isn't ready

### Step 4: Set Up Content Script Message Listener
- [ ] Open `@team-think-mcp/extension/src/content-scripts/index.ts`
- [ ] Add chrome.runtime.onMessage listener
- [ ] When receiving `inject-prompt`, determine which chatbot and call appropriate handler
- [ ] Pass the prompt data to the chatbot-specific implementation

## Phase 4: Chatbot Interaction Implementation

### Step 5: Implement Gemini Session Check (Phase 4.1)
- [ ] Open `@team-think-mcp/extension/src/content-scripts/chatbots/gemini.ts`
- [ ] Add function to check if user is logged in:
  - Look for login button or session indicators
  - Return LOGIN_REQUIRED error if not logged in
- [ ] Test with both logged-in and logged-out states

### Step 6: Implement Gemini Prompt Injection (Phase 4.2)
- [ ] In `gemini.ts`, implement the `injectPrompt` function:
  - Find the input field (check for both desktop and mobile selectors)
  - Set the prompt text
  - Trigger input events to make Gemini recognize the text
  - Find and click the send button
- [ ] Handle temperature and model options if provided

### Step 7: Implement Gemini Response Monitoring (Phase 4.3)
- [ ] Set up MutationObserver to watch for response changes
- [ ] Detect when response is complete (no "stop" button, stable content)
- [ ] Extract the full response text from the appropriate elements
- [ ] Send response back via chrome.runtime.sendMessage

### Step 8: Implement ChatGPT Session Check
- [ ] Open `@team-think-mcp/extension/src/content-scripts/chatbots/chatgpt.ts`
- [ ] Add login detection similar to Gemini
- [ ] Check for login prompts or session expired messages

### Step 9: Implement ChatGPT Prompt Injection
- [ ] Find the contenteditable div for input
- [ ] Set the prompt text (handle contenteditable properly)
- [ ] Trigger the send action (Enter key or button click)

### Step 10: Implement ChatGPT Response Monitoring
- [ ] Set up MutationObserver for ChatGPT's response area
- [ ] Detect completion (no stop button visible)
- [ ] Extract response text from appropriate elements
- [ ] Send back to background script

### Step 11: Wire Up Response Flow
- [ ] In background `message-handler.ts`, handle chat-response from content scripts
- [ ] Forward the response to the WebSocket server
- [ ] Ensure requestId is preserved throughout the flow

## Testing Checklist
- [ ] WebSocket receives send-prompt messages
- [ ] New tabs open for correct chatbot
- [ ] Prompts are injected successfully
- [ ] Responses are detected when complete
- [ ] Responses are sent back to MCP server
- [ ] Login detection works properly
- [ ] Error handling for all failure cases

## Implementation Notes
- Start with Gemini as it's generally more stable
- Test each step individually before moving on
- Use console.log liberally for debugging
- Check browser console in both background and content script contexts
- Reference CWC code but adapt for our automatic flow (no buttons)

## Common Issues to Watch For
- Content scripts not injected (check manifest.json matches)
- Timing issues (page not fully loaded)
- Selector changes (AI sites update frequently)
- CORS or security issues with message passing