import { AgentRuntimeService } from '../../services/agent-runtime.service';
import { ToolManager } from '../../services/tool-manager.service';
import { ValidationError } from '../../utils/error-handling';

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  basePrompt: string;
  model: {
    provider: 'openai' | 'anthropic';
    name: string;
    temperature?: number;
    maxTokens?: number;
  };
  tools: { id: string; config: Record<string, any> }[];
  process: (message: string, context: any, tools: any) => Promise<any>;
}

jest.mock('../../services/tool-manager.service');

describe('AgentRuntimeService', () => {
  let agentRuntime: AgentRuntimeService;
  let mockToolManager: jest.Mocked<ToolManager>;

  beforeEach(() => {
    mockToolManager = {
      executeTool: jest.fn(),
      getAvailableTools: jest.fn().mockReturnValue(['web-search', 'http-request', 'file-operations'])
    } as any;

    (ToolManager as jest.Mock).mockImplementation(() => mockToolManager);
    agentRuntime = new AgentRuntimeService(mockToolManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadAgent', () => {
    const validAgentConfig: AgentConfig = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      basePrompt: 'You are a test agent',
      model: {
        provider: 'openai',
        name: 'gpt-4',
        temperature: 0.7
      },
      tools: [{ id: 'web-search', config: {} }],
      process: async (message, context, tools) => {
        return { response: 'Test response' };
      }
    };

    it('should load valid agent successfully', async () => {
      const result = await agentRuntime.loadAgent(validAgentConfig);

      expect(result).toEqual({
        agentId: validAgentConfig.id,
        name: validAgentConfig.name,
        description: validAgentConfig.description
      });
    });

    it('should throw error for missing required agent properties', async () => {
      const incompleteConfig = {
        ...validAgentConfig,
        basePrompt: ''
      };

      await expect(
        agentRuntime.loadAgent(incompleteConfig)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('processMessage', () => {
    const mockContext = {
      agentId: 'test-agent',
      userId: 'test-user',
      conversationId: 'test-conversation',
      messageId: 'test-message'
    };

    const mockAgent: AgentConfig = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      basePrompt: 'You are a test agent',
      model: {
        provider: 'openai',
        name: 'gpt-4',
        temperature: 0.7
      },
      tools: [{ id: 'web-search', config: {} }],
      process: jest.fn()
    };

    beforeEach(() => {
      // Load mock agent
      agentRuntime['agents'].set('test-agent', mockAgent);
    });

    it('should process message successfully', async () => {
      const expectedResponse = { response: 'Test response' };
      (mockAgent.process as jest.Mock).mockResolvedValueOnce(expectedResponse);

      const result = await agentRuntime.processMessage(
        'Hello',
        mockContext.agentId,
        mockContext.userId
      );

      expect(result).toEqual(expectedResponse);
      expect(mockAgent.process).toHaveBeenCalledWith(
        'Hello',
        mockContext,
        expect.any(Object)
      );
    });

    it('should throw error for unknown agent', async () => {
      await expect(
        agentRuntime.processMessage('Hello', 'unknown-agent', mockContext.userId)
      ).rejects.toThrow('Agent not found');
    });

    it('should handle agent processing errors gracefully', async () => {
      (mockAgent.process as jest.Mock).mockRejectedValueOnce(new Error('Processing error'));

      await expect(
        agentRuntime.processMessage('Hello', mockContext.agentId, mockContext.userId)
      ).rejects.toThrow('Processing error');
    });

    it('should provide tool context to agent', async () => {
      await agentRuntime.processMessage('Hello', mockContext.agentId, mockContext.userId);

      expect(mockAgent.process).toHaveBeenCalledWith(
        'Hello',
        mockContext,
        expect.objectContaining({
          tools: expect.any(Object)
        })
      );
    });

    it('should execute tools through tool manager', async () => {
      const toolResult = { data: 'tool result' };
      mockToolManager.executeTool.mockResolvedValueOnce(toolResult);

      (mockAgent.process as jest.Mock).mockImplementationOnce(async (message, context, { tools }) => {
        const result = await tools.executeTool('web-search', { query: 'test' });
        return { response: result.data };
      });

      const result = await agentRuntime.processMessage('Hello', mockContext.agentId, mockContext.userId);

      expect(result).toEqual({ response: 'tool result' });
      expect(mockToolManager.executeTool).toHaveBeenCalledWith(
        'web-search',
        { query: 'test' },
        mockContext
      );
    });
  });

  describe('getLoadedAgents', () => {
    const mockAgent: AgentConfig = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      basePrompt: 'You are a test agent',
      model: {
        provider: 'openai',
        name: 'gpt-4',
        temperature: 0.7
      },
      tools: [{ id: 'web-search', config: {} }],
      process: jest.fn()
    };

    beforeEach(() => {
      agentRuntime['agents'].set('test-agent', mockAgent);
    });

    it('should return list of loaded agents', () => {
      const result = agentRuntime.getLoadedAgents();

      expect(result).toEqual([{
        agentId: mockAgent.id,
        name: mockAgent.name,
        description: mockAgent.description
      }]);
    });

    it('should return empty array when no agents loaded', () => {
      agentRuntime['agents'].clear();
      const result = agentRuntime.getLoadedAgents();
      expect(result).toEqual([]);
    });
  });

  describe('getAvailableTools', () => {
    it('should return list of available tools', () => {
      const tools = agentRuntime.getAvailableTools();
      expect(tools).toEqual(['web-search', 'http-request', 'file-operations']);
      expect(mockToolManager.getAvailableTools).toHaveBeenCalled();
    });
  });
}); 