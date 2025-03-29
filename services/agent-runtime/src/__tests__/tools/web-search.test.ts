import { WebSearchTool } from '../../tools/web-search.tool';
import axios from 'axios';
import { ValidationError } from '../../utils/error-handling';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebSearchTool', () => {
  let webSearchTool: WebSearchTool;

  beforeEach(() => {
    webSearchTool = new WebSearchTool('test-key', 'test-engine-id');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should perform a web search successfully', async () => {
    const mockResponse = {
      data: {
        items: [
          {
            title: 'Test Result',
            link: 'https://example.com',
            snippet: 'Test snippet'
          }
        ]
      }
    };

    mockedAxios.get.mockResolvedValueOnce(mockResponse);

    const result = await webSearchTool.execute(
      { query: 'test query' },
      { agentId: 'test', userId: 'test', conversationId: 'test' }
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      title: 'Test Result',
      link: 'https://example.com',
      snippet: 'Test snippet'
    });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://www.googleapis.com/customsearch/v1',
      expect.any(Object)
    );
  });

  it('should handle empty search results', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: {} });

    const result = await webSearchTool.execute(
      { query: 'test query' },
      { agentId: 'test', userId: 'test', conversationId: 'test' }
    );

    expect(result).toEqual([]);
  });

  it('should validate required parameters', async () => {
    await expect(
      webSearchTool.execute(
        { numResults: 5 },
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      )
    ).rejects.toThrow(ValidationError);
  });

  it('should limit number of results', async () => {
    const mockResponse = {
      data: {
        items: Array(15).fill({
          title: 'Test Result',
          link: 'https://example.com',
          snippet: 'Test snippet'
        })
      }
    };

    mockedAxios.get.mockResolvedValueOnce(mockResponse);

    const result = await webSearchTool.execute(
      { query: 'test query', numResults: 15 },
      { agentId: 'test', userId: 'test', conversationId: 'test' }
    );

    expect(result).toHaveLength(10); // Should be limited to 10
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://www.googleapis.com/customsearch/v1',
      expect.objectContaining({
        params: expect.objectContaining({ num: 10 })
      })
    );
  });

  it('should handle API errors gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

    await expect(
      webSearchTool.execute(
        { query: 'test query' },
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      )
    ).rejects.toThrow('Web search failed: API Error');
  });
}); 