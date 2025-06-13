<PLAN version="1.1">
1. **Background:**  
   The project is to implement a robust request queue manager for the "Team Think MCP" server, as specified in Phase 2.4 of the project plan. This component is critical for managing prompts sent to AI services. A previous attempt to implement this failed, primarily because of a broken testing environment that prevented proper validation of the code's functionality. This plan aims to correct the course by first establishing a reliable test setup and then guiding a test-driven re-implementation of the queue manager.

2. **Problem Statement:**  
   The existing `QueueManager` implementation is considered non-functional and untrustworthy, despite being marked as complete. The underlying Jest test suite is broken due to version incompatibilities and module-resolution errors, making automated verification impossible. This led the previous implementation process to rely on unreliable "manual testing". To succeed, the testing framework must be fixed before re-implementing the queue manager with comprehensive, passing unit tests.

3. **Goals:**  
   • Establish a functional and stable Jest test environment for the `server` package.  
   • Re-implement a robust and testable `QueueManager` that correctly handles request queueing, concurrency, timeouts, and cancellation.  
   • Develop a comprehensive suite of passing unit tests that validate all features of the `QueueManager`.  
   • Ensure the new `QueueManager` is correctly integrated with the existing WebSocket server and shutdown logic.  
   • Produce a final implementation that is reliable, maintainable, and thoroughly verified.

