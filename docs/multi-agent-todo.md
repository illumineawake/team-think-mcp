<PLAN version="1.4">
<!-- Key corrections from review:
  - ChatGPT only accepts 'prompt', no temperature/model/system instructions
  - Gemini accepts prompt, temperature (0-1), and model selection
  - Tools must implement existing Tool interface from registry.ts
  - Execute method must return { content: Array<{type: "text", text: string}>, isError?: boolean }
  - Service names are 'chat_gemini' and 'chat_chatgpt'
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
   - [ ] **Phase 1 – Setup and Prerequisite Refactoring**  
     - [ ] 1.1. In the `team-think-mcp/server` directory, install the `ajv` package for JSON Schema validation: `npm install ajv`.  
     - [ ] 1.2. Create a validation utility (e.g., `team-think-mcp/server/src/utils/validator.ts`) that uses `ajv` to compile schemas and caches the compiled validator functions for performance.  
     - [ ] 1.3. Create `team-think-mcp/server/src/tools/base-chat-tool.ts` that implements the `Tool` interface from `registry.ts`.
         - [ ] 1.3.1. Import the `Tool` interface and implement all required properties and methods.
         - [ ] 1.3.2. Add a protected `queueManager` property for dependency injection.
         - [ ] 1.3.3. Add a protected `serviceName: 'chat_gemini' | 'chat_chatgpt'` property.
         - [ ] 1.3.4. Add a protected `validate` property to hold the compiled Ajv validator.
         - [ ] 1.3.5. Implement constructor that accepts all necessary parameters and initializes the validator.

   - [ ] **Phase 2 – Test Suite Creation & Enhancement**  
     - [ ] 2.1. Create a new test file: `team-think-mcp/server/src/tools/chat-tools.test.ts`.  
     - [ ] 2.2. In the new test file, create a Jest mock of the `QueueManager`. This mock will be injected into tool instances during tests and allow verification of calls to its `addRequest` method and simulation of various outcomes (success, rejection, timeout).  
     - [ ] 2.3. Write a test to ensure that when `chat_gemini` is executed with valid arguments, it calls `queueManager.addRequest` on the injected mock with the correct arguments (service name `'chat_gemini'`, prompt, and options).  
     - [ ] 2.4. Write a similar test case for the `chat_chatgpt` tool, verifying it calls the queue with the service name `'chat_chatgpt'`.  
     - [ ] 2.5. Write a test case to confirm that the tool's `execute` method correctly wraps a successful response from `addRequest` into the standard MCP format: `{ content: [{ type: 'text', text: '...' }] }`.  
     - [ ] 2.6. Write a test case to confirm that the tool's `execute` method correctly propagates a generic error when the `addRequest` promise is rejected.  
     - [ ] 2.7. Write a test case to confirm that a `QueueManager` timeout is propagated as a specific timeout error by the tool's `execute` method.  
     - [ ] 2.8. Write negative-path tests to ensure `execute` rejects invalid arguments based on the tool's `inputSchema`:
         - [ ] 2.8.1. For `chat_gemini`: temperature out of range (< 0 or > 1), invalid model name not in enum.
         - [ ] 2.8.2. For `chat_chatgpt`: ensure it rejects any extra parameters like temperature or model.
         - [ ] 2.8.3. For both tools: missing required `prompt` field.
     - [ ] 2.9. Write a test to verify that after registration, `chat_gemini` and `chat_chatgpt` are correctly listed by `toolRegistry.list()`.  
     - [ ] 2.10. Write a "shutdown hygiene" test to verify that `toolRegistry.clear()` works as expected and allows tools with the same names to be re-registered without errors.
     - [ ] 2.11. Write a unit test for the `validator` utility to ensure it correctly caches the compiled schema validators.
     - [ ] 2.12. Write a test to ensure tools properly handle the case when no WebSocket clients are connected (should fail gracefully with appropriate error message).

   - [ ] **Phase 3 – Tool Implementation and Integration**  
     - [ ] 3.1. In `team-think-mcp/server/src/tools/base-chat-tool.ts`, implement the `execute` method. It should first use the pre-compiled `this.validate` function on the incoming arguments, then call `this.queueManager.addRequest` using `this.serviceName`, and finally wrap the resulting string in the Tool interface format: `{ content: [{ type: 'text', text: response }] }`.  
     - [ ] 3.2. In `team-think-mcp/server/src/tools/chat-gemini.ts`, create `ChatGeminiTool` class that extends `BaseChatTool` with:
         - [ ] 3.2.1. Constructor that calls super with `'chat_gemini'` as serviceName.
         - [ ] 3.2.2. InputSchema with: `prompt` (required string), `temperature` (optional number 0-1, default 0.7), `model` (optional string enum with Gemini models, default "gemini-2.5-flash").
     - [ ] 3.3. In `team-think-mcp/server/src/tools/chat-chatgpt.ts`, create `ChatGptTool` class that extends `BaseChatTool` with:
         - [ ] 3.3.1. Constructor that calls super with `'chat_chatgpt'` as serviceName.
         - [ ] 3.3.2. InputSchema with only: `prompt` (required string) - no other parameters.
     - [ ] 3.4. In `team-think-mcp/server/src/index.ts`, import `ChatGeminiTool`, `ChatGptTool`, and the `getQueueManager` singleton.  
     - [ ] 3.5. In `team-think-mcp/server/src/index.ts`, modify the server startup logic:
         - [ ] 3.5.1. After WebSocket server starts, get the `QueueManager` singleton instance.
         - [ ] 3.5.2. Create and register instances of both tools with the tool registry.
         - [ ] 3.5.3. Ensure tools check WebSocket connection state before queuing requests.
     - [ ] 3.6. Add error handling for session/login failure scenarios as mentioned in the blueprint (Phase 4.1).

   - [ ] **Phase 4 – Validation and Cleanup**  
     - [ ] 4.1. Run the full test suite created and enhanced in Phase 2 against the implemented tools.  
     - [ ] 4.2. Debug and refactor the tool implementations until all tests pass, ensuring logic is clean, correct, and robust against invalid inputs and queue errors.  
     - [ ] 4.3. Mark phase 2.5 in `team-think-mcp/docs/plan.md` as complete.
</PLAN>