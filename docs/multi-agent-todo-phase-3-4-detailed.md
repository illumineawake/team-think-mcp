# Multi-Agent Todo: Complete Browser Extension (Phases 3.2-4) - Detailed Breakdown

## Context
Phase 3.1 has been successfully implemented and tested. The extension structure exists and can connect to the MCP server. Now we need to implement the actual functionality to handle messages and interact with AI websites.

## Important Architecture Notes
- The MCP server sends `send-prompt` messages via WebSocket to the extension
- The extension must open browser tabs and inject prompts
- Content scripts monitor for responses and send them back
- All communication flows through the background script

---

## Phase 3.3: Implement Send-Prompt Message Handler

### Agent 3 Task: Write Tests for Message Handler
- [ ] Create test file: `@team-think-mcp/extension/src/background/websocket-client.test.ts`
- [ ] Write test: "should call handleSendPrompt when receiving send-prompt message"
- [ ] Write test: "should ignore messages with unknown action types"
- [ ] Write test: "should handle malformed messages gracefully"
- [ ] Mock the handleSendPrompt function from tab-manager

### Agent 2 Task: Implement Message Handler
- [ ] Open `@team-think-mcp/extension/src/background/websocket-client.ts`
- [ ] Find the `handleMessage` function (around line 75)
- [ ] Look for the switch statement with `message.action`
- [ ] The case for `'send-prompt'` should already exist - verify it calls `handleSendPrompt`
- [ ] If not, add:
  ```typescript
  case 'send-prompt':
    await handleSendPrompt(message as SendPromptMessage)
    break
  ```
- [ ] Add console.log to verify messages are received:
  ```typescript
  console.log('[WebSocket] Received send-prompt:', message)
  ```

---

## Phase 3.4: Implement Tab Opening and Prompt Passing

### Agent 3 Task: Write Tests for Tab Manager
- [ ] Create test file: `@team-think-mcp/extension/src/background/tab-manager.test.ts`
- [ ] Write test: "should create new tab with correct URL for gemini"
- [ ] Write test: "should create new tab with correct URL for chatgpt"
- [ ] Write test: "should store requestId to tabId mapping"
- [ ] Write test: "should send inject-prompt message after tab loads"
- [ ] Mock chrome.tabs.create and chrome.tabs.sendMessage

### Agent 2 Task: Verify Tab Manager Implementation
- [ ] Open `@team-think-mcp/extension/src/background/tab-manager.ts`
- [ ] Check if `handleSendPrompt` function exists and implements:
  1. Creates new tab with correct URL based on chatbot type
  2. Stores requestId → tabId mapping
  3. Stores tabId → requestId mapping
  4. Sets up onUpdated listener to wait for tab to load
  5. Sends message to content script when tab is ready
- [ ] Add detailed logging:
  ```typescript
  console.log(`[TabManager] Creating tab for ${message.chatbot}`)
  console.log(`[TabManager] Tab ${tabId} created for request ${requestId}`)
  console.log(`[TabManager] Sending inject-prompt to tab ${tabId}`)
  ```

---

## Phase 4.1: Implement Session Checks

### Agent 3 Task: Write Tests for Session Detection
- [ ] Create test file: `@team-think-mcp/extension/src/content-scripts/chatbots/gemini.test.ts`
- [ ] Write test: "should detect logged-in state on Gemini"
- [ ] Write test: "should detect logged-out state on Gemini"
- [ ] Write test: "should return LOGIN_REQUIRED error when not logged in"
- [ ] Create similar tests for chatgpt.test.ts

### Agent 2 Task: Implement Gemini Session Check
- [ ] Open `@team-think-mcp/extension/src/content-scripts/chatbots/gemini.ts`
- [ ] Add function to check login status:
  ```typescript
  function isLoggedIn(): boolean {
    // Check for login button or other indicators
    const loginButton = document.querySelector('[aria-label*="Sign in"]')
    const userAvatar = document.querySelector('[aria-label*="Account"]')
    return !loginButton && !!userAvatar
  }
  ```
- [ ] In the message handler, check login before injecting:
  ```typescript
  if (!isLoggedIn()) {
    chrome.runtime.sendMessage({
      action: 'chat-response',
      data: {
        requestId: data.requestId,
        error: 'User not logged in',
        errorCode: 'LOGIN_REQUIRED'
      }
    })
    return
  }
  ```

### Agent 2 Task: Implement ChatGPT Session Check
- [ ] Open `@team-think-mcp/extension/src/content-scripts/chatbots/chatgpt.ts`
- [ ] Add similar login detection for ChatGPT:
  ```typescript
  function isLoggedIn(): boolean {
    // ChatGPT shows login page with specific elements
    const loginForm = document.querySelector('form[action*="login"]')
    const conversationArea = document.querySelector('main')
    return !loginForm && !!conversationArea
  }
  ```

---

## Phase 4.2: Implement Prompt Injection

### Agent 3 Task: Write Tests for Prompt Injection
- [ ] Add to gemini.test.ts:
  - Test: "should find and fill prompt input field"
  - Test: "should click send button after filling prompt"
  - Test: "should handle missing input field gracefully"
- [ ] Add similar tests to chatgpt.test.ts

