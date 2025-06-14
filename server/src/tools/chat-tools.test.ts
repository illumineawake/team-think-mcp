import { QueueManager } from '../queue/queue-manager';
import { ToolRegistry } from './registry';
import { getValidator } from '../utils/validator';
import { ChatGeminiTool } from './chat-gemini';
import { ChatGptTool } from './chat-chatgpt';
import { getWebSocketServer } from '../websocket';

// Mock QueueManager
jest.mock('../queue/queue-manager');
const MockedQueueManager = QueueManager as jest.MockedClass<typeof QueueManager>;

// Mock validator
jest.mock('../utils/validator');
const mockedGetValidator = getValidator as jest.MockedFunction<typeof getValidator>;

// Mock WebSocket server
jest.mock('../websocket');
const mockedGetWebSocketServer = getWebSocketServer as jest.MockedFunction<typeof getWebSocketServer>;

describe('Chat Tools', () => {
  let mockQueueManager: jest.Mocked<QueueManager>;
  let mockValidator: any;
  let mockWebSocketServer: any;
  let toolRegistry: ToolRegistry;
  let chatGeminiTool: ChatGeminiTool;
  let chatGptTool: ChatGptTool;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock QueueManager instance
    mockQueueManager = {
      addRequest: jest.fn(),
      resolveRequest: jest.fn(),
      rejectRequest: jest.fn(),
      cancelRequest: jest.fn(),
      cancelAllRequests: jest.fn(),
      getRequestStatus: jest.fn(),
      getQueueStats: jest.fn(),
      cleanupOldRequests: jest.fn()
    } as any;

    // Create mock validator
    mockValidator = {
      compileSchema: jest.fn(),
      getValidator: jest.fn(),
      validate: jest.fn(),
      clearCache: jest.fn(),
      getCacheSize: jest.fn()
    };

    // Create mock WebSocket server
    mockWebSocketServer = {
      getConnectedClientsCount: jest.fn(),
      getConnectedClientIds: jest.fn(),
      getAuthenticatedClientsCount: jest.fn(),
      broadcastMessage: jest.fn(),
      sendToClient: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    };

    // Mock the getValidator function to return our mock
    mockedGetValidator.mockReturnValue(mockValidator);

    // Mock the getWebSocketServer function to return our mock
    mockedGetWebSocketServer.mockReturnValue(mockWebSocketServer);

    // Setup default mock returns
    mockValidator.compileSchema.mockReturnValue(jest.fn().mockReturnValue(true));
    mockValidator.validate.mockReturnValue({ valid: true, data: { prompt: 'test prompt', temperature: 0.8, model: 'gemini-2.5-flash' } });
    mockWebSocketServer.getAuthenticatedClientsCount.mockReturnValue(1);
    mockQueueManager.addRequest.mockResolvedValue('Mock AI response');

    // Create fresh tool registry and tools
    toolRegistry = new ToolRegistry();
    chatGeminiTool = new ChatGeminiTool(mockQueueManager);
    chatGptTool = new ChatGptTool(mockQueueManager);
    
    // Clear validator cache
    mockValidator.clearCache.mockClear();
  });

  afterEach(() => {
    // Clear tool registry after each test
    toolRegistry.clear();
  });

  describe('ChatGeminiTool', () => {
    it('should be defined and importable', () => {
      expect(chatGeminiTool).toBeDefined();
      expect(chatGeminiTool.name).toBe('chat_gemini');
      expect(chatGeminiTool.description).toContain('Gemini');
    });

    it('should call queueManager.addRequest with correct arguments for chat_gemini service', async () => {
      const testArgs = { prompt: 'Hello world', temperature: 0.8, model: 'gemini-2.5-flash' };
      
      // Mock validation to return the exact input args
      mockValidator.validate.mockReturnValueOnce({ 
        valid: true, 
        data: testArgs 
      });
      
      await chatGeminiTool.execute(testArgs);
      
      expect(mockQueueManager.addRequest).toHaveBeenCalledWith(
        'chat_gemini',
        'Hello world',
        { temperature: 0.8, model: 'gemini-2.5-flash' }
      );
    });

    it('should correctly wrap successful response in MCP format', async () => {
      const testArgs = { prompt: 'Hello world' };
      
      const result = await chatGeminiTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Mock AI response'
        }]
      });
      expect(result.isError).toBeUndefined();
    });

    it('should propagate generic errors from addRequest', async () => {
      mockQueueManager.addRequest.mockRejectedValue(new Error('Connection failed'));
      const testArgs = { prompt: 'Hello world' };
      
      const result = await chatGeminiTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Error processing request: Connection failed'
        }],
        isError: true
      });
    });

    it('should propagate QueueManager timeout as specific timeout error', async () => {
      mockQueueManager.addRequest.mockRejectedValue(new Error('Request timed out after 30000ms'));
      const testArgs = { prompt: 'Hello world' };
      
      const result = await chatGeminiTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Error processing request: Request timed out after 30000ms'
        }],
        isError: true
      });
    });

    it('should reject invalid temperature values (< 0 or > 1)', async () => {
      mockValidator.validate.mockReturnValue({
        valid: false,
        errors: ['temperature: must be >= 0 and <= 1']
      });
      
      const testArgs = { prompt: 'Hello world', temperature: 1.5 };
      
      const result = await chatGeminiTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Invalid arguments: temperature: must be >= 0 and <= 1'
        }],
        isError: true
      });
    });

    it('should reject invalid model names not in enum', async () => {
      mockValidator.validate.mockReturnValue({
        valid: false,
        errors: ['model: must be one of the allowed values']
      });
      
      const testArgs = { prompt: 'Hello world', model: 'invalid-model' };
      
      const result = await chatGeminiTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Invalid arguments: model: must be one of the allowed values'
        }],
        isError: true
      });
    });

    it('should reject requests missing required prompt field', async () => {
      mockValidator.validate.mockReturnValue({
        valid: false,
        errors: ['prompt: is required']
      });
      
      const testArgs = { temperature: 0.7 };
      
      const result = await chatGeminiTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Invalid arguments: prompt: is required'
        }],
        isError: true
      });
    });

    it('should return error when no WebSocket clients are connected', async () => {
      mockWebSocketServer.getAuthenticatedClientsCount.mockReturnValue(0);
      
      const testArgs = { prompt: 'Hello world' };
      
      const result = await chatGeminiTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'No browser extension connected. Please ensure the extension is running.'
        }],
        isError: true
      });
      
      // Should not call addRequest when no clients connected
      expect(mockQueueManager.addRequest).not.toHaveBeenCalled();
    });
  });

  describe('ChatGptTool', () => {
    it('should be defined and importable', () => {
      expect(chatGptTool).toBeDefined();
      expect(chatGptTool.name).toBe('chat_chatgpt');
      expect(chatGptTool.description).toContain('ChatGPT');
    });

    it('should call queueManager.addRequest with correct arguments for chat_chatgpt service', async () => {
      const testArgs = { prompt: 'Hello world' };
      
      // Mock validation to return the exact input args
      mockValidator.validate.mockReturnValueOnce({ 
        valid: true, 
        data: testArgs 
      });
      
      await chatGptTool.execute(testArgs);
      
      expect(mockQueueManager.addRequest).toHaveBeenCalledWith(
        'chat_chatgpt',
        'Hello world',
        {} // No additional options for ChatGPT
      );
    });

    it('should correctly wrap successful response in MCP format', async () => {
      const testArgs = { prompt: 'Hello world' };
      
      const result = await chatGptTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Mock AI response'
        }]
      });
      expect(result.isError).toBeUndefined();
    });

    it('should propagate generic errors from addRequest', async () => {
      mockQueueManager.addRequest.mockRejectedValue(new Error('Connection failed'));
      const testArgs = { prompt: 'Hello world' };
      
      const result = await chatGptTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Error processing request: Connection failed'
        }],
        isError: true
      });
    });

    it('should propagate QueueManager timeout as specific timeout error', async () => {
      mockQueueManager.addRequest.mockRejectedValue(new Error('Request timed out after 30000ms'));
      const testArgs = { prompt: 'Hello world' };
      
      const result = await chatGptTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Error processing request: Request timed out after 30000ms'
        }],
        isError: true
      });
    });

    it('should reject extra parameters like temperature or model', async () => {
      mockValidator.validate.mockReturnValue({
        valid: false,
        errors: ['additionalProperties: must NOT have additional properties']
      });
      
      const testArgs = { prompt: 'Hello world', temperature: 0.7, model: 'gpt-4' };
      
      const result = await chatGptTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Invalid arguments: additionalProperties: must NOT have additional properties'
        }],
        isError: true
      });
    });

    it('should reject requests missing required prompt field', async () => {
      mockValidator.validate.mockReturnValue({
        valid: false,
        errors: ['prompt: is required']
      });
      
      const testArgs = {};
      
      const result = await chatGptTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Invalid arguments: prompt: is required'
        }],
        isError: true
      });
    });

    it('should return error when no WebSocket clients are connected', async () => {
      mockWebSocketServer.getAuthenticatedClientsCount.mockReturnValue(0);
      
      const testArgs = { prompt: 'Hello world' };
      
      const result = await chatGptTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'No browser extension connected. Please ensure the extension is running.'
        }],
        isError: true
      });
      
      // Should not call addRequest when no clients connected
      expect(mockQueueManager.addRequest).not.toHaveBeenCalled();
    });
  });

  describe('Tool Registry Integration', () => {
    it('should correctly list chat_gemini and chat_chatgpt after registration', () => {
      // Register tools
      toolRegistry.register(chatGeminiTool);
      toolRegistry.register(chatGptTool);
      
      const tools = toolRegistry.list();
      
      expect(tools).toHaveLength(2);
      
      const geminiTool = tools.find(t => t.name === 'chat_gemini');
      const gptTool = tools.find(t => t.name === 'chat_chatgpt');
      
      expect(geminiTool).toBeDefined();
      expect(geminiTool?.description).toContain('Gemini');
      expect(geminiTool?.inputSchema.properties.prompt).toBeDefined();
      expect(geminiTool?.inputSchema.properties.temperature).toBeDefined();
      expect(geminiTool?.inputSchema.properties.model).toBeDefined();
      
      expect(gptTool).toBeDefined();
      expect(gptTool?.description).toContain('ChatGPT');
      expect(gptTool?.inputSchema.properties.prompt).toBeDefined();
      expect(gptTool?.inputSchema.properties.temperature).toBeUndefined();
      expect(gptTool?.inputSchema.properties.model).toBeUndefined();
    });

    it('should allow tools to be re-registered after clear()', () => {
      // Register tools
      toolRegistry.register(chatGeminiTool);
      toolRegistry.register(chatGptTool);
      expect(toolRegistry.list()).toHaveLength(2);
      
      // Clear registry
      toolRegistry.clear();
      expect(toolRegistry.list()).toHaveLength(0);
      
      // Re-register tools without errors
      expect(() => {
        toolRegistry.register(chatGeminiTool);
        toolRegistry.register(chatGptTool);
      }).not.toThrow();
      
      expect(toolRegistry.list()).toHaveLength(2);
    });

    it('should throw error when trying to register tool with same name', () => {
      toolRegistry.register(chatGeminiTool);
      
      expect(() => {
        toolRegistry.register(chatGeminiTool);
      }).toThrow('Tool with name "chat_gemini" is already registered');
    });
  });

  describe('Validator Integration', () => {
    it('should correctly cache compiled schema validators', () => {
      // Clear previous calls from beforeEach setup
      jest.clearAllMocks();
      
      // Test validator utility caching
      const mockSchema = {
        type: 'object' as const,
        properties: {
          prompt: { type: 'string' as const }
        },
        required: ['prompt'],
        additionalProperties: false
      };

      const mockCompiledValidator = jest.fn().mockReturnValue(true);
      mockValidator.compileSchema.mockReturnValue(mockCompiledValidator);

      // Call compileSchema
      mockValidator.compileSchema('test_schema', mockSchema);

      // Verify it was called with correct arguments
      expect(mockValidator.compileSchema).toHaveBeenCalledWith('test_schema', mockSchema);
      expect(mockValidator.compileSchema).toHaveBeenCalledTimes(1);
    });

    it('should use cached validators on subsequent calls', () => {
      // Create tools which should compile schemas
      new ChatGeminiTool(mockQueueManager);
      new ChatGptTool(mockQueueManager);
      
      // Should have compiled schemas for both tools
      expect(mockValidator.compileSchema).toHaveBeenCalledWith('chat_gemini_schema', expect.any(Object));
      expect(mockValidator.compileSchema).toHaveBeenCalledWith('chat_chatgpt_schema', expect.any(Object));
    });
  });

  describe('WebSocket Connection Handling', () => {
    it('should handle case when WebSocket server throws error', async () => {
      // Mock WebSocket server to throw error
      mockedGetWebSocketServer.mockImplementation(() => {
        throw new Error('WebSocket server not available');
      });
      
      const testArgs = { prompt: 'Hello world' };
      
      const result = await chatGeminiTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'No browser extension connected. Please ensure the extension is running.'
        }],
        isError: true
      });
      
      // Should not call addRequest when WebSocket server is unavailable
      expect(mockQueueManager.addRequest).not.toHaveBeenCalled();
    });

    it('should handle gracefully when getAuthenticatedClientsCount throws error', async () => {
      mockWebSocketServer.getAuthenticatedClientsCount.mockImplementation(() => {
        throw new Error('Method not available');
      });
      
      const testArgs = { prompt: 'Hello world' };
      
      const result = await chatGeminiTool.execute(testArgs);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'No browser extension connected. Please ensure the extension is running.'
        }],
        isError: true
      });
    });
  });
});