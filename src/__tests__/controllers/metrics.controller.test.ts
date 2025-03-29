import { Request, Response } from 'express';
import { MetricsController } from '../../controllers/metrics.controller';
import { DeploymentService } from '../../services/deployment-factory.service';
import { logger } from '../../utils/logger';

jest.mock('../../services/deployment-factory.service');
jest.mock('../../utils/logger');

describe('MetricsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockDeploymentService: jest.Mocked<DeploymentService>;
  let metricsController: MetricsController;

  beforeEach(() => {
    mockRequest = {
      params: {},
      query: {},
      user: {
        userId: 'test-user',
      },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockDeploymentService = {
      getDeployment: jest.fn(),
      getDeploymentMetrics: jest.fn(),
      listDeployments: jest.fn(),
      getDeploymentLogs: jest.fn(),
    } as unknown as jest.Mocked<DeploymentService>;

    metricsController = new MetricsController(mockDeploymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSystemMetrics', () => {
    it('should return system-wide metrics', async () => {
      mockDeploymentService.listDeployments.mockResolvedValue({
        deployments: [
          { id: '1', type: 'kubernetes', status: 'running' },
          { id: '2', type: 'aws-lambda', status: 'stopped' },
          { id: '3', type: 'cloud-run', status: 'running' },
        ],
        total: 3,
      });

      mockDeploymentService.getDeploymentMetrics.mockResolvedValue({
        requests: 100,
        errors: 5,
        latency: 150,
      });

      await metricsController.getSystemMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalDeployments: 3,
          activeDeployments: 2,
          deploymentsByType: {
            kubernetes: 1,
            'aws-lambda': 1,
            'cloud-run': 1,
          },
          totalRequests: expect.any(Number),
          totalErrors: expect.any(Number),
          averageLatency: expect.any(Number),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockDeploymentService.listDeployments.mockRejectedValue(
        new Error('Service error')
      );

      await metricsController.getSystemMetrics(
        mockRequest as Request,
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

  describe('getDeploymentMetrics', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'test-deployment' };
    });

    it('should return metrics for a specific deployment', async () => {
      mockDeploymentService.getDeployment.mockResolvedValue({
        id: 'test-deployment',
        type: 'kubernetes',
        status: 'running',
      });

      mockDeploymentService.getDeploymentMetrics.mockResolvedValue({
        requests: 100,
        errors: 5,
        latency: 150,
      });

      await metricsController.getDeploymentMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requests: 100,
          errors: 5,
          latency: 150,
        })
      );
    });

    it('should handle non-existent deployment', async () => {
      mockDeploymentService.getDeployment.mockResolvedValue(null);

      await metricsController.getDeploymentMetrics(
        mockRequest as Request,
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

  describe('getDeploymentMetricsHistory', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'test-deployment' };
      mockRequest.query = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-02T00:00:00Z',
      };
    });

    it('should return historical metrics', async () => {
      mockDeploymentService.getDeployment.mockResolvedValue({
        id: 'test-deployment',
        type: 'kubernetes',
        status: 'running',
      });

      mockDeploymentService.getDeploymentMetrics.mockResolvedValue({
        history: [
          {
            timestamp: '2024-01-01T01:00:00Z',
            requests: 50,
            errors: 2,
            latency: 120,
          },
          {
            timestamp: '2024-01-01T02:00:00Z',
            requests: 60,
            errors: 3,
            latency: 130,
          },
        ],
      });

      await metricsController.getDeploymentMetricsHistory(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          history: expect.any(Array),
        })
      );
    });

    it('should validate time range parameters', async () => {
      mockRequest.query = {
        start: 'invalid-date',
        end: '2024-01-02T00:00:00Z',
      };

      await metricsController.getDeploymentMetricsHistory(
        mockRequest as Request,
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

  describe('getMetricsByType', () => {
    it('should return aggregated metrics by deployment type', async () => {
      mockDeploymentService.listDeployments.mockResolvedValue({
        deployments: [
          { id: '1', type: 'kubernetes', status: 'running' },
          { id: '2', type: 'kubernetes', status: 'running' },
          { id: '3', type: 'aws-lambda', status: 'running' },
        ],
        total: 3,
      });

      mockDeploymentService.getDeploymentMetrics.mockResolvedValue({
        requests: 100,
        errors: 5,
        latency: 150,
      });

      await metricsController.getMetricsByType(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          kubernetes: expect.any(Object),
          'aws-lambda': expect.any(Object),
        })
      );
    });
  });

  describe('getCostMetrics', () => {
    beforeEach(() => {
      mockRequest.query = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-02T00:00:00Z',
      };
    });

    it('should return cost metrics for all deployments', async () => {
      mockDeploymentService.listDeployments.mockResolvedValue({
        deployments: [
          { id: '1', type: 'kubernetes', status: 'running' },
          { id: '2', type: 'aws-lambda', status: 'running' },
        ],
        total: 2,
      });

      mockDeploymentService.getDeploymentMetrics.mockResolvedValue({
        cost: 50,
        resources: {
          cpu: '100m',
          memory: '256Mi',
        },
      });

      await metricsController.getCostMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalCost: expect.any(Number),
          costByType: expect.any(Object),
          costByDeployment: expect.any(Object),
        })
      );
    });

    it('should handle invalid date range', async () => {
      mockRequest.query = {
        start: 'invalid-date',
        end: '2024-01-02T00:00:00Z',
      };

      await metricsController.getCostMetrics(
        mockRequest as Request,
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
}); 