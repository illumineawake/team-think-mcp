import { BaseChatTool } from './base-chat-tool';
import { QueueManager } from '../queue';
import { JSONSchemaType } from 'ajv';

interface ChatGeminiArgs {
  prompt: string;
  temperature?: number;
  model?: string;
}

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.0-pro'
] as const;

export class ChatGeminiTool extends BaseChatTool {
  public readonly name = 'chat_gemini';
  public readonly description = 'Send a prompt to Google Gemini AI and get a response';
  
  public readonly inputSchema = {
    type: 'object' as const,
    properties: {
      prompt: {
        type: 'string',
        description: 'The prompt to send to Gemini'
      },
      temperature: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        default: 0.7,
        description: 'Controls randomness in the response (0.0 = deterministic, 1.0 = very random)'
      },
      model: {
        type: 'string',
        enum: GEMINI_MODELS,
        default: 'gemini-2.5-flash',
        description: 'The Gemini model to use for the request'
      }
    },
    required: ['prompt'],
    additionalProperties: false
  };

  constructor(queueManager: QueueManager) {
    const schema = {
      type: 'object' as const,
      properties: {
        prompt: { type: 'string' as const },
        temperature: { 
          type: 'number' as const, 
          minimum: 0, 
          maximum: 1
        },
        model: { 
          type: 'string' as const, 
          enum: GEMINI_MODELS as any
        }
      },
      required: ['prompt'] as const,
      additionalProperties: false
    };

    super(queueManager, 'chat_gemini', schema as any);
  }
}