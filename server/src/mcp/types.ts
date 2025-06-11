// MCP Protocol Types

export interface McpServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {};
  experimental?: Record<string, any>;
}

export interface McpServerInfo {
  name: string;
  version: string;
}

export interface McpClientInfo {
  name: string;
  version: string;
}

// Initialize Request/Response
export interface McpInitializeRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: "initialize";
  params: {
    protocolVersion: string;
    capabilities: {
      experimental?: Record<string, any>;
      sampling?: {};
    };
    clientInfo: McpClientInfo;
  };
}

export interface McpInitializeResponse {
  jsonrpc: "2.0";
  id: string | number;
  result: {
    protocolVersion: string;
    capabilities: McpServerCapabilities;
    serverInfo: McpServerInfo;
  };
}

// Initialized Notification
export interface McpInitializedNotification {
  jsonrpc: "2.0";
  method: "initialized";
  params?: {};
}

// Tool Definition
export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

// Tools List Request/Response
export interface McpToolsListRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: "tools/list";
  params?: {
    cursor?: string;
  };
}

export interface McpToolsListResponse {
  jsonrpc: "2.0";
  id: string | number;
  result: {
    tools: McpTool[];
    nextCursor?: string;
  };
}

// Tool Call Request/Response
export interface McpToolCallRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: "tools/call";
  params: {
    name: string;
    arguments?: Record<string, any>;
  };
}

export interface McpToolCallResponse {
  jsonrpc: "2.0";
  id: string | number;
  result: {
    content: Array<{
      type: "text";
      text: string;
    } | {
      type: "image";
      data: string;
      mimeType: string;
    }>;
    isError?: boolean;
  };
}

// Error Response
export interface McpErrorResponse {
  jsonrpc: "2.0";
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

// Union types for all MCP messages
export type McpRequest = McpInitializeRequest | McpToolsListRequest | McpToolCallRequest;
export type McpResponse = McpInitializeResponse | McpToolsListResponse | McpToolCallResponse | McpErrorResponse;
export type McpNotification = McpInitializedNotification;
export type McpMessage = McpRequest | McpResponse | McpNotification;