### Agent 2 Task: Implement Gemini Prompt Injection
- [ ] In `gemini.ts`, implement prompt injection:
  ```typescript
  async function injectPrompt(prompt: string, options?: any) {
    // Find the input textarea
    const input = document.querySelector('rich-textarea .ql-editor') as HTMLElement
    if (!input) {
      throw new Error('Could not find input field')
    }
    
    // Set the prompt text
    input.textContent = prompt
    input.innerHTML = `<p>${prompt}</p>`
    
    // Trigger input event
    input.dispatchEvent(new Event('input', { bubbles: true }))
    
    // Find and click send button
    const sendButton = document.querySelector('[aria-label*="Send message"]') as HTMLElement
    if (sendButton) {
      sendButton.click()
    }
  }
  ```

### Agent 2 Task: Implement ChatGPT Prompt Injection  
- [ ] In `chatgpt.ts`, implement prompt injection:
  ```typescript
  async function injectPrompt(prompt: string) {
    // Find the contenteditable div
    const input = document.querySelector('#prompt-textarea') as HTMLElement
    if (!input) {
      throw new Error('Could not find input field')
    }
    
    // Set the prompt text
    input.textContent = prompt
    
    // Trigger input event
    input.dispatchEvent(new Event('input', { bubbles: true }))
    
    // Send by pressing Enter or clicking button
    const sendButton = document.querySelector('[data-testid="send-button"]') as HTMLElement
    if (sendButton && !sendButton.disabled) {
      sendButton.click()
    }
  }
  ```

---

## Phase 4.3: Implement Response Monitoring

### Agent 3 Task: Write Tests for Response Extraction
- [ ] Add to gemini.test.ts:
  - Test: "should detect when response is being generated"
  - Test: "should detect when response is complete"
  - Test: "should extract complete response text"
  - Test: "should send response back via chrome.runtime.sendMessage"
- [ ] Add similar tests to chatgpt.test.ts

### Agent 2 Task: Implement Gemini Response Monitor
- [ ] In `gemini.ts`, add response monitoring:
  ```typescript
  function monitorResponse(requestId: string) {
    const observer = new MutationObserver((mutations) => {
      // Check if still generating (look for stop button or loading indicators)
      const isGenerating = !!document.querySelector('[aria-label*="Stop generating"]')
      
      if (!isGenerating) {
        // Extract response text
        const responseElements = document.querySelectorAll('.model-response-text')
        const lastResponse = responseElements[responseElements.length - 1]
        
        if (lastResponse) {
          const responseText = lastResponse.textContent || ''
          
          // Send response back
          chrome.runtime.sendMessage({
            action: 'chat-response',
            data: {
              requestId: requestId,
              response: responseText
            }
          })
          
          observer.disconnect()
        }
      }
    })
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }
  ```

### Agent 2 Task: Implement ChatGPT Response Monitor
- [ ] In `chatgpt.ts`, add similar monitoring:
  ```typescript
  function monitorResponse(requestId: string) {
    const observer = new MutationObserver((mutations) => {
      // Check for stop button to know if generating
      const isGenerating = !!document.querySelector('[data-testid="stop-button"]')
      
      if (!isGenerating) {
        // Get all message groups
        const messages = document.querySelectorAll('[data-message-author-role="assistant"]')
        const lastMessage = messages[messages.length - 1]
        
        if (lastMessage) {
          const responseText = lastMessage.textContent || ''
          
          chrome.runtime.sendMessage({
            action: 'chat-response',
            data: {
              requestId: requestId,
              response: responseText
            }
          })
          
          observer.disconnect()
        }
      }
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }
  ```

---

## Phase 4.3.4: Wire Up Response Flow

### Agent 3 Task: Write Tests for Response Flow
- [ ] Create test: `@team-think-mcp/extension/src/background/message-handler.test.ts`
- [ ] Test: "should forward chat-response to WebSocket"
- [ ] Test: "should include requestId in forwarded message"
- [ ] Test: "should handle errors in response message"

### Agent 2 Task: Implement Response Handler
- [ ] Open `@team-think-mcp/extension/src/background/message-handler.ts`
- [ ] Check if handler exists for 'chat-response' action
- [ ] If not, add:
  ```typescript
  case 'chat-response':
    await handleChatResponse(message)
    sendResponse({ success: true })
    break
  ```
- [ ] Implement handleChatResponse to send via WebSocket:
  ```typescript
  async function handleChatResponse(message: any) {
    const wsMessage: ChatResponseMessage = {
      schema: '1.0',
      timestamp: Date.now(),
      action: 'chat-response',
      requestId: message.data.requestId,
      response: message.data.response,
      error: message.data.error,
      errorCode: message.data.errorCode
    }
    
    sendWebSocketMessage(wsMessage)
  }
  ```

---

## Integration Points to Verify

### Agent 2 Final Tasks:
- [ ] Ensure all console.log statements are in place for debugging
- [ ] Test the complete flow manually:
  1. Server sends send-prompt
  2. Extension opens tab
  3. Content script injects prompt
  4. Response is captured
  5. Response sent back to server
- [ ] Document any selector changes needed for current AI websites

### Agent 3 Final Tasks:
- [ ] Run all tests and ensure they pass
- [ ] Add integration test that mocks the complete flow
- [ ] Document test coverage percentage

## Common Pitfalls to Avoid
1. **Timing Issues**: Content scripts may not be ready when tab loads
2. **Selector Changes**: AI websites update frequently - selectors may need adjustment
3. **Message Format**: Ensure all messages include proper schema version
4. **Error Handling**: Always send error responses, never leave requests hanging

## Success Criteria
- [ ] Extension receives send-prompt messages (verify with console.log)
- [ ] New tabs open for the correct AI service
- [ ] Prompts are injected and visible in the AI chat
- [ ] Responses are detected when generation completes
- [ ] Responses arrive back at the MCP server
- [ ] Login detection prevents errors when not authenticated