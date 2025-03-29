import { Agent, AgentConfig } from '../types/agent';
import { WebSearchTool, SearchResult, ToolContext } from '../tools/web-search.tool';
import { ReportGenerator, ReportSection } from '../tools/report-generator';

interface ContactInfo {
  name: string;
  email?: string;
  phone?: string;
  socialProfiles: {
    platform: string;
    url: string;
    details?: string;
  }[];
  websites?: string[];
  location?: string;
  occupation?: string;
  summary?: string;
  sources: {
    url: string;
    title: string;
    relevance: string;
  }[];
}

export class ContactDetectiveAgent implements Agent {
  private webSearch: WebSearchTool;
  private reportGenerator: ReportGenerator;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.webSearch = new WebSearchTool();
    this.reportGenerator = new ReportGenerator();
  }

  async initialize(): Promise<void> {
    // Validate required tools are available
    if (!this.webSearch || !this.reportGenerator) {
      throw new Error('Required tools not available');
    }
  }

  async process(input: string): Promise<string> {
    try {
      // Parse input for contact information
      const contactInfo = await this.extractContactInfo(input);
      
      // Search for additional information
      const enrichedInfo = await this.enrichContactInfo(contactInfo);
      
      // Generate report sections
      const sections = await this.generateReportSections(enrichedInfo);
      
      // Generate formatted report
      return this.reportGenerator.generateMarkdownReport(sections);
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async extractContactInfo(input: string): Promise<ContactInfo> {
    // Initialize basic contact info from input
    const contactInfo: ContactInfo = {
      name: input,
      socialProfiles: [],
      sources: []
    };

    return contactInfo;
  }

  private async enrichContactInfo(baseInfo: ContactInfo): Promise<ContactInfo> {
    const enrichedInfo = { ...baseInfo };
    const context: ToolContext = {
      agentId: this.config.id,
      userId: 'system',
      conversationId: 'enrich'
    };

    // Search for professional profiles
    const linkedinResults = await this.webSearch.execute({
      query: `${baseInfo.name} linkedin profile`,
      numResults: 3
    }, context);

    // Search for social media profiles
    const socialResults = await this.webSearch.execute({
      query: `${baseInfo.name} (twitter OR instagram OR facebook) profile`,
      numResults: 5
    }, context);

    // Search for general information
    const generalResults = await this.webSearch.execute({
      query: `${baseInfo.name} contact information website blog`,
      numResults: 5
    }, context);

    // Process LinkedIn results
    for (const result of linkedinResults) {
      if (result.link.includes('linkedin.com')) {
        enrichedInfo.socialProfiles.push({
          platform: 'LinkedIn',
          url: result.link,
          details: result.snippet
        });
        enrichedInfo.sources.push({
          url: result.link,
          title: result.title,
          relevance: 'Professional profile'
        });
      }
    }

    // Process social media results
    for (const result of socialResults) {
      const platform = this.detectSocialPlatform(result.link);
      if (platform) {
        enrichedInfo.socialProfiles.push({
          platform,
          url: result.link,
          details: result.snippet
        });
        enrichedInfo.sources.push({
          url: result.link,
          title: result.title,
          relevance: 'Social media profile'
        });
      }
    }

    // Process general results
    for (const result of generalResults) {
      if (!enrichedInfo.websites) {
        enrichedInfo.websites = [];
      }
      enrichedInfo.websites.push(result.link);
      enrichedInfo.sources.push({
        url: result.link,
        title: result.title,
        relevance: 'Additional information'
      });
    }

    return enrichedInfo;
  }

  private detectSocialPlatform(url: string): string | null {
    const platforms = {
      'twitter.com': 'Twitter',
      'x.com': 'Twitter',
      'instagram.com': 'Instagram',
      'facebook.com': 'Facebook',
      'github.com': 'GitHub',
      'medium.com': 'Medium',
      'youtube.com': 'YouTube'
    };

    for (const [domain, platform] of Object.entries(platforms)) {
      if (url.includes(domain)) {
        return platform;
      }
    }

    return null;
  }

  private async generateReportSections(info: ContactInfo): Promise<ReportSection[]> {
    return [
      {
        title: 'Contact Information Summary',
        content: this.generateSummarySection(info)
      },
      {
        title: 'Professional Presence',
        content: this.generateProfessionalSection(info)
      },
      {
        title: 'Social Media Profiles',
        content: this.generateSocialSection(info)
      },
      {
        title: 'Additional Resources',
        content: this.generateResourcesSection(info)
      },
      {
        title: 'Sources',
        content: this.generateSourcesSection(info)
      }
    ];
  }

  private generateSummarySection(info: ContactInfo): string {
    const parts = [
      `**Name:** ${info.name}`,
      info.email ? `**Email:** ${info.email}` : null,
      info.phone ? `**Phone:** ${info.phone}` : null,
      info.location ? `**Location:** ${info.location}` : null,
      info.occupation ? `**Occupation:** ${info.occupation}` : null,
      info.summary ? `\n${info.summary}` : null
    ];

    return parts.filter(Boolean).join('\n');
  }

  private generateProfessionalSection(info: ContactInfo): string {
    const linkedinProfile = info.socialProfiles.find(p => p.platform === 'LinkedIn');
    if (!linkedinProfile) {
      return 'No professional profile information found.';
    }

    return `**LinkedIn:** [Profile](${linkedinProfile.url})\n\n${linkedinProfile.details || ''}`;
  }

  private generateSocialSection(info: ContactInfo): string {
    const socialProfiles = info.socialProfiles.filter(p => p.platform !== 'LinkedIn');
    if (socialProfiles.length === 0) {
      return 'No social media profiles found.';
    }

    return socialProfiles.map(profile =>
      `**${profile.platform}:** [Profile](${profile.url})\n${profile.details || ''}`
    ).join('\n\n');
  }

  private generateResourcesSection(info: ContactInfo): string {
    if (!info.websites || info.websites.length === 0) {
      return 'No additional resources found.';
    }

    return info.websites.map(url =>
      `- [${url}](${url})`
    ).join('\n');
  }

  private generateSourcesSection(info: ContactInfo): string {
    return info.sources.map(source =>
      `- [${source.title}](${source.url}) - ${source.relevance}`
    ).join('\n');
  }

  handleError(error: any): string {
    console.error('Contact Detective Agent Error:', error);
    return `An error occurred while processing your request: ${error.message}`;
  }
} 