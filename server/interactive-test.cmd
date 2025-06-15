@echo off
echo ==========================================
echo Team Think MCP Interactive Test
echo ==========================================
echo.
echo This test will:
echo 1. Start a new MCP server instance
echo 2. Show you the auth token
echo 3. Wait for you to update the extension
echo 4. Send test prompts to AI services
echo.
echo Starting server...
echo.

REM Create a file with the test commands
echo {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0"}}} > test-commands.txt
echo {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"chat_gemini","arguments":{"prompt":"Hello Gemini! This is a test from Team Think MCP. Can you tell me a fun fact about WebSockets?"}}} >> test-commands.txt

REM Start the server with input piped, but keep it running
start "MCP Test Server" cmd /k "type test-commands.txt | node dist\index.js && pause"

echo.
echo ==========================================
echo IMPORTANT: A new window has opened with the MCP server
echo.
echo 1. Look for the AUTH TOKEN in that window
echo 2. Copy the token (select and press Enter)
echo 3. Go to Chrome extension options
echo 4. Paste the new token and click Save
echo 5. Wait for "Connected" status
echo 6. Come back here and press any key
echo ==========================================
echo.
pause

echo.
echo Great! The test should now be running.
echo.
echo Check your browser - a new Gemini tab should open!
echo The response will appear in the MCP Test Server window.
echo.
echo To test ChatGPT next, create another script or modify this one.
echo.
pause