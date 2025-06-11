# Multi-Agent Todo: Phase 2.3 - Security Handshake Implementation

## Overview
Implement a hardened security handshake where the server generates an ephemeral security token on startup, logs it to the console for the user to configure in the extension, and rejects connections without this token.

## Prerequisites
- [X] Read @team-think-mcp/docs/BLUEPRINT.md to understand the security requirements (specifically section "Security Considerations")
- [X] Read @team-think-mcp/server/src/websocket/websocket-server.ts to understand current WebSocket implementation
- [X] Read @team-think-mcp/shared/src/types/websocket-messages.ts to understand message types

## Implementation Steps

### Step 1: Create Security Utilities
- [X] Create a new file: `/team-think-mcp/server/src/utils/security.ts`
- [X] Implement `generateSecurityToken()` function that:
  - Uses Node.js crypto module
  - Generates a 32-character alphanumeric token
  - Returns the token as a string
- [X] Implement `validateToken(providedToken: string, serverToken: string)` function that:
  - Performs constant-time comparison to prevent timing attacks
  - Returns boolean indicating if tokens match

### Step 2: Update WebSocket Message Types
- [X] Read @team-think-mcp/shared/src/types/websocket-messages.ts
- [X] Add a new authentication message type:
  ```typescript
  export interface AuthenticationMessage extends BaseWebSocketMessage {
    action: 'authenticate';
    token: string;
  }
  ```
- [X] Update the `WebSocketMessage` union type to include `AuthenticationMessage`
- [X] Add type guard function `isAuthenticationMessage()`

### Step 3: Update WebSocketServerManager
- [X] Read @team-think-mcp/server/src/websocket/websocket-server.ts
- [X] Add private property `securityToken: string | null = null`
- [X] In the `start()` method:
  - Generate security token using the utility function
  - Store it in the `securityToken` property
  - Log the token with clear formatting:
    ```
    ========================================
    SECURITY TOKEN FOR BROWSER EXTENSION:
    ${token}
    ========================================
    Configure this token in the extension settings
    ```
- [X] Update `ClientInfo` interface to include `isAuthenticated: boolean` property

### Step 4: Implement Authentication Flow
- [X] In `handleConnection()` method:
  - Set initial `isAuthenticated: false` for new clients
  - Set a 5-second authentication timeout using `setTimeout`
  - If client doesn't authenticate within timeout, close connection with code 1008 (Policy Violation)
- [X] In `handleMessage()` method:
  - Check if message is authentication message before processing other messages
  - If client is not authenticated and message is not authentication, reject and close connection
  - If authentication message received:
    - Validate token using security utility
    - If valid: set `isAuthenticated: true`, clear timeout, log success
    - If invalid: close connection with code 1008 and error message
- [X] Update `broadcastMessage()` and `sendToClient()` to only send to authenticated clients

### Step 5: Add Configuration Constants
- [X] Read @team-think-mcp/server/src/config/constants.ts
- [X] Add new constants:
  ```typescript
  export const AUTH_TIMEOUT_MS = 5000; // 5 seconds to authenticate
  export const TOKEN_LENGTH = 32; // Length of security token
  ```

### Step 6: Create Test Client
- [X] Create a new test file: `/team-think-mcp/server/src/websocket/test-auth-client.ts`
- [X] Implement a test client that:
  - Connects to the WebSocket server
  - Sends an authentication message with a token (passed as command line argument)
  - Logs the result (success/failure)
  - Can be used to test both valid and invalid tokens
- [X] Add npm script in server package.json: `"test:auth": "tsx src/websocket/test-auth-client.ts"`

### Step 7: Update Existing Test Client
- [X] Read @team-think-mcp/server/src/websocket/test-client.ts
- [X] Update it to include authentication flow:
  - Accept token as command line argument
  - Send authentication message immediately after connection
  - Only proceed with other operations after successful authentication

### Step 8: Documentation
- [X] Update `/team-think-mcp/server/README.md` (create if doesn't exist) with:
  - Security token explanation
  - How to find the token in server logs
  - How to configure it in the extension
  - Example of the authentication flow

## Testing Checklist
- [X] Server generates unique token on each startup
- [X] Token is clearly displayed in console logs
- [X] Connections without authentication are rejected after 5 seconds
- [X] Connections with invalid tokens are rejected immediately
- [X] Valid tokens allow normal WebSocket communication
- [X] Multiple clients can connect with the same valid token
- [X] Server continues to work normally after rejecting invalid connections

## Notes for Implementers
- The security token should be generated using cryptographically secure methods
- Token validation must use constant-time comparison to prevent timing attacks
- Clear error messages should be logged for debugging but not sent to untrusted clients
- The 5-second authentication window prevents hanging connections
- Consider the UX - the token display should be very clear and easy to copy