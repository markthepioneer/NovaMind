import { Request, Response } from 'express';
import { authorize } from '../../middleware/authorization.middleware';
import { AuthorizationError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger');

describe('Authorization Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      user: {
        userId: '123',
        roles: ['user'],
      },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should authorize user with required role', async () => {
    const middleware = authorize(['user']);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith();
  });

  it('should authorize user with admin role', async () => {
    mockRequest.user = {
      userId: '123',
      roles: ['admin'],
    };
    const middleware = authorize(['user']);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith();
  });

  it('should reject user without required role', async () => {
    const middleware = authorize(['admin']);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
      expect.any(AuthorizationError)
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should reject request without user object', async () => {
    mockRequest.user = undefined;
    const middleware = authorize(['user']);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
      expect.any(AuthorizationError)
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should authorize user with any of the required roles', async () => {
    mockRequest.user = {
      userId: '123',
      roles: ['editor'],
    };
    const middleware = authorize(['admin', 'editor']);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith();
  });

  it('should reject user with no roles', async () => {
    mockRequest.user = {
      userId: '123',
      roles: [],
    };
    const middleware = authorize(['user']);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
      expect.any(AuthorizationError)
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should handle multiple required roles', async () => {
    mockRequest.user = {
      userId: '123',
      roles: ['user', 'editor'],
    };
    const middleware = authorize(['editor', 'publisher']);

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith();
  });
}); 