4. **Proposed Steps:**  
   - [x] **Phase 1 – Fix the Testing Environment**  
       - [x] **Step 1.1: Correct Jest Dependencies.** Update `server/package.json` to resolve version conflicts. This involves a deliberate downgrade of `jest` to `^29.7.0` and `ts-jest` to `^29.2.5` to ensure they are compatible and restore a working test environment.  
         ```json
         // team-think-mcp/server/package.json
         "devDependencies": {
           "@types/jest": "^29.5.14",
           "@types/node": "^18.0.0",
           "@types/ws": "^8.0.0",
           "jest": "^29.7.0",
           "ts-jest": "^29.2.5",
           "ts-node": "^10.0.0",
           "tsx": "^4.0.0",
           "typescript": "^5.0.0"
         }
         ```
       - [x] **Step 1.2: Configure Jest for Monorepo.** Update `server/jest.config.js` to correctly resolve the `@team-think-mcp/shared` workspace package. The `moduleNameMapper` should point to the TypeScript source files to avoid requiring a pre-build step for tests.  
         ```javascript
         // team-think-mcp/server/jest.config.js
         module.exports = {
           preset: 'ts-jest',
           testEnvironment: 'node',
           roots: ['<rootDir>/src'],
           testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
           transform: {
             '^.+\\.ts$': ['ts-jest', {
               tsconfig: 'tsconfig.json'
             }]
           },
           collectCoverageFrom: [
             'src/**/*.ts',
             '!src/**/*.test.ts',
             '!src/**/*.spec.ts',
             '!src/dev.ts',
             '!src/index.ts',
           ],
           moduleNameMapper: {
             // Point to the TypeScript source of the shared package to avoid a pre-build step
             '^@team-think-mcp/shared$': '<rootDir>/../shared/src/index.ts'
           },
           testTimeout: 10000
         };
         ```
   - [x] **Phase 2 – Refactor Code for Testability**  
       - [x] **Step 2.1: Implement Lazy Singleton Pattern.** Refactor `server/src/queue/index.ts` to use a lazy-initialized singleton via a `getQueueManager` function. This prevents the `QueueManager` from being instantiated on module import, which improves test isolation.  
         ```typescript
         // team-think-mcp/server/src/queue/index.ts
         import { QueueManager } from './queue-manager';
         export { QueueManager } from './queue-manager';
         export type { QueuedRequest, QueueStats, QueueManagerConfig } from './types';
         
         let _queueManager: QueueManager | null = null;
         
         export function getQueueManager(): QueueManager {
           if (!_queueManager) {
             _queueManager = new QueueManager();
           }
           return _queueManager;
         }
         ```
       - [x] **Step 2.2: Update Singleton Usage in WebSocket Server.** Update `server/src/websocket/websocket-server.ts` to use the new `getQueueManager()` function instead of the direct `queueManager` import.
       - [x] **Step 2.3: Perform Global Singleton Update.** Search the entire `@team-think-mcp/server` workspace for any other imports of the eager `queueManager` singleton. Replace all occurrences with the `getQueueManager()` function to ensure a single instance is used throughout the application.

   - [x] **Phase 3 – Re-implement QueueManager with TDD**  
       - [x] **Step 3.1: Define Types and Interfaces.** In `server/src/queue/types.ts`, define the `QueuedRequest`, `QueueStats`, and `QueueManagerConfig` interfaces to model the queue's data structures and configuration.
       - [x] **Step 3.2: Implement Core Logic and Race Condition Guard.** In `server/src/queue/queue-manager.ts`, implement the `addRequest`, `resolveRequest`, and `rejectRequest` methods. Ensure `resolveRequest` and `rejectRequest` check the request's status (e.g., `if (request.status !== 'active')`) before proceeding to prevent race conditions where a timed-out request is settled by a late response.
       - [x] **Step 3.3: Implement Resource Cleanup.** In the settlement logic (`resolveRequest`, `rejectRequest`, and the timeout handler), ensure the request is explicitly removed from `activeRequests` and the `activeCountPerService` is decremented. This prevents memory leaks in the long-running server process.
       - [x] **Step 3.4: Implement Concurrency, Timeout, and Cancellation.** Implement the `processNextInQueue` logic to respect `MAX_PARALLEL_PER_SERVICE`. Implement the request timeout mechanism using `REQUEST_TTL_MS`. Implement `cancelRequest` and `cancelAllRequests` for graceful shutdown and manual control.
       - [x] **Step 3.5: Develop Comprehensive Unit Tests.** Create a new `server/src/queue/queue-manager.test.ts` file. Write a full suite of unit tests covering:
           - [x] Basic request queueing and resolution.
           - [x] Concurrency limits.
           - [x] Timeout behavior.
           - [x] Correct rejection of requests.
           - [x] Cancellation of pending and active requests.
           - [x] **Race condition guard:** A specific test where `resolveRequest` is called on a request that has already timed out, asserting that the final status remains 'timeout'.
           - [x] **Memory leak prevention:** A test to verify that `getQueueStats()` shows zero active requests after they are settled.

   - [ ] **Phase 4 – Update Documentation**  
       - [ ] **Step 4.1: Update Implementation Plan.** Once the `QueueManager` is re-implemented and fully tested, replace the content of `team-think-mcp/docs/multi-agent-todo.md` with a new, robust plan that reflects the TDD approach and completed work.  
         ```markdown
         // team-think-mcp/docs/multi-agent-todo.md
         # Multi-Agent Todo: Implement and Test Request Queue Manager (Phase 2.4)
         
         ## CONTEXT
         The previous attempt to implement this phase failed because the testing environment was broken. This plan has rectified that by fixing the test setup first, then guiding a test-driven re-implementation of the queue manager. The `QueueManager` is now considered complete, tested, and robust.
         
         ## PREREQUISITES
         - [X] The testing environment is fixed (Phase 1 of the main plan).
         - [X] The `QueueManager` has been refactored for testability and re-implemented with full test coverage (Phase 2 & 3 of the main plan).
         - [ ] Read `@team-think-mcp/docs/BLUEPRINT.md` to understand the architecture.
         - [ ] Read `@team-think-mcp/docs/plan.md`, specifically phase 2.4 requirements.
         - [ ] Read `@team-think-mcp/server/src/queue/queue-manager.ts` to understand the new implementation.
         
         ## IMPLEMENTATION AND TESTING TASKS
         All implementation tasks for the `QueueManager` are complete. The next phase of the project can now proceed.
         ```
</PLAN>
````