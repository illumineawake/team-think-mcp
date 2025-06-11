#!/usr/bin/env node

import { McpServer } from './mcp/server';
import { ToolRegistry } from './tools/registry';
import { logger, LogLevel } from './utils/logger';
import { getWebSocketServer } from './websocket';
import { WEBSOCKET_PORT } from './config/constants';

// Set debug level if requested
if (process.env.DEBUG) {
  logger.setLevel(LogLevel.DEBUG);
}

logger.info('Team Think MCP Server started');

// Create tool registry and MCP server
const toolRegistry = new ToolRegistry();
const server = new McpServer(toolRegistry);

// Create WebSocket server
const wsServer = getWebSocketServer(WEBSOCKET_PORT);

// Graceful shutdown handling
let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    // Stop WebSocket server first
    await wsServer.stop();
    
    // Stop MCP server
    server.close();
    toolRegistry.clear();
    
    logger.info('Server shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection:', { reason, promise });
  shutdown('unhandledRejection');
});

// Start the servers
async function startServers() {
  try {
    // Start MCP server first
    server.start();
    logger.info('MCP server is ready to accept connections');
    
    // Start WebSocket server
    await wsServer.start();
    logger.info('All servers started successfully');
  } catch (error) {
    logger.error('Failed to start servers:', error);
    process.exit(1);
  }
}

startServers();