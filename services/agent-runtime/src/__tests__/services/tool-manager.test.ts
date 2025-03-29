import { ToolManager } from '../../services/tool-manager.service';
import { WebSearchTool } from '../../tools/web-search.tool';
import { HttpRequestTool } from '../../tools/http-request.tool';
import { FileOperationsTool } from '../../tools/file-operations.tool';
import { ValidationError } from '../../utils/error-handling';

jest.mock('../../tools/web-search.tool');
jest.mock('../../tools/http-request.tool');
jest.mock('../../tools/file-operations.tool');

describe('ToolManager', () => {
  let toolManager: ToolManager;
  const mockConfig = {
    workspaceRoot: '/test/workspace',
    googleSearchApiKey: 'test-key',
    googleSearchEngineId: 'test-engine-id'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    toolManager = new ToolManager();
  });

  describe('tool execution', () => {
    const mockContext = {
      agentId: 'test-agent',
      userId: 'test-user',
      conversationId: 'test-conversation'
    };

    beforeEach(() => {
      // Tools are registered automatically in constructor
    });

    it('should execute registered tool successfully', async () => {
      const mockResult = { data: 'test result' };
      const mockTool = {
        execute: jest.fn().mockResolvedValue(mockResult)
      };

      (WebSearchTool as jest.Mock).mockImplementation(() => mockTool);

      const result = await toolManager.executeTool(
        'web-search',
        { query: 'test query' },
        mockContext
      );

      expect(result).toEqual(mockResult);
      expect(mockTool.execute).toHaveBeenCalledWith(
        { query: 'test query' },
        mockContext
      );
    });

    it('should throw error for unregistered tool', async () => {
      await expect(
        toolManager.executeTool(
          'nonexistent-tool',
          { param: 'value' },
          mockContext
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should enforce rate limits', async () => {
      const mockTool = {
        execute: jest.fn().mockResolvedValue({ data: 'test' })
      };
      (WebSearchTool as jest.Mock).mockImplementation(() => mockTool);

      // Execute tool at rate limit
      const promises = Array(60).fill(null).map(() =>
        toolManager.executeTool(
          'web-search',
          { query: 'test' },
          mockContext
        )
      );

      await Promise.all(promises);

      // Next request should be rate limited
      await expect(
        toolManager.executeTool(
          'web-search',
          { query: 'test' },
          mockContext
        )
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should validate tool parameters', async () => {
      const mockTool = {
        execute: jest.fn(),
        parameters: [
          {
            name: 'required_param',
            type: 'string',
            required: true
          }
        ]
      };
      (WebSearchTool as jest.Mock).mockImplementation(() => mockTool);

      await expect(
        toolManager.executeTool(
          'web-search',
          {},
          mockContext
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should handle tool execution errors gracefully', async () => {
      const mockTool = {
        execute: jest.fn().mockRejectedValue(new Error('Tool error'))
      };
      (WebSearchTool as jest.Mock).mockImplementation(() => mockTool);

      await expect(
        toolManager.executeTool(
          'web-search',
          { query: 'test' },
          mockContext
        )
      ).rejects.toThrow('Tool error');
    });
  });

  describe('getAvailableTools', () => {
    it('should return list of registered tools', () => {
      const tools = toolManager.getAvailableTools();

      expect(tools).toContain('web-search');
      expect(tools).toContain('http-request');
      expect(tools).toContain('file-operations');
      expect(tools).toHaveLength(3);
    });
  });
}); 