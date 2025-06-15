@echo off
echo Sending test to Gemini...
echo Watch your browser - a new tab should open!
echo.

(
echo {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0"}}}
echo {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"chat_gemini","arguments":{"prompt":"Hello Gemini! This is a test from Team Think MCP. The current time is %TIME%. Can you tell me a fun fact about WebSockets?"}}}
) | node dist\index.js

echo.
echo If you saw a new Gemini tab open, the test worked!
pause