import { BaseChatTool } from './base-chat-tool';
import { QueueManager } from '../queue';
import { JSONSchemaType } from 'ajv';

interface ChatGptArgs {
  prompt: string;
}

export class ChatGptTool extends BaseChatTool {
  public readonly name = 'chat_chatgpt';
  public readonly description = 'Send a prompt to OpenAI ChatGPT and get a response';
  
  public readonly inputSchema = {
    type: 'object' as const,
    properties: {
      prompt: {
        type: 'string',
        description: 'The prompt to send to ChatGPT'
      }
    },
    required: ['prompt'],
    additionalProperties: false
  };

  constructor(queueManager: QueueManager) {
    const schema = {
      type: 'object' as const,
      properties: {
        prompt: { type: 'string' as const }
      },
      required: ['prompt'] as const,
      additionalProperties: false
    };

    super(queueManager, 'chat_chatgpt', schema as any);
  }
}