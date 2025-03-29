import fs from 'fs/promises';
import path from 'path';
import { Tool, ToolContext } from '../services/tool-manager.service';
import { Logger } from '../utils/logger';
import { ValidationError } from '../utils/error-handling';

const logger = new Logger('FileOperationsTool');

interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedTime?: Date;
}

export class FileOperationsTool implements Tool {
  id = 'file_operations';
  name = 'File Operations';
  description = 'Read, write, and list files in the workspace';
  parameters = [
    {
      type: 'string' as const,
      required: true,
      description: 'Operation type (read, write, list)'
    },
    {
      type: 'string' as const,
      required: true,
      description: 'File or directory path'
    },
    {
      type: 'string' as const,
      required: false,
      description: 'Content to write (for write operation)'
    }
  ];

  private workspaceRoot: string;
  private allowedExtensions = [
    '.txt', '.json', '.yaml', '.yml', '.md',
    '.js', '.ts', '.jsx', '.tsx', '.html', '.css'
  ];

  constructor(workspaceRoot: string = process.env.WORKSPACE_ROOT || '') {
    this.workspaceRoot = workspaceRoot;
    if (!this.workspaceRoot) {
      logger.warn('Workspace root not provided');
    }
  }

  async execute(params: Record<string, any>, context: ToolContext): Promise<any> {
    try {
      if (!this.workspaceRoot) {
        throw new ValidationError('Workspace root not configured');
      }

      const { operation, path: filePath, content } = params;

      // Validate and normalize path
      const normalizedPath = this.normalizePath(filePath);
      this.validatePath(normalizedPath);

      switch (operation) {
        case 'read':
          return this.readFile(normalizedPath);
        case 'write':
          return this.writeFile(normalizedPath, content);
        case 'list':
          return this.listFiles(normalizedPath);
        default:
          throw new ValidationError(`Invalid operation: ${operation}`);
      }
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('File operation failed:', error);
      throw new Error(`File operation failed: ${error.message}`);
    }
  }

  private async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error: any) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  private async listFiles(dirPath: string): Promise<FileInfo[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files: FileInfo[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          files.push({
            name: entry.name,
            path: fullPath,
            type: 'directory'
          });
        } else if (entry.isFile() && this.isAllowedFile(entry.name)) {
          const stats = await fs.stat(fullPath);
          files.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
            size: stats.size,
            modifiedTime: stats.mtime
          });
        }
      }

      return files;
    } catch (error: any) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  private normalizePath(filePath: string): string {
    const normalizedPath = path.normalize(filePath);
    return path.resolve(this.workspaceRoot, normalizedPath);
  }

  private validatePath(fullPath: string): void {
    // Check if path is within workspace
    if (!fullPath.startsWith(this.workspaceRoot)) {
      throw new ValidationError('Path must be within workspace');
    }

    // Check file extension for security
    if (!this.isAllowedFile(fullPath)) {
      throw new ValidationError('File type not allowed');
    }
  }

  private isAllowedFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '' || this.allowedExtensions.includes(ext);
  }
} 