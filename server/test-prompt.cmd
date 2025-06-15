@echo off
REM Simple batch script to test the MCP tools

echo Testing Team Think MCP with Gemini...
echo.

REM Send MCP protocol messages to trigger the tool
(
echo {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0"}}}
echo {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"chat_gemini","arguments":{"prompt":"Hello Gemini! This is a test from Team Think MCP. Can you tell me a fun fact about WebSockets?"}}}
) | node dist\index.js

pause