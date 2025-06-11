```md
<PLAN version="1.1">
1. **Background:**  
   The project is to create "Team Think MCP," a Model Context Protocol (MCP) server. This server will enable programmatic interaction with popular web-based AI chat interfaces, specifically Google's AI Studio and OpenAI's ChatGPT. The architecture is inspired by the existing Code Web Chat (CWC) project, which demonstrates robust browser interaction patterns. The goal is to build a system that can orchestrate multiple AI models for collaborative "team think" workflows, going beyond what the standard web UIs allow.

2. **Problem Statement:**  
   There is no standardized way to programmatically interact with and automate web-based AI chat services. This limitation prevents developers from building advanced workflows, such as having multiple AI models collaborate on a single problem ("team think"). A dedicated local server is needed to act as a bridge, exposing MCP tools that can control these web interfaces, manage requests, and return responses to an MCP client.

3. **Goals:**  
   • Develop a standalone Node.js MCP server that exposes tools (`chat_gemini`, `chat_chatgpt`) for interacting with web-based AI chats.  
   • Create a browser extension, adapted from the CWC project, to programmatically inject prompts and automatically extract responses from chat UIs without user intervention.  
   • Implement a secure, local WebSocket protocol for real-time communication between the MCP server and the browser extension.  
   • Establish a request queuing system on the server to manage and track concurrent requests to different AI services.  
   • Achieve a functional Minimum Viable Product (MVP) that successfully handles a single request-response cycle for both Gemini and ChatGPT.

4. **Proposed Steps:**  
   - [x] **Phase 1 – Project Scaffolding & Shared Types**  
       - [x] 1.1. Create a new monorepo structure for the "team-think-mcp" project, with directories for `server`, `extension`, and `shared`.  
       - [x] 1.2. In the `shared` package, define the versioned TypeScript types for the WebSocket communication protocol. Specifically, create `SendPromptMessage` and `ChatResponseMessage` with a `schema: '1.0'` field.  
       - [x] 1.3. Set up basic `package.json` and `tsconfig.json` files for each of the new packages (`server`, `extension`, `shared`).  

   - [ ] **Phase 2 – MCP Server Implementation (MVP)**  
       - [x] 2.1. In the `server` package, set up a basic Node.js server using TypeScript.  
       - [x] 2.2. Implement a WebSocket server that listens on a new port (e.g., 55156) to avoid conflicts with CWC.  
       - [x] 2.3. Implement a hardened security handshake: on startup, the server generates an ephemeral security token and logs it to the console for the user to configure in the extension. Reject connections without this token.  
       - [ ] 2.4. Create a robust request queue manager (`queue-manager.ts`) with the following features:
           - [ ] 2.4.1. A mechanism to hold incoming prompts and associate them with a unique `requestId`.
           - [ ] 2.4.2. Concurrency limits to control how many jobs can run in parallel for each service (e.g., `MAX_PARALLEL_PER_SERVICE=1`).
           - [ ] 2.4.3. A per-request timeout (`REQUEST_TTL_MS`) to prevent indefinite hangs.
           - [ ] 2.4.4. A cancellation/cleanup function to handle timed-out requests or requests that fail due to WebSocket/tab closure.
       - [ ] 2.5. Stub out the MCP tools (`chat-gemini.ts`, `chat-chatgpt.ts`). These tools will add a request to the queue and await its resolution.  
       - [ ] 2.6. When a `chat-response` or `chat-error` message is received from the extension, the server should resolve or reject the corresponding queued request and return the outcome to the MCP client.  

   - [ ] **Phase 3 – Browser Extension - Core Logic (MVP)**  
       - [ ] 3.1. Adapt the CWC `packages/browser` code into the new `extension` package.  
       - [ ] 3.2. Modify the background script's WebSocket client (`websocket.ts`) to connect to the new MCP server on port 55156.  
           - [ ] 3.2.1. Implement a method for the user to input and save the server's ephemeral security token (e.g., via an extension options page that uses `browser.storage.local`). The client must send this token on connection.
       - [ ] 3.3. In the background script's message handler, implement a listener for the `send-prompt` message from the MCP server.  
       - [ ] 3.4. Upon receiving a `send-prompt` message, the extension should open a new browser tab for the correct chatbot URL (`gemini` or `chatgpt`) and pass the prompt details to the content script.
       - [ ] 3.5. Consider implementing CWC's hash-based initialization pattern (e.g., `#team-think-gemini` or `#team-think-chatgpt`) to signal the content script about the specific operation mode and pass initial parameters.  

   - [ ] **Phase 4 – Browser Extension - Chatbot Interaction (MVP)**  
       - [ ] 4.1. In each chatbot content script, implement a pre-flight session check. Before injecting the prompt, check for DOM elements indicating the user is not logged in (e.g., a login form). If not logged in, send a `ChatResponseMessage` back to the server with an appropriate error message.
       - [ ] 4.2. Adapt the CWC content scripts for AI Studio (`ai-studio.ts`) and ChatGPT (`chatgpt.ts`) for prompt injection.
       - [ ] 4.3. Implement fully automated response extraction:
           - [ ] 4.3.1. **Crucial Change:** Completely remove all CWC logic related to creating, styling, and injecting an "Apply response" button. The interaction must be fully automated.
           - [ ] 4.3.2. Implement a `MutationObserver` (referencing CWC's pattern) to detect when a response has finished generating (e.g., the 'stop generating' button disappears).
           - [ ] 4.3.3. Once generation is complete, automatically extract the full response text content from the relevant DOM elements.
           - [ ] 4.3.4. Send the extracted text back to the background script, which will then construct and send a `ChatResponseMessage` (including the `requestId` and response text) to the MCP server.

   - [ ] **Phase 5 – Integration & Testing (MVP)**  
       - [ ] 5.1. Test the end-to-end flow for `chat_gemini`: MCP client sends a prompt, server queues it, extension opens Gemini, injects the prompt, captures the response, and the server returns it to the client.  
       - [ ] 5.2. Test the end-to-end flow for `chat_chatgpt` with the same steps.  
       - [ ] 5.3. Ensure robust error handling is tested, including WebSocket disconnections, request timeouts, and the new session/login failure detection.  

   - [ ] **Phase 6 – Enhancements (Post-MVP)**  
       - [ ] 6.1. Implement conversation continuity by reusing existing tabs instead of opening a new one for every request.  
       - [ ] 6.2. Add support for more AI services by creating new chatbot adapter scripts in the extension.  
       - [ ] 6.3. Build a Firefox-compatible version of the extension using CWC's `create-firefox-build.js` as a reference.  
       - [ ] 6.4. Implement logic for parallel requests and response aggregation to enable "team think" features.
</PLAN>

```