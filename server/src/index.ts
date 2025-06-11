#!/usr/bin/env node

import { McpServer } from './mcp/server';
import { ToolRegistry } from './tools/registry';
import { logger, LogLevel } from './utils/logger';

// Set debug level if requested
if (process.env.DEBUG) {
  logger.setLevel(LogLevel.DEBUG);
}

logger.info('Team Think MCP Server started');

// Create tool registry and MCP server
const toolRegistry = new ToolRegistry();
const server = new McpServer(toolRegistry);

// Graceful shutdown handling
let isShuttingDown = false;

const shutdown = (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
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

// Start the server
try {
  server.start();
  logger.info('MCP server is ready to accept connections');
} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}