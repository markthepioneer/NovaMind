# NovaMind

NovaMind is an AI-powered agent platform that enables the creation and deployment of specialized agents for various tasks. The platform includes a web-based interface for interacting with agents and managing their configurations.

## Features

- **Contact Detective Agent**: An agent specialized in gathering and analyzing contact information from web and social media sources
- **Modular Architecture**: Support for multiple agent types and tools
- **Real-time Web Search**: Integration with Google Custom Search API for gathering information
- **Interactive Chat Interface**: User-friendly interface for communicating with agents

## Project Structure

- `frontend-new/`: React-based web interface
- `services/`: Backend services
  - `agent-runtime/`: Agent runtime service for processing agent requests
  - Other microservices (to be added)

## Setup

1. Install dependencies:
   ```bash
   # Install frontend dependencies
   cd frontend-new
   npm install

   # Install agent runtime dependencies
   cd ../services/agent-runtime
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env` in each service directory
   - Set required API keys and configuration values

3. Start the services:
   ```bash
   # Start frontend
   cd frontend-new
   npm start

   # Start agent runtime
   cd ../services/agent-runtime
   npm run build && npm start
   ```

## Development

- Frontend runs on port 3000
- Agent runtime service runs on port 3001
- Uses TypeScript for type safety
- Implements modular architecture for easy extension

## Required Environment Variables

### Agent Runtime Service
- `PORT`: Server port (default: 3001)
- `GOOGLE_SEARCH_API_KEY`: Google Custom Search API key
- `GOOGLE_SEARCH_ENGINE_ID`: Google Custom Search Engine ID
- `API_KEY`: Service API key for authentication
- `CORS_ORIGIN`: Allowed CORS origins

## License

[Add your chosen license here]
