# Manual Testing Guide for Team Think MCP Server

This guide explains how to manually test the Team Think MCP Server to verify it's working correctly.

## Prerequisites

Before testing, ensure you have:

- **Node.js**: Version 18 or higher
- **npm**: Installed with Node.js
- **Terminal/Command Line**: Access to run commands

## Setup Instructions

### 1. Install Dependencies

From the project root directory:

```bash
cd "/path/to/team-think-mcp"
npm install
```

### 2. Build the Server

Build the shared package first, then the server:

```bash
# Build shared types package
npm run build:shared

# Build the MCP server
cd server
npm run build
```

You should see no TypeScript errors. The compiled JavaScript files will be in `server/dist/`.

## Manual Testing Methods

### Method 1: Using the Built-in Test Client (Recommended)

The easiest way to test the server is using the included test client:

```bash
cd server
npm run test
```

**Expected Output:**
```
🚀 Starting MCP Server development tests...

Server log: 2025-06-11T14:20:33.142Z [INFO] [TeamThinkMCP] Team Think MCP Server started
Server log: 2025-06-11T14:20:33.146Z [INFO] [TeamThinkMCP] Starting MCP server...
Server log: 2025-06-11T14:20:33.146Z [INFO] [TeamThinkMCP] MCP server is ready to accept connections

📤 Testing: Initialize Request
✅ Initialize Request - Response validation passed
📤 Testing: Initialized Notification
✅ Initialized Notification - Notification sent
📤 Testing: Tools List Request
✅ Tools List Request - Response validation passed
📤 Testing: Invalid Method Request
✅ Invalid Method Request - Response validation passed

🛑 Stopping server...

✅ All tests completed successfully!
```

### Method 2: Manual Command Line Testing

For more detailed testing, you can manually send JSON-RPC messages to the server.

#### Step 1: Start the Server

In one terminal window:

```bash
cd server
npm run start
```

**Expected Output:**
```
2025-06-11T14:20:33.142Z [INFO] [TeamThinkMCP] Team Think MCP Server started
2025-06-11T14:20:33.146Z [INFO] [TeamThinkMCP] Starting MCP server...
2025-06-11T14:20:33.146Z [INFO] [TeamThinkMCP] MCP server is ready to accept connections
```

The server is now listening for JSON-RPC messages on stdin.

#### Step 2: Send Test Messages

**Important**: All messages must be valid JSON on a single line, followed by Enter.

##### Test 1: Initialize Request

Type this exactly (all on one line):

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}
```

**Expected Response:**
```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"team-think-mcp","version":"0.1.0"}}}
```

**Log Output:**
```
2025-06-11T14:20:57.765Z [INFO] [TeamThinkMCP] Handling initialize request from client: - test-client
```

##### Test 2: Initialized Notification

```json
{"jsonrpc":"2.0","method":"initialized","params":{}}
```

**Expected Response:** No JSON response (notifications don't get responses)

**Log Output:**
```
2025-06-11T14:20:57.766Z [INFO] [TeamThinkMCP] Received initialized notification, handshake complete
```

##### Test 3: Tools List Request

```json
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
```

**Expected Response:**
```json
{"jsonrpc":"2.0","id":2,"result":{"tools":[]}}
```

##### Test 4: Invalid Method (Error Handling Test)

```json
{"jsonrpc":"2.0","id":3,"method":"invalid/method","params":{}}
```

**Expected Response:**
```json
{"jsonrpc":"2.0","id":3,"error":{"code":-32601,"message":"Method not found","data":"Unknown method: invalid/method"}}
```

##### Test 5: Malformed JSON (Error Handling Test)

```
{invalid json}
```

**Expected Response:** No response (cannot parse request ID)

**Log Output:**
```
2025-06-11T14:20:57.766Z [ERROR] [TeamThinkMCP] Error parsing JSON-RPC message: [SyntaxError details]
```

#### Step 3: Stop the Server

Press `Ctrl+C` to gracefully shutdown the server.

**Expected Output:**
```
2025-06-11T14:20:35.946Z [INFO] [TeamThinkMCP] Received SIGINT, shutting down gracefully...
2025-06-11T14:20:35.946Z [INFO] [TeamThinkMCP] Server shutdown complete
```

### Method 3: Using Echo and Pipes (Quick Test)

For a quick verification that the server responds to initialize:

```bash
cd server
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | npm run start
```

You should see the initialize response immediately.

## Understanding the Output

### JSON-RPC Responses

All responses follow the JSON-RPC 2.0 specification:

- **Success Response**: Contains `"result"` field
- **Error Response**: Contains `"error"` field with `code`, `message`, and optional `data`
- **Notifications**: No response expected

### Log Messages

- **INFO**: Normal operation messages
- **ERROR**: Error conditions
- **WARN**: Warning conditions
- All logs go to stderr (not stdout) to avoid interfering with JSON-RPC communication

### Server Status Indicators

1. **"Team Think MCP Server started"** - Server process initialized
2. **"Starting MCP server..."** - Protocol handler starting
3. **"MCP server is ready to accept connections"** - Ready for JSON-RPC messages
4. **"Handling initialize request from client"** - Successfully processing MCP handshake

## Troubleshooting

### Common Issues

#### Server Won't Start

**Problem**: `npm run start` fails with module errors
**Solution**: 
1. Run `npm install` in the project root
2. Run `npm run build:shared` 
3. Run `npm run build` in the server directory

#### No Response to Messages

**Problem**: Server receives message but doesn't respond
**Solution**:
1. Ensure JSON is valid and on a single line
2. Check that the message includes required fields (`jsonrpc`, `id`, `method`)
3. Verify you pressed Enter after typing the message

#### Build Errors

**Problem**: TypeScript compilation fails
**Solution**:
1. Check Node.js version (requires 18+)
2. Ensure all dependencies are installed
3. Verify tsconfig.json files are not corrupted

#### Invalid JSON Error

**Problem**: "Error parsing JSON-RPC message"
**Solution**:
1. Validate JSON syntax using a JSON validator
2. Ensure the entire message is on one line
3. Check for trailing commas or extra characters

### Debug Mode

Enable detailed logging by setting the DEBUG environment variable:

```bash
cd server
DEBUG=1 npm run start
```

This will show more detailed log messages to help diagnose issues.

## Success Criteria Checklist

Use this checklist to verify the server is working correctly:

- [ ] Server starts without errors
- [ ] Logs "Team Think MCP Server started"
- [ ] Logs "MCP server is ready to accept connections"  
- [ ] Responds to initialize request with correct protocol version
- [ ] Handles initialized notification without errors
- [ ] Returns empty tools list for tools/list request
- [ ] Returns error response for invalid methods
- [ ] Handles malformed JSON gracefully
- [ ] Shuts down gracefully with Ctrl+C
- [ ] All logs go to stderr (not mixed with JSON responses)

## Next Steps

Once manual testing confirms the server works correctly, you can:

1. **Integrate with MCP Client**: Connect the server to Claude Code or another MCP-compatible client
2. **Add Tools**: Implement the `chat_gemini` and `chat_chatgpt` tools
3. **Add WebSocket Server**: Enable browser extension communication

## Support

If you encounter issues not covered in this guide:

1. Check the error logs for specific error messages
2. Verify all prerequisites are met
3. Ensure you're following the exact steps in this guide
4. Try the automated test client first (`npm run test`) before manual testing