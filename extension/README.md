# Team Think MCP Browser Extension

This is the browser extension component of the Team Think MCP project. It connects to the MCP server via WebSocket and allows automated prompting of Gemini AI Studio and ChatGPT.

## Features

- Connects to MCP server on port 55156
- Supports Gemini AI Studio and ChatGPT
- Automatic prompt injection and response extraction
- Token-based authentication
- No user interaction required (fully automated)

## Development Setup

### Prerequisites

1. Make sure the Team Think MCP server is running on port 55156
2. Obtain an authentication token for the MCP server
3. Chrome browser for testing

### Build the Extension

```bash
# From the extension directory
npm install
npm run build
```

This will create a `dist/` directory with the built extension files.

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" button
4. Select the `dist/` folder from this project
5. The extension should now appear in your extensions list

### Configure Authentication

1. Click on the extension options (or right-click the extension and select "Options")
2. Enter your MCP authentication token
3. Save the token
4. The extension will automatically try to connect to the MCP server

### Development Mode

For development with auto-rebuild:

```bash
npm run dev
```

This will watch for file changes and rebuild automatically. You'll need to reload the extension in Chrome after each rebuild.

## Architecture

- **Background Script**: Handles WebSocket connection to MCP server, tab management, and message routing
- **Content Scripts**: Inject into Gemini and ChatGPT pages to handle prompt injection and response extraction
- **Options Page**: Simple UI for configuring the authentication token

## File Structure

```
src/
├── background/
│   ├── index.ts              # Main background script entry point
│   ├── config.ts             # Configuration constants
│   ├── websocket-client.ts   # WebSocket connection to MCP server
│   ├── message-handler.ts    # Chrome runtime message handling
│   └── tab-manager.ts        # Tab creation and tracking
├── content-scripts/
│   ├── index.ts              # Content script entry point
│   └── chatbots/
│       ├── base-chatbot.ts   # Base interface for chatbots
│       ├── gemini.ts         # Gemini AI Studio integration
│       └── chatgpt.ts        # ChatGPT integration
├── options/
│   ├── options.html          # Options page UI
│   └── options.ts            # Options page logic
├── types/
│   └── messages.ts           # Internal message type definitions
└── manifest.json             # Extension manifest
```

## Testing

The extension can be tested by:

1. Configuring a valid auth token
2. Starting the MCP server
3. Triggering a chat request from Claude Code (which will use the MCP tools)
4. Observing that tabs open automatically and responses are captured

## Notes

- The extension requires active tabs to be created for each chat request
- Responses are automatically extracted when generation completes
- All communication with the MCP server uses WebSocket on port 55156
- The extension only supports Gemini AI Studio and ChatGPT (no other chatbots)