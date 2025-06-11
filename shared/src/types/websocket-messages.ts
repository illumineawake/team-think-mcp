// Base message interface with versioning
interface BaseMessage {
  schema: '1.0';
  timestamp: number;
}

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
}

// Union type for all messages
export type WebSocketMessage = SendPromptMessage | ChatResponseMessage;