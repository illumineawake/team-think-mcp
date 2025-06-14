// Base message interface with versioning
export interface BaseWebSocketMessage {
  schema: '1.0';
  timestamp: number;
}

// Keep legacy alias for backward compatibility
interface BaseMessage extends BaseWebSocketMessage {}

// MCP Server → Extension
export interface SendPromptMessage extends BaseMessage {
  action: 'send-prompt';
  requestId: string;
  chatbot: 'gemini' | 'chatgpt';
  prompt: string;
  options?: {
    temperature?: number;
    model?: string;
  };
}

// Extension → MCP Server  
export interface ChatResponseMessage extends BaseMessage {
  action: 'chat-response';
  requestId: string;
  response: string;
  error?: string;
  errorCode?: 'SESSION_EXPIRED' | 'LOGIN_REQUIRED' | 'AUTHENTICATION_FAILED' | 'NETWORK_ERROR' | 'UNKNOWN';
}

// Extension → MCP Server (Authentication)
export interface AuthenticationMessage extends BaseWebSocketMessage {
  action: 'authenticate';
  token: string;
}

// Union type for all messages
export type WebSocketMessage = SendPromptMessage | ChatResponseMessage | AuthenticationMessage;

/**
 * Type guard to check if a message is an AuthenticationMessage
 */
export function isAuthenticationMessage(msg: WebSocketMessage): msg is AuthenticationMessage {
  return msg.action === 'authenticate';
}