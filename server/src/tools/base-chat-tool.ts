import { Tool } from './registry';
import { QueueManager } from '../queue';
import { getValidator, Validator } from '../utils/validator';
import { getWebSocketServer } from '../websocket';
import { ValidateFunction, JSONSchemaType } from 'ajv';

/**
 * Base class for chat tools that implements the Tool interface
 * Provides common functionality for ChatGPT and Gemini tools
 */
export abstract class BaseChatTool implements Tool {
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };

  protected readonly queueManager: QueueManager;
  protected readonly serviceName: 'chat_gemini' | 'chat_chatgpt';
  protected readonly validate: ValidateFunction;
  private readonly validator: Validator;

  constructor(
    queueManager: QueueManager,
    serviceName: 'chat_gemini' | 'chat_chatgpt',
    schema: JSONSchemaType<any>
  ) {
    this.queueManager = queueManager;
    this.serviceName = serviceName;
    this.validator = getValidator();
    
    // Compile and cache the validator for this tool
    const schemaId = `${serviceName}_schema`;
    this.validate = this.validator.compileSchema(schemaId, schema);
  }

  /**
   * Check if there are authenticated WebSocket clients connected
   * @returns True if there are authenticated clients, false otherwise
   */
  private hasAuthenticatedClients(): boolean {
    try {
      const wsServer = getWebSocketServer();
      const authenticatedCount = wsServer.getAuthenticatedClientsCount();
      
      return authenticatedCount > 0;
    } catch (error) {
      // If WebSocket server is not available, consider no clients connected
      return false;
    }
  }

  /**
   * Execute the chat tool
   * @param args Input arguments to validate and process
   * @returns Promise resolving to formatted MCP response
   */
  public async execute(args: Record<string, any>): Promise<{
    content: Array<{
      type: "text";
      text: string;
    } | {
      type: "image";
      data: string;
      mimeType: string;
    }>;
    isError?: boolean;
  }> {
    try {
      // Check if there are authenticated WebSocket clients connected
      if (!this.hasAuthenticatedClients()) {
        return {
          content: [{
            type: "text",
            text: "No browser extension connected. Please ensure the extension is running."
          }],
          isError: true
        };
      }

      // Validate input arguments
      const validationResult = this.validator.validate(
        `${this.serviceName}_schema`,
        args
      );

      if (!validationResult.valid) {
        const errorMessage = `Invalid arguments: ${validationResult.errors?.join(', ')}`;
        return {
          content: [{
            type: "text",
            text: errorMessage
          }],
          isError: true
        };
      }

      // Extract validated data
      const validatedArgs = validationResult.data;
      const { prompt, ...options } = validatedArgs;

      // Add request to queue and await response
      const response = await this.queueManager.addRequest(
        this.serviceName,
        prompt,
        options
      );

      // Return formatted response
      return {
        content: [{
          type: "text",
          text: response
        }]
      };
      
    } catch (error) {
      // Handle queue errors, timeouts, etc.
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        content: [{
          type: "text",
          text: `Error processing request: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
}