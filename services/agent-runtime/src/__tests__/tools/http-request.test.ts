import { HttpRequestTool } from '../../tools/http-request.tool';
import axios from 'axios';
import { ValidationError } from '../../utils/error-handling';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpRequestTool', () => {
  let httpRequestTool: HttpRequestTool;

  beforeEach(() => {
    httpRequestTool = new HttpRequestTool();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should perform a GET request successfully', async () => {
    const mockResponse = {
      data: { message: 'Success' },
      status: 200,
      headers: { 'content-type': 'application/json' }
    };

    mockedAxios.request.mockResolvedValueOnce(mockResponse);

    const result = await httpRequestTool.execute(
      {
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: { 'Accept': 'application/json' }
      },
      { agentId: 'test', userId: 'test', conversationId: 'test' }
    );

    expect(result).toEqual({
      data: { message: 'Success' },
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
    expect(mockedAxios.request).toHaveBeenCalledWith({
      method: 'GET',
      url: 'https://api.example.com/test',
      headers: { 'Accept': 'application/json' }
    });
  });

  it('should perform a POST request with body successfully', async () => {
    const mockResponse = {
      data: { id: 1 },
      status: 201,
      headers: { 'content-type': 'application/json' }
    };

    mockedAxios.request.mockResolvedValueOnce(mockResponse);

    const result = await httpRequestTool.execute(
      {
        method: 'POST',
        url: 'https://api.example.com/create',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'test' }
      },
      { agentId: 'test', userId: 'test', conversationId: 'test' }
    );

    expect(result).toEqual({
      data: { id: 1 },
      status: 201,
      headers: { 'content-type': 'application/json' }
    });
    expect(mockedAxios.request).toHaveBeenCalledWith({
      method: 'POST',
      url: 'https://api.example.com/create',
      headers: { 'Content-Type': 'application/json' },
      data: { name: 'test' }
    });
  });

  it('should validate required parameters', async () => {
    await expect(
      httpRequestTool.execute(
        { method: 'GET' },
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      )
    ).rejects.toThrow(ValidationError);

    await expect(
      httpRequestTool.execute(
        { url: 'https://api.example.com' },
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      )
    ).rejects.toThrow(ValidationError);
  });

  it('should validate allowed HTTP methods', async () => {
    await expect(
      httpRequestTool.execute(
        {
          method: 'INVALID',
          url: 'https://api.example.com'
        },
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      )
    ).rejects.toThrow(ValidationError);
  });

  it('should validate URL format', async () => {
    await expect(
      httpRequestTool.execute(
        {
          method: 'GET',
          url: 'invalid-url'
        },
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      )
    ).rejects.toThrow(ValidationError);
  });

  it('should handle request errors gracefully', async () => {
    mockedAxios.request.mockRejectedValueOnce(new Error('Network Error'));

    await expect(
      httpRequestTool.execute(
        {
          method: 'GET',
          url: 'https://api.example.com/error'
        },
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      )
    ).rejects.toThrow('HTTP request failed: Network Error');
  });

  it('should handle non-JSON responses', async () => {
    const mockResponse = {
      data: 'Plain text response',
      status: 200,
      headers: { 'content-type': 'text/plain' }
    };

    mockedAxios.request.mockResolvedValueOnce(mockResponse);

    const result = await httpRequestTool.execute(
      {
        method: 'GET',
        url: 'https://api.example.com/text'
      },
      { agentId: 'test', userId: 'test', conversationId: 'test' }
    );

    expect(result).toEqual({
      data: 'Plain text response',
      status: 200,
      headers: { 'content-type': 'text/plain' }
    });
  });
}); 