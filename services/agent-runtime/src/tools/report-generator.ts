interface ReportSection {
  title: string;
  content: string;
}

export class ReportGenerator {
  generateMarkdownReport(sections: ReportSection[]): string {
    return sections.map(section => {
      return `## ${section.title}\n\n${section.content}\n`;
    }).join('\n');
  }
} 