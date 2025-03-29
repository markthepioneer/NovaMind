# Agent Runtime Service

The Agent Runtime Service is a core component of NovaMind that executes AI agents with tool integration capabilities.

## Features

- Execute AI agents using OpenAI or Anthropic models
- Built-in tools for web search, HTTP requests, and file operations
- Rate limiting and security features
- Configurable workspace environment
- API key authentication

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your configuration:
- `API_KEY`: Your service API key
- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: (Optional) Anthropic API key
- `WORKSPACE_ROOT`: Path to agent workspace
- Other configuration options...

3. Build and start the service:
```bash
npm run build
npm start
```

For development:
```bash
npm run dev
```

## API Endpoints

All endpoints require the `x-api-key` header with your API key.

### Load Agent

```http
POST /api/v1/agents
Content-Type: application/json

{
  "id": "agent-id",
  "name": "My Agent",
  "basePrompt": "You are a helpful assistant...",
  "model": {
    "provider": "openai",
    "name": "gpt-4",
    "temperature": 0.7
  },
  "tools": [
    {
      "id": "web_search",
      "config": {
        "maxResults": 5
      }
    }
  ]
}
```

### Process Message

```http
POST /api/v1/agents/:agentId/messages
Content-Type: application/json

{
  "message": "Search for information about AI",
  "userId": "user-123",
  "contextId": "optional-context-id"
}
```

### List Available Tools

```http
GET /api/v1/tools
```

### Register Custom Tool

```http
POST /api/v1/tools
Content-Type: application/json

{
  "id": "custom_tool",
  "name": "Custom Tool",
  "description": "A custom tool",
  "parameters": [
    {
      "type": "string",
      "required": true,
      "description": "Input parameter"
    }
  ]
}
```

## Built-in Tools

### Web Search Tool
- Search the web using Google Custom Search
- Parameters:
  - `query` (string, required): Search query
  - `numResults` (number, optional): Number of results (max 10)

### HTTP Request Tool
- Make HTTP requests to external APIs
- Parameters:
  - `url` (string, required): URL to send the request to
  - `method` (string, required): HTTP method
  - `headers` (object, optional): Request headers
  - `body` (object, optional): Request body
  - `query` (object, optional): Query parameters

### File Operations Tool
- Read, write, and list files in the workspace
- Parameters:
  - `operation` (string, required): Operation type (read, write, list)
  - `path` (string, required): File or directory path
  - `content` (string, optional): Content to write

## Custom Tool Development

To create a custom tool:

1. Implement the `Tool` interface:
```typescript
interface Tool {
  id: string;
  name: string;
  description: string;
  parameters: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    description: string;
  }[];
  execute: (params: Record<string, any>, context: ToolContext) => Promise<any>;
}
```

2. Register the tool with the ToolManager:
```typescript
const customTool = new CustomTool();
toolManager.registerTool(customTool);
```

## Security

- API key authentication required for all endpoints
- Rate limiting per user
- CORS configuration
- Request size limits
- Input validation
- Security headers via Helmet
- Allowed domains for HTTP requests
- File type restrictions for file operations

## Error Handling

The service uses the following error types:
- `ValidationError`: Invalid input or parameters
- `NotFoundError`: Resource not found
- `AuthorizationError`: Authentication/authorization failure
- `ConfigurationError`: Service configuration issues
- `ExecutionError`: Tool execution failures

## Monitoring

- Request logging with Winston
- Error tracking
- Rate limit monitoring
- Tool execution metrics

## Development

```bash
# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Environment Variables

See `.env.example` for all available configuration options.
