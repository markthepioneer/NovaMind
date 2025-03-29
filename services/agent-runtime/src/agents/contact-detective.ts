import { Agent } from '../types/agent';
import { WebSearchTool } from '../tools/web-search.tool';
import { ToolContext } from '../services/tool-manager.service';

export class ContactDetectiveAgent implements Agent {
  private webSearchTool: WebSearchTool;
  private isInitialized: boolean = false;

  constructor() {
    this.webSearchTool = new WebSearchTool();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Validate required environment variables
    if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
      console.warn('Warning: Google Search API credentials not provided. Web search functionality will be limited.');
    }

    this.isInitialized = true;
    console.log('Contact Detective agent initialized');
  }

  async processMessage(message: string, userId: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('Contact Detective processing input:', message);
      
      // Extract contact information from input
      const contactInfo = this.parseContactInfo(message);
      
      // Perform web search for additional information
      const searchResults = await this.webSearchTool.execute(
        {
          query: `${contactInfo.name} ${contactInfo.email || ''} ${contactInfo.phone || ''}`,
          numResults: 5
        },
        { 
          agentId: 'contact-detective',
          userId,
          conversationId: Date.now().toString()
        }
      );
      
      // Generate report
      const report = this.generateReport(contactInfo, searchResults);
      
      return report;
    } catch (error) {
      console.error('Error in Contact Detective:', error);
      throw new Error('Failed to process contact information');
    }
  }

  private parseContactInfo(input: string): { name: string; email?: string; phone?: string } {
    const parts = input.split(' ');
    const result: { name: string; email?: string; phone?: string } = {
      name: parts.slice(0, 2).join(' ').trim()
    };

    // Look for email and phone in remaining parts
    for (const part of parts.slice(2)) {
      if (part.includes('@')) {
        result.email = part;
      } else if (/^\d{10}$/.test(part.replace(/\D/g, ''))) {
        result.phone = part;
      }
    }

    return result;
  }

  private generateReport(contactInfo: any, searchResults: any): string {
    const sections = ['# Contact Investigation Report\n'];

    // Basic Information
    sections.push('## Basic Information');
    sections.push(`- Name: ${contactInfo.name}`);
    if (contactInfo.phone) sections.push(`- Phone: ${contactInfo.phone}`);
    if (contactInfo.email) sections.push(`- Email: ${contactInfo.email}`);
    sections.push('');

    // Web Search Findings
    sections.push('## Web Search Findings');
    if (searchResults?.length > 0) {
      searchResults.forEach((item: any) => {
        sections.push(`### ${item.title}`);
        sections.push(item.snippet);
        sections.push(`Source: ${item.link}\n`);
      });
    } else {
      sections.push('No web search results found.');
    }

    sections.push(`\nReport generated on: ${new Date().toISOString()}`);

    return sections.join('\n').trim();
  }
} 