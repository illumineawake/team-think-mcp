# Phased Testing Guide for Team Think MCP

## IMPORTANT: Implementation Status
This guide is divided into phases matching the actual implementation. Only test the phases that have been completed!

---

## Phase 3.1 Testing (✅ CURRENTLY IMPLEMENTED)

### What Works in Phase 3.1
- Browser extension loads without errors
- Options page for auth token configuration
- WebSocket connection to MCP server
- Authentication with security token

### What DOESN'T Work Yet
- ❌ Opening browser tabs
- ❌ Injecting prompts
- ❌ Capturing responses
- ❌ Full end-to-end flow

### How to Test Phase 3.1

1. **Build Everything**
   ```bash
   cd "/mnt/c/VS Code Projects/Code Web Chat/CodeWebChat/team-think-mcp"
   npm install
   npm run build
   ```

2. **Start the MCP Server**
   ```bash
   cd server
   npm run dev
   ```
   Copy the auth token that appears.

3. **Load the Extension**
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the `extension/dist` folder

4. **Configure the Extension**
   - Click on extension options
   - Paste the auth token
   - Click Save
   - Should show "✓ Connected"

### Expected Results for Phase 3.1
✅ Extension loads without errors  
✅ Options page saves token  
✅ Shows "Connected" status  
❌ No browser tabs will open (not implemented yet)  
❌ No prompts will be injected (not implemented yet)  

---

## Phase 3.2-3.5 Testing (🚧 NOT YET IMPLEMENTED)

### What Will Be Added
- Message handling for `send-prompt`
- Browser tab creation
- Message passing to content scripts

### How to Test (AFTER IMPLEMENTATION)
Follow the same steps as Phase 3.1, then:

1. **Check Service Worker Console**
   - Go to `chrome://extensions/`
   - Click "service worker" on the extension
   - Look for console messages like:
     - "[WebSocket] Received send-prompt"
     - "[TabManager] Creating tab for gemini"

2. **Run Test Client**
   ```bash
   cd server
   node better-test.js
   ```

### Expected Results
✅ Console shows "Received send-prompt" messages  
✅ New browser tabs open  
❌ Prompts NOT injected yet  
❌ Responses NOT captured yet  

---

## Phase 4 Testing (🚧 NOT YET IMPLEMENTED)

### What Will Be Added
- Login detection
- Prompt injection
- Response monitoring
- Full end-to-end flow

### How to Test (AFTER IMPLEMENTATION)
This is when the full manual-testing-guide.md will apply!

### Expected Results
✅ Everything from previous phases  
✅ Prompts appear in AI chats  
✅ Responses captured and returned  
✅ Full end-to-end flow works  

---

## Current Testing Status (As of Phase 3.1)

### ✅ What You CAN Test Now
1. Extension installation
2. Auth token configuration
3. Connection status
4. Server startup and token generation

### ❌ What You CANNOT Test Yet
1. Sending prompts to AI services
2. Browser tab automation
3. Response capture
4. End-to-end flow

### If Things Don't Work
- **"No browser tabs open"** - This is EXPECTED until Phase 3.2-3.5
- **"Nothing happens when I send a prompt"** - This is EXPECTED until Phase 4
- **"Extension not connecting"** - This is a real issue, check:
  - Server is running
  - Token is correct
  - Using `localhost` not `127.0.0.1`

---

## When to Use Which Guide

1. **Use THIS guide (phased-testing-guide.md)** while implementation is in progress
2. **Use manual-testing-guide.md** only after ALL phases are complete
3. **Check implementation status** in `/docs/plan.md` to see what's done

## Quick Implementation Check
Run this to see what's implemented:
```bash
cat /mnt/c/VS\ Code\ Projects/Code\ Web\ Chat/CodeWebChat/team-think-mcp/docs/plan.md | grep -E "^\s*- \[[xX]\]"
```

Phases with [x] are implemented and can be tested.