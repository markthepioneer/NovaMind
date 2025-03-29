import { Request, Response } from 'express';
import { DeploymentController } from '../../controllers/deployment.controller';
import { logger } from '../../utils/logger';
import { ValidationError } from '../../utils/error-handler';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// Mock logger
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../utils/logger', () => mockLogger);

describe('DeploymentController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockDeploymentService: any;
  let deploymentController: DeploymentController;

  beforeEach(() => {
    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: {
        id: 'test-user',
        permissions: ['deployment:create', 'deployment:read'],
      },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockDeploymentService = {
      createDeployment: jest.fn(),
      getDeployment: jest.fn(),
      listDeployments: jest.fn(),
      getDeploymentLogs: jest.fn(),
      stopDeployment: jest.fn(),
      deleteDeployment: jest.fn(),
    };

    // @ts-ignore
    deploymentController = new DeploymentController();
    // @ts-ignore
    deploymentController.deploymentService = mockDeploymentService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDeployment', () => {
    beforeEach(() => {
      mockRequest.body = {
        name: 'test-deployment',
        type: 'kubernetes',
        resources: {
          cpu: '100m',
          memory: '256Mi',
          replicas: 3,
        },
        environment: {
          NODE_ENV: 'production',
        },
        image: 'test-image:latest',
      };
    });

    it('should create a new deployment', async () => {
      const deploymentId = 'test-id';
      mockDeploymentService.createDeployment.mockResolvedValue({
        id: deploymentId,
        ...mockRequest.body,
        status: 'pending',
      });

      await deploymentController.createDeployment(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockDeploymentService.createDeployment).toHaveBeenCalledWith(
        expect.objectContaining(mockRequest.body)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: deploymentId,
        })
      );
    });

    it('should handle validation errors', async () => {
      delete mockRequest.body.name;

      await deploymentController.createDeployment(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });

    it('should handle service errors', async () => {
      mockDeploymentService.createDeployment.mockRejectedValue(
        new Error('Service error')
      );

      await deploymentController.createDeployment(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getDeployment', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'test-id' };
    });

    it('should return deployment details', async () => {
      const deployment = {
        id: 'test-id',
        name: 'test-deployment',
        type: 'kubernetes',
        status: 'running',
      };
      mockDeploymentService.getDeployment.mockResolvedValue(deployment);

      await deploymentController.getDeployment(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockDeploymentService.getDeployment).toHaveBeenCalledWith(
        'test-id'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(deployment);
    });

    it('should handle non-existent deployment', async () => {
      mockDeploymentService.getDeployment.mockResolvedValue(null);

      await deploymentController.getDeployment(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });

  describe('listDeployments', () => {
    it('should return list of deployments', async () => {
      const deployments = {
        deployments: [
          {
            id: '1',
            name: 'deployment-1',
            type: 'kubernetes',
            status: 'running',
          },
          {
            id: '2',
            name: 'deployment-2',
            type: 'aws-lambda',
            status: 'stopped',
          },
        ],
        total: 2,
      };
      mockDeploymentService.listDeployments.mockResolvedValue(deployments);

      await deploymentController.listDeployments(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockDeploymentService.listDeployments).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockRequest.user?.id,
        })
      );
      expect(mockResponse.json).toHaveBeenCalledWith(deployments);
    });

    it('should handle query parameters', async () => {
      mockRequest.query = {
        type: 'kubernetes',
        status: 'running',
        page: '1',
        limit: '10',
      };

      await deploymentController.listDeployments(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockDeploymentService.listDeployments).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'kubernetes',
          status: 'running',
          page: 1,
          limit: 10,
        })
      );
    });
  });

  describe('getDeploymentLogs', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'test-id' };
      mockRequest.query = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-02T00:00:00Z',
      };
    });

    it('should return deployment logs', async () => {
      const logs = ['Log 1', 'Log 2'];
      mockDeploymentService.getDeploymentLogs.mockResolvedValue(logs);

      await deploymentController.getDeploymentLogs(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockDeploymentService.getDeploymentLogs).toHaveBeenCalledWith(
        'test-id',
        expect.any(Object)
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ logs });
    });

    it('should handle invalid time range', async () => {
      mockRequest.query = {
        start: 'invalid-date',
        end: '2024-01-02T00:00:00Z',
      };

      await deploymentController.getDeploymentLogs(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });

  describe('stopDeployment', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'test-id' };
    });

    it('should stop a deployment', async () => {
      mockDeploymentService.stopDeployment.mockResolvedValue(undefined);

      await deploymentController.stopDeployment(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockDeploymentService.stopDeployment).toHaveBeenCalledWith(
        'test-id'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'stopped',
        })
      );
    });

    it('should handle non-existent deployment', async () => {
      mockDeploymentService.stopDeployment.mockRejectedValue(
        new Error('Deployment not found')
      );

      await deploymentController.stopDeployment(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });

  describe('deleteDeployment', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'test-id' };
    });

    it('should delete a deployment', async () => {
      mockDeploymentService.deleteDeployment.mockResolvedValue(undefined);

      await deploymentController.deleteDeployment(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockDeploymentService.deleteDeployment).toHaveBeenCalledWith(
        'test-id'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it('should handle non-existent deployment', async () => {
      mockDeploymentService.deleteDeployment.mockRejectedValue(
        new Error('Deployment not found')
      );

      await deploymentController.deleteDeployment(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });
}); 