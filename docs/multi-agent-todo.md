<PLAN version="1.4">
<!-- Key corrections from review:
  - ChatGPT only accepts 'prompt', no temperature/model/system instructions
  - Gemini accepts prompt, temperature (0-1), and model selection
  - Tools must implement existing Tool interface from registry.ts
  - Execute method must return { content: Array<{type: "text", text: string}>, isError?: boolean }
  - Service names are 'chat_gemini' and 'chat_chatgpt'
-->
<!-- Post-implementation review findings:
  - ✅ Validator utility is production-ready with excellent caching
  - ✅ Tool architecture correctly implements Tool interface
  - ✅ Schemas are correct (ChatGPT minimal, Gemini with options)
  - ❌ WebSocket connection checking is missing in BaseChatTool
  - ❌ All tests are placeholders with expect(true).toBe(true)
  - ❌ Session/login failure handling not implemented
-->
1. **Background:**  
   The project, "Team Think MCP," requires the implementation of server-side tools (`chat_gemini` and `chat_chatgpt`) that will act as the interface between an MCP client and the backend request queue. The server's core components, including the WebSocket server and the request queue manager, are already in place. The next step is to create and register the specific tools that will place prompts into the queue to be processed by a browser extension.

2. **Problem Statement:**  
   The MCP server currently lacks the defined and registered tools that an MCP client can invoke to send prompts to Gemini and ChatGPT. The logic for adding a prompt to the request queue and awaiting its resolution needs to be formally implemented and encapsulated within these tools. A test-driven approach is required to ensure the tools are robust, testable, and correctly integrated with the `QueueManager` and MCP protocol.

3. **Goals:**  
   • Implement `ChatGeminiTool` and `ChatGptTool` classes that implement the existing `Tool` interface from `registry.ts`.  
   • Ensure these tools correctly interface with the `QueueManager` to enqueue prompts and await their resolution using a Dependency Injection pattern for testability.  
   • Implement robust, schema-based input validation using a standard library like Ajv, with compiled validators cached for performance.  
   • Ensure the `execute` method returns data matching the Tool interface: `{ content: Array<{ type: "text"; text: string }>; isError?: boolean }`.  
   • Register the new tools with the `ToolRegistry` so they are exposed to any connected MCP client.  
   • Adhere to a Test-Driven Development (TDD) workflow to guarantee correctness and facilitate future maintenance.

