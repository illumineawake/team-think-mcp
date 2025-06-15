# Complete Manual Testing Guide for Team Think MCP Browser Extension

⚠️ **IMPORTANT**: This guide is for testing the COMPLETE implementation (all phases). 
If you're testing during development, use `phased-testing-guide.md` instead!

**Current Status**: Only Phase 3.1 is implemented. Most features in this guide won't work yet.

This guide assumes you have never tested a browser extension before and provides step-by-step instructions with exact commands to type and buttons to click.

## Prerequisites Check

Before starting, make sure you have:
1. Google Chrome browser installed
2. Access to the terminal/command prompt
3. The Team Think MCP project folder

## Part 1: Building the Extension

### Step 1: Open Terminal
1. **On Windows**: Press `Win + R`, type `cmd` and press Enter
2. **On Mac**: Press `Cmd + Space`, type `terminal` and press Enter
3. **On Linux**: Press `Ctrl + Alt + T`

### Step 2: Navigate to Extension Folder
Type this command exactly (adjust the path if your project is elsewhere):
```bash
cd "/mnt/c/VS Code Projects/Code Web Chat/CodeWebChat/team-think-mcp"
```
Press Enter.

### Step 3: Build Everything
Type these commands one by one, pressing Enter after each:
```bash
npm install
npm run build
```

You should see output showing webpack building files. If you see any red error messages, stop and ask for help.

### Step 4: Verify Build Success
Type:
```bash
ls extension/dist
```

You should see files like:
- manifest.json
- background.js
- content-scripts.js
- options.html
- options.js

If you don't see these files, the build failed.

## Part 2: Starting the MCP Server

### Step 5: Start the Server (New Terminal)
1. Open a NEW terminal window (keep the first one open)
2. Navigate to the project again:
```bash
cd "/mnt/c/VS Code Projects/Code Web Chat/CodeWebChat/team-think-mcp"
```

3. Start the server:
```bash
cd server
npm run dev
```

### Step 6: Copy the Auth Token
When the server starts, you'll see something like:
```
🔐 Authentication token: abc123-def456-ghi789
```

**IMPORTANT**: Copy this entire token (select it and press Ctrl+C or Cmd+C). You'll need it soon.

Keep this terminal window open - the server needs to keep running.

## Part 3: Loading the Extension in Chrome

### Step 7: Open Chrome Extension Manager
1. Open Google Chrome
2. Click the three dots menu (⋮) in the top right
3. Hover over "More tools"
4. Click "Extensions"

OR just type this in the address bar:
```
chrome://extensions/
```

### Step 8: Enable Developer Mode
1. Look at the top right of the Extensions page
2. Find the "Developer mode" toggle switch
3. Click it so it turns blue/on

### Step 9: Load the Extension
1. Click the "Load unpacked" button (appears after enabling Developer mode)
2. Navigate to your extension's dist folder:
   - Browse to your project folder
   - Open `team-think-mcp`
   - Open `extension`
   - Select the `dist` folder
   - Click "Select Folder" or "Open"

### Step 10: Verify Extension Loaded
You should see "Team Think MCP Extension" appear in your extensions list. If you see any errors in red, stop and ask for help. But if you see a red error button and the only thing it says is "authentication token not configured" then carry on to step 11.

## Part 4: Configuring the Extension

### Step 11: Open Extension Options
1. Find "Team Think MCP Extension" in your extensions list
2. Click "Details"
3. Scroll down and click "Extension options"

OR:
1. Click the puzzle piece icon in Chrome toolbar
2. Find "Team Think MCP Extension"
3. Click the three dots next to it
4. Click "Options"

### Step 12: Enter the Auth Token
1. In the options page that opens, you'll see an input field labeled "Auth Token"
2. Paste the token you copied in Step 6 (Ctrl+V or Cmd+V)
3. Click "Save"
4. You should see "✓ Connected" appear in green

