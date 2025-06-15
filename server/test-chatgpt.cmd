@echo off
REM Simple batch script to test ChatGPT

echo Testing Team Think MCP with ChatGPT...
echo.

REM Send MCP protocol messages to trigger the tool
(
echo {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0"}}}
echo {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"chat_chatgpt","arguments":{"prompt":"Hello ChatGPT! This is a test from Team Think MCP. What's your favorite thing about helping people with code?"}}}
) | node dist\index.js

pause