import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { AuthenticationError, AuthorizationError } from '../../utils/error-handler';
import { appConfig } from '../../config';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger');

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should throw AuthenticationError when no token is provided', async () => {
      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should throw AuthenticationError when invalid token is provided', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should call next() with user data when valid token is provided', async () => {
      const userData = {
        userId: '123',
        email: 'test@example.com',
        roles: ['user'],
      };

      const token = jwt.sign(userData, process.env.JWT_SECRET as string);
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toEqual(expect.objectContaining({
        id: userData.userId,
        email: userData.email,
        roles: userData.roles,
      }));
    });

    it('should reject expired token', async () => {
      const token = jwt.sign(
        { userId: '123' },
        process.env.JWT_SECRET as string,
        { expiresIn: '0s' }
      );
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should reject token with invalid signature', async () => {
      const token = jwt.sign(
        { userId: '123' },
        'different-secret'
      );
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle malformed JWT token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token.here',
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    beforeEach(() => {
      mockRequest = {
        user: {
          id: '123',
          email: 'test@example.com',
          roles: ['user'],
        },
      };
    });

    it('should call next() when user has required role', async () => {
      const authorizeMiddleware = authorize(['user']);

      await authorizeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should throw AuthorizationError when user lacks required role', async () => {
      const authorizeMiddleware = authorize(['admin']);

      await authorizeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AuthorizationError)
      );
    });

    it('should handle multiple roles correctly', async () => {
      mockRequest.user!.roles = ['user', 'editor'];
      const authorizeMiddleware = authorize(['admin', 'editor']);

      await authorizeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
    });
  });
}); 