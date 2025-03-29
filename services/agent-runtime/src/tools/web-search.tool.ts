import axios from 'axios';
import { Tool } from '../types/tool';
import { ToolContext } from '../services/tool-manager.service';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export class WebSearchTool implements Tool {
  id = 'web_search';
  name = 'Web Search';
  description = 'Search the web for information using Google Custom Search';
  parameters = [
    {
      type: 'string' as const,
      required: true,
      description: 'Search query'
    },
    {
      type: 'number' as const,
      required: false,
      description: 'Number of results to return (max 10)'
    }
  ];

  private apiKey: string;
  private searchEngineId: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_SEARCH_API_KEY || '';
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
  }

  async execute(params: { query: string; numResults?: number }, context: ToolContext): Promise<SearchResult[]> {
    if (!this.apiKey || !this.searchEngineId) {
      throw new Error('Google Search API credentials not configured');
    }

    try {
      console.log('Performing web search for:', params.query);
      
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.apiKey,
          cx: this.searchEngineId,
          q: params.query,
          num: params.numResults || 5
        }
      });

      if (!response.data.items || response.data.items.length === 0) {
        return [];
      }

      return response.data.items.map((item: any) => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link
      }));
    } catch (error) {
      console.error('Error performing web search:', error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        throw new Error('Google Search API access denied. Please check your API key and quota.');
      }
      throw new Error('Failed to perform web search');
    }
  }
} 