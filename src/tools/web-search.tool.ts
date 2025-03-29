import axios from 'axios';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export interface ToolContext {
  agentId: string;
  userId: string;
  conversationId: string;
}

export class WebSearchTool {
  private apiKey: string;
  private searchEngineId: string;

  constructor(
    apiKey: string = process.env.GOOGLE_SEARCH_API_KEY || '',
    searchEngineId: string = process.env.GOOGLE_SEARCH_ENGINE_ID || ''
  ) {
    this.apiKey = apiKey;
    this.searchEngineId = searchEngineId;
  }

  async execute(params: { query: string; numResults?: number }, context: ToolContext): Promise<SearchResult[]> {
    try {
      if (!this.apiKey || !this.searchEngineId) {
        throw new Error('Google Search API key or Search Engine ID not configured');
      }

      const query = params.query;
      const numResults = Math.min(params.numResults || 5, 10);

      if (!query) {
        throw new Error('Search query is required');
      }

      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.apiKey,
          cx: this.searchEngineId,
          q: query,
          num: numResults
        }
      });

      if (!response.data.items) {
        return [];
      }

      return response.data.items.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet
      }));

    } catch (error: any) {
      console.error('Web search failed:', error);
      throw new Error(`Web search failed: ${error.message}`);
    }
  }
} 