4. **Proposed Steps:**  
   - [X] **Phase 1 – Setup and Prerequisite Refactoring**  
     - [X] 1.1. In the `team-think-mcp/server` directory, install the `ajv` package for JSON Schema validation: `npm install ajv`.  
     - [X] 1.2. Create a validation utility (e.g., `team-think-mcp/server/src/utils/validator.ts`) that uses `ajv` to compile schemas and caches the compiled validator functions for performance.  
     - [X] 1.3. Create `team-think-mcp/server/src/tools/base-chat-tool.ts` that implements the `Tool` interface from `registry.ts`.
         - [X] 1.3.1. Import the `Tool` interface and implement all required properties and methods.
         - [X] 1.3.2. Add a protected `queueManager` property for dependency injection.
         - [X] 1.3.3. Add a protected `serviceName: 'chat_gemini' | 'chat_chatgpt'` property.
         - [X] 1.3.4. Add a protected `validate` property to hold the compiled Ajv validator.
         - [X] 1.3.5. Implement constructor that accepts all necessary parameters and initializes the validator.

   - [X] **Phase 2 – Test Suite Creation & Enhancement**  
     - [X] 2.1. Create a new test file: `team-think-mcp/server/src/tools/chat-tools.test.ts`.  
     - [X] 2.2. In the new test file, create a Jest mock of the `QueueManager`. This mock will be injected into tool instances during tests and allow verification of calls to its `addRequest` method and simulation of various outcomes (success, rejection, timeout).  
     - [X] 2.3. Write a test to ensure that when `chat_gemini` is executed with valid arguments, it calls `queueManager.addRequest` on the injected mock with the correct arguments (service name `'chat_gemini'`, prompt, and options).  
     - [X] 2.4. Write a similar test case for the `chat_chatgpt` tool, verifying it calls the queue with the service name `'chat_chatgpt'`.  
     - [X] 2.5. Write a test case to confirm that the tool's `execute` method correctly wraps a successful response from `addRequest` into the standard MCP format: `{ content: [{ type: 'text', text: '...' }] }`.  
     - [X] 2.6. Write a test case to confirm that the tool's `execute` method correctly propagates a generic error when the `addRequest` promise is rejected.  
     - [X] 2.7. Write a test case to confirm that a `QueueManager` timeout is propagated as a specific timeout error by the tool's `execute` method.  
     - [X] 2.8. Write negative-path tests to ensure `execute` rejects invalid arguments based on the tool's `inputSchema`:
         - [X] 2.8.1. For `chat_gemini`: temperature out of range (< 0 or > 1), invalid model name not in enum.
         - [X] 2.8.2. For `chat_chatgpt`: ensure it rejects any extra parameters like temperature or model.
         - [X] 2.8.3. For both tools: missing required `prompt` field.
     - [X] 2.9. Write a test to verify that after registration, `chat_gemini` and `chat_chatgpt` are correctly listed by `toolRegistry.list()`.  
     - [X] 2.10. Write a "shutdown hygiene" test to verify that `toolRegistry.clear()` works as expected and allows tools with the same names to be re-registered without errors.
     - [X] 2.11. Write a unit test for the `validator` utility to ensure it correctly caches the compiled schema validators.
     - [X] 2.12. Write a test to ensure tools properly handle the case when no WebSocket clients are connected (should fail gracefully with appropriate error message).

   - [X] **Phase 3 – Tool Implementation and Integration**  
     - [X] 3.1. In `team-think-mcp/server/src/tools/base-chat-tool.ts`, implement the `execute` method. It should first use the pre-compiled `this.validate` function on the incoming arguments, then call `this.queueManager.addRequest` using `this.serviceName`, and finally wrap the resulting string in the Tool interface format: `{ content: [{ type: 'text', text: response }] }`.  
     - [X] 3.2. In `team-think-mcp/server/src/tools/chat-gemini.ts`, create `ChatGeminiTool` class that extends `BaseChatTool` with:
         - [X] 3.2.1. Constructor that calls super with `'chat_gemini'` as serviceName.
         - [X] 3.2.2. InputSchema with: `prompt` (required string), `temperature` (optional number 0-1, default 0.7), `model` (optional string enum with Gemini models, default "gemini-2.5-flash").
     - [X] 3.3. In `team-think-mcp/server/src/tools/chat-chatgpt.ts`, create `ChatGptTool` class that extends `BaseChatTool` with:
         - [X] 3.3.1. Constructor that calls super with `'chat_chatgpt'` as serviceName.
         - [X] 3.3.2. InputSchema with only: `prompt` (required string) - no other parameters.
     - [X] 3.4. In `team-think-mcp/server/src/index.ts`, import `ChatGeminiTool`, `ChatGptTool`, and the `getQueueManager` singleton.  
     - [X] 3.5. In `team-think-mcp/server/src/index.ts`, modify the server startup logic:
         - [X] 3.5.1. After WebSocket server starts, get the `QueueManager` singleton instance.
         - [X] 3.5.2. Create and register instances of both tools with the tool registry.
         - [X] 3.5.3. Ensure tools check WebSocket connection state before queuing requests.
     - [X] 3.6. Add error handling for session/login failure scenarios as mentioned in the blueprint (Phase 4.1).

   - [X] **Phase 4 – Validation and Cleanup**  
     - [X] 4.1. Run the full test suite created and enhanced in Phase 2 against the implemented tools.  
     - [X] 4.2. Debug and refactor the tool implementations until all tests pass, ensuring logic is clean, correct, and robust against invalid inputs and queue errors.  
     - [X] 4.3. Mark phase 2.5 in `team-think-mcp/docs/plan.md` as complete.

   - [X] **Phase 5 – Critical Fixes Required**
     - [X] 5.1. **Fix WebSocket Connection Checking in BaseChatTool**:
         - [X] 5.1.1. Import `getWebSocketServer` from '../websocket' in base-chat-tool.ts
         - [X] 5.1.2. Add connection check before calling queueManager.addRequest()
         - [X] 5.1.3. Return appropriate error message when no clients connected: "No browser extension connected. Please ensure the extension is running."
     - [X] 5.2. **Implement All Placeholder Tests**:
         - [X] 5.2.1. Replace all `expect(true).toBe(true)` with actual test implementations
         - [X] 5.2.2. Ensure mocks are properly utilized to verify function calls
         - [X] 5.2.3. Test actual validation logic, error handling, and edge cases
     - [X] 5.3. **Add Session/Login Failure Handling**:
         - [X] 5.3.1. Define error response format for login failures
         - [X] 5.3.2. Update QueueManager to handle specific error codes from extension
         - [X] 5.3.3. Ensure tools properly propagate session errors to MCP clients
     - [X] 5.4. **Verify End-to-End Functionality**:
         - [X] 5.4.1. Run `npm test` and ensure all tests pass
         - [X] 5.4.2. Test with disconnected WebSocket to verify error handling
         - [X] 5.4.3. Test with MCP client to ensure tools are properly exposed
</PLAN>