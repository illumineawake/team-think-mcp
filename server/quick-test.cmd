@echo off
echo.
echo ===================================
echo Team Think MCP Quick Test
echo ===================================
echo.
echo This test will:
echo 1. Start the MCP server
echo 2. Wait for browser extension to connect
echo 3. Send a test prompt to Gemini
echo.
echo IMPORTANT: Your browser extension will need to update its token!
echo The new token will be displayed when the server starts.
echo.
pause

REM Start server and send test after a delay
echo Starting server and test client...
start "MCP Server" cmd /c "npm run dev"

echo.
echo Waiting 5 seconds for server to start...
timeout /t 5 /nobreak > nul

echo.
echo Now:
echo 1. Look at the MCP Server window for the auth token
echo 2. Update your extension options with the new token
echo 3. Wait for "Connected" status in extension
echo 4. Press any key here to send the test prompt
echo.
pause

REM Send test message
(
echo {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0"}}}
timeout /t 1 /nobreak > nul
echo {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"chat_gemini","arguments":{"prompt":"Hello Gemini! This is a test from Team Think MCP. Can you see this message?"}}}
) | node dist\index.js

echo.
echo Test sent! Check your browser for the new tab.
echo.
pause