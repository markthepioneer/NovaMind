export interface ReportSection {
  title: string;
  content: string;
}

export class ReportGenerator {
  async generateMarkdownReport(sections: ReportSection[]): Promise<string> {
    return sections.map(section => 
      `## ${section.title}\n\n${section.content}`
    ).join('\n\n');
  }

  async generateHTMLReport(sections: ReportSection[]): Promise<string> {
    const html = sections.map(section => `
      <section>
        <h2>${this.escapeHtml(section.title)}</h2>
        <div>${this.markdownToHtml(section.content)}</div>
      </section>
    `).join('\n');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Contact Report</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
            }
            section {
              margin-bottom: 2rem;
            }
            h2 {
              color: #2c3e50;
              border-bottom: 2px solid #eee;
              padding-bottom: 0.5rem;
            }
            a {
              color: #3498db;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  private markdownToHtml(markdown: string): string {
    // Basic Markdown to HTML conversion
    return markdown
      // Convert headers
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      // Convert bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      // Convert lists
      .replace(/^\s*\n\*/gm, '<ul>\n*')
      .replace(/^(\*.+)\s*\n([^\*])/gm, '$1\n</ul>\n\n$2')
      .replace(/^\*(.+)/gm, '<li>$1</li>')
      // Convert paragraphs
      .replace(/^\s*\n\s*\n/gm, '</p><p>')
      // Wrap in paragraph tags
      .replace(/^(.+)$/gm, '<p>$1</p>');
  }
} 