If you see "✗ Disconnected" in red:
- Make sure the server is still running (check the terminal from Step 5)
- Make sure you copied the token correctly
- Try clicking Save again

## Part 5: Testing Basic Connection

### Step 13: Check Developer Tools (Optional but Helpful)
1. On the Extensions page (chrome://extensions/)
2. Find "Team Think MCP Extension"
3. Click "background page" under "Inspect views"
4. This opens Developer Tools for the extension
5. Click the "Console" tab
6. You should see messages like "WebSocket connected"

## Part 6: Testing with Gemini AI Studio

### Step 14: Prepare Gemini AI Studio
1. Open a new tab
2. Go to: https://aistudio.google.com
3. Sign in with your Google account if needed
4. Make sure you can see the chat interface

### Step 15: Test Gemini from MCP Server
1. Go back to your first terminal (from Step 2)
2. Open a new terminal tab (usually Ctrl+Shift+T or Cmd+T)
3. Run the test client:
```bash
cd "/mnt/c/VS Code Projects/Code Web Chat/CodeWebChat/team-think-mcp/server"
npm run test:auth YOUR_AUTH_TOKEN_HERE
```
Replace `YOUR_AUTH_TOKEN_HERE` with the token from Step 6.

### Step 16: Send a Test Prompt to Gemini
In the test client, you'll see a prompt. Type:
```
gemini Hello, can you see this message?
```
Press Enter.

### Step 17: Watch What Happens
1. A new tab should open with Gemini AI Studio
2. You should see the prompt "Hello, can you see this message?" being typed automatically
3. Wait for Gemini to respond
4. The response should appear in your terminal
5. The browser tab should close automatically

## Part 7: Testing with ChatGPT

### Step 18: Prepare ChatGPT
1. Open a new tab
2. Go to: https://chatgpt.com
3. Sign in if needed
4. Make sure you can see the chat interface

### Step 19: Test ChatGPT from Test Client
In the same test client terminal, type:
```
chatgpt Hello from Team Think MCP!
```
Press Enter.

### Step 20: Watch What Happens
1. A new tab should open with ChatGPT
2. The prompt should be typed automatically
3. Wait for the response
4. The response should appear in your terminal

## Part 8: Testing Error Scenarios

### Step 21: Test Without Login
1. Open an incognito window (Ctrl+Shift+N or Cmd+Shift+N)
2. Try the test again - it should report "LOGIN_REQUIRED" error

### Step 22: Test Disconnection
1. Stop the server (press Ctrl+C in the server terminal)
2. Try sending a prompt - it should fail gracefully
3. Start the server again (`npm run dev`)
4. The extension should reconnect automatically

## Troubleshooting Common Issues

### "WebSocket connection failed"
- Make sure server is running
- Check the auth token is correct
- Try refreshing the options page

### "No response from chatbot"
- Make sure you're logged into the AI service
- Check if the page fully loaded
- Try manually refreshing the AI chat page

### "Extension not working"
1. Go to chrome://extensions/
2. Find Team Think MCP Extension
3. Click the refresh icon (🔄)
4. Try again

### "Can't see console messages"
1. Right-click the extension icon
2. Click "Inspect popup" (if available)
3. Or go to chrome://extensions/ and click "background page"

## Success Checklist

✅ Extension loads without errors
✅ Options page saves auth token
✅ Shows "Connected" status
✅ Opens Gemini tab when prompted
✅ Automatically types prompt
✅ Captures and returns response
✅ Opens ChatGPT tab when prompted
✅ Handles not-logged-in scenario

## What to Report

If something doesn't work, note:
1. Which step failed
2. Any error messages you see
3. What happened vs what should have happened
4. Screenshots if possible

## Cleanup

When done testing:
1. Stop the server (Ctrl+C in server terminal)
2. Remove the extension:
   - Go to chrome://extensions/
   - Find Team Think MCP Extension
   - Click "Remove"
   - Confirm removal