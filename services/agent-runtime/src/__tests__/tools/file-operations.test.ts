import { FileOperationsTool } from '../../tools/file-operations.tool';
import { ValidationError } from '../../utils/error-handling';
import fs from 'fs/promises';
import path from 'path';

jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FileOperationsTool', () => {
  const testWorkspaceRoot = '/test/workspace';
  let fileOperationsTool: FileOperationsTool;

  beforeEach(() => {
    fileOperationsTool = new FileOperationsTool(testWorkspaceRoot);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('read operation', () => {
    it('should read file contents successfully', async () => {
      const testFilePath = 'test.txt';
      const testContent = 'Test file content';

      mockedFs.readFile.mockResolvedValueOnce(Buffer.from(testContent));
      mockedFs.stat.mockResolvedValueOnce({ isFile: () => true } as any);

      const result = await fileOperationsTool.execute(
        {
          operation: 'read',
          filePath: testFilePath
        },
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      );

      expect(result).toBe(testContent);
      expect(mockedFs.readFile).toHaveBeenCalledWith(
        path.join(testWorkspaceRoot, testFilePath),
        'utf8'
      );
    });

    it('should throw error for non-existent file', async () => {
      mockedFs.stat.mockRejectedValueOnce(new Error('ENOENT'));

      await expect(
        fileOperationsTool.execute(
          {
            operation: 'read',
            filePath: 'nonexistent.txt'
          },
          { agentId: 'test', userId: 'test', conversationId: 'test' }
        )
      ).rejects.toThrow('File not found');
    });

    it('should validate file path is within workspace', async () => {
      await expect(
        fileOperationsTool.execute(
          {
            operation: 'read',
            filePath: '../outside.txt'
          },
          { agentId: 'test', userId: 'test', conversationId: 'test' }
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('write operation', () => {
    it('should write file contents successfully', async () => {
      const testFilePath = 'test.txt';
      const testContent = 'New content';

      mockedFs.writeFile.mockResolvedValueOnce(undefined);
      mockedFs.mkdir.mockResolvedValueOnce(undefined);

      await fileOperationsTool.execute(
        {
          operation: 'write',
          filePath: testFilePath,
          content: testContent
        },
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      );

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(testWorkspaceRoot, testFilePath),
        testContent,
        'utf8'
      );
    });

    it('should create parent directories if they don\'t exist', async () => {
      const testFilePath = 'dir1/dir2/test.txt';
      const testContent = 'New content';

      mockedFs.writeFile.mockResolvedValueOnce(undefined);
      mockedFs.mkdir.mockResolvedValueOnce(undefined);

      await fileOperationsTool.execute(
        {
          operation: 'write',
          filePath: testFilePath,
          content: testContent
        },
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      );

      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        path.dirname(path.join(testWorkspaceRoot, testFilePath)),
        { recursive: true }
      );
    });
  });

  describe('list operation', () => {
    it('should list directory contents successfully', async () => {
      const testDir = 'testDir';
      const mockFiles = [
        { name: 'file1.txt', isFile: () => true },
        { name: 'file2.txt', isFile: () => true },
        { name: 'subdir', isFile: () => false }
      ];

      mockedFs.readdir.mockResolvedValueOnce(mockFiles as any);

      const result = await fileOperationsTool.execute(
        {
          operation: 'list',
          filePath: testDir
        },
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      );

      expect(result).toEqual([
        { name: 'file1.txt', type: 'file' },
        { name: 'file2.txt', type: 'file' },
        { name: 'subdir', type: 'directory' }
      ]);
    });

    it('should handle empty directories', async () => {
      mockedFs.readdir.mockResolvedValueOnce([]);

      const result = await fileOperationsTool.execute(
        {
          operation: 'list',
          filePath: 'emptyDir'
        },
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      );

      expect(result).toEqual([]);
    });

    it('should throw error for non-existent directory', async () => {
      mockedFs.readdir.mockRejectedValueOnce(new Error('ENOENT'));

      await expect(
        fileOperationsTool.execute(
          {
            operation: 'list',
            filePath: 'nonexistent'
          },
          { agentId: 'test', userId: 'test', conversationId: 'test' }
        )
      ).rejects.toThrow('Directory not found');
    });
  });

  it('should validate required parameters', async () => {
    await expect(
      fileOperationsTool.execute(
        {
          operation: 'read'
        } as any,
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      )
    ).rejects.toThrow(ValidationError);

    await expect(
      fileOperationsTool.execute(
        {
          operation: 'write',
          filePath: 'test.txt'
        } as any,
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      )
    ).rejects.toThrow(ValidationError);
  });

  it('should validate operation type', async () => {
    await expect(
      fileOperationsTool.execute(
        {
          operation: 'invalid' as any,
          filePath: 'test.txt'
        },
        { agentId: 'test', userId: 'test', conversationId: 'test' }
      )
    ).rejects.toThrow(ValidationError);
  });
}); 