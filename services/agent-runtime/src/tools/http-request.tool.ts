import axios, { AxiosRequestConfig, Method } from 'axios';
import { Tool, ToolContext } from '../services/tool-manager.service';
import { Logger } from '../utils/logger';
import { ValidationError } from '../utils/error-handling';

const logger = new Logger('HttpRequestTool');

interface HttpResponse {
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
}

export class HttpRequestTool implements Tool {
  id = 'http_request';
  name = 'HTTP Request';
  description = 'Make HTTP requests to external APIs';
  parameters = [
    {
      type: 'string' as const,
      required: true,
      description: 'URL to send the request to'
    },
    {
      type: 'string' as const,
      required: true,
      description: 'HTTP method (GET, POST, PUT, DELETE, PATCH)'
    },
    {
      type: 'object' as const,
      required: false,
      description: 'Request headers'
    },
    {
      type: 'object' as const,
      required: false,
      description: 'Request body (for POST, PUT, PATCH)'
    },
    {
      type: 'object' as const,
      required: false,
      description: 'Query parameters'
    }
  ];

  private allowedMethods: Method[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  private allowedDomains: string[] = [
    // Add allowed domains here
    'api.example.com',
    'api.openai.com',
    'api.anthropic.com'
  ];

  async execute(params: Record<string, any>, context: ToolContext): Promise<HttpResponse> {
    try {
      const { url, method, headers = {}, body, query } = params;

      // Validate URL
      if (!url) {
        throw new ValidationError('URL is required');
      }

      const urlObj = new URL(url);
      if (!this.isAllowedDomain(urlObj.hostname)) {
        throw new ValidationError(`Domain ${urlObj.hostname} is not allowed`);
      }

      // Validate method
      const upperMethod = method.toUpperCase();
      if (!this.allowedMethods.includes(upperMethod as Method)) {
        throw new ValidationError(`Method ${method} is not allowed`);
      }

      // Prepare request config
      const config: AxiosRequestConfig = {
        url,
        method: upperMethod,
        headers: this.sanitizeHeaders(headers),
        params: query,
        data: body,
        timeout: 10000, // 10 second timeout
        maxContentLength: 10 * 1024 * 1024, // 10MB max response size
        validateStatus: null // Don't throw on any status code
      };

      // Make request
      const response = await axios(config);

      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers as Record<string, string>
      };

    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }

      logger.error('HTTP request failed:', error);
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }

  private isAllowedDomain(hostname: string): boolean {
    return this.allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const allowedHeaders = [
      'accept',
      'content-type',
      'user-agent',
      'x-request-id'
      // Add other allowed headers here
    ];

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (allowedHeaders.includes(lowerKey)) {
        sanitized[lowerKey] = value;
      }
    }

    return sanitized;
  }
} 