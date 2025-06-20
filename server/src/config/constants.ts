/**
 * Configuration constants for Team Think MCP Server
 */

// WebSocket Server Configuration
export const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT ? parseInt(process.env.WEBSOCKET_PORT) : 55156;
export const WEBSOCKET_HOST = process.env.WEBSOCKET_HOST || 'localhost';

// Connection Limits and Timeouts
export const MAX_CONCURRENT_CONNECTIONS = process.env.MAX_CONCURRENT_CONNECTIONS ? parseInt(process.env.MAX_CONCURRENT_CONNECTIONS) : 10;
export const CONNECTION_TIMEOUT_MS = process.env.CONNECTION_TIMEOUT_MS ? parseInt(process.env.CONNECTION_TIMEOUT_MS) : 30000; // 30 seconds
export const HEARTBEAT_INTERVAL_MS = process.env.HEARTBEAT_INTERVAL_MS ? parseInt(process.env.HEARTBEAT_INTERVAL_MS) : 30000; // 30 seconds

// Request Queue Configuration (for Phase 2.4)
export const MAX_PARALLEL_PER_SERVICE = process.env.MAX_PARALLEL_PER_SERVICE ? parseInt(process.env.MAX_PARALLEL_PER_SERVICE) : 1;
export const REQUEST_TTL_MS = process.env.REQUEST_TTL_MS ? parseInt(process.env.REQUEST_TTL_MS) : 300000; // 5 minutes

// Completed request retention
export const COMPLETED_REQUEST_RETENTION_MS = process.env.COMPLETED_REQUEST_RETENTION_MS ? parseInt(process.env.COMPLETED_REQUEST_RETENTION_MS) : 15 * 60 * 1000; // 15 minutes
export const CLEANUP_INTERVAL_MS = process.env.CLEANUP_INTERVAL_MS ? parseInt(process.env.CLEANUP_INTERVAL_MS) : 5 * 60 * 1000; // Run cleanup every 5 minutes

// Authentication Configuration (Phase 2.3)
export const AUTH_TIMEOUT_MS = process.env.AUTH_TIMEOUT_MS ? parseInt(process.env.AUTH_TIMEOUT_MS) : 5000; // 5 seconds to authenticate
export const TOKEN_LENGTH = process.env.TOKEN_LENGTH ? parseInt(process.env.TOKEN_LENGTH) : 32; // Length of security token

// Logging Configuration
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const DEBUG_MODE = process.env.DEBUG === '1' || process.env.DEBUG === 'true';

// Server Information
export const SERVER_NAME = 'team-think-mcp';
export const SERVER_VERSION = '0.1.0';
export const MCP_PROTOCOL_VERSION = '2024-11-05';