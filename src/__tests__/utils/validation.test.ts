import { Request, Response } from 'express';
import {
  createDeploymentSchema,
  updateDeploymentSchema,
  deploymentQuerySchema,
  metricsQuerySchema,
  costMetricsQuerySchema,
  loginSchema,
  registerSchema,
  validateRequest,
} from '../../utils/validation';

describe('Validation Schemas', () => {
  describe('createDeploymentSchema', () => {
    it('should validate valid kubernetes deployment', () => {
      const data = {
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
        image: 'https://registry.example.com/image:latest',
      };

      const result = createDeploymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate valid lambda deployment', () => {
      const data = {
        name: 'test-function',
        type: 'aws-lambda',
        resources: {
          cpu: '128m',
          memory: '512Mi',
        },
        environment: {
          STAGE: 'prod',
        },
        code: {
          runtime: 'nodejs18.x',
          handler: 'index.handler',
          source: 'function.zip',
        },
      };

      const result = createDeploymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject kubernetes deployment without image', () => {
      const data = {
        name: 'test-deployment',
        type: 'kubernetes',
        resources: {
          cpu: '100m',
          memory: '256Mi',
        },
        environment: {},
      };

      const result = createDeploymentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject lambda deployment without code', () => {
      const data = {
        name: 'test-function',
        type: 'aws-lambda',
        resources: {
          cpu: '128m',
          memory: '512Mi',
        },
        environment: {},
      };

      const result = createDeploymentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('deploymentQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const data = {
        type: 'kubernetes',
        status: 'running',
        page: '1',
        limit: '10',
        sort: 'created_at',
        order: 'desc',
      };

      const result = deploymentQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should provide default values for pagination', () => {
      const data = {
        type: 'aws-lambda',
      };

      const result = deploymentQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });
  });

  describe('validateRequest middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.Mock;

    beforeEach(() => {
      mockRequest = {
        body: {},
        query: {},
        params: {},
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      nextFunction = jest.fn();
    });

    it('should pass validation and attach validated data', async () => {
      const schema = loginSchema;
      const middleware = validateRequest(schema);
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.validatedData).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const schema = registerSchema;
      const middleware = validateRequest(schema);
      mockRequest.body = {
        email: 'invalid-email',
        password: '123',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
    });
  });
}); 