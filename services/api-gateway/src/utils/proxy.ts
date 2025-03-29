import { Router } from 'express';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from './logger';

/**
 * Create a proxy middleware to forward requests to a service
 */
export function createServiceProxy(serviceUrl: string): Router {
  const router = Router();
  
  logger.info(`Creating proxy to service: ${serviceUrl}`);
  
  // Create proxy middleware
  const proxy = createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/[^/]+': '' }, // Remove /api/service-name from path
    logLevel: 'warn',
    onError: (_err, _req, res) => {
      logger.error(`Proxy error for ${serviceUrl}`);
      res.status(503).json({
        success: false,
        error: 'Service unavailable'
      });
    }
  });
  
  // Use proxy for all routes
  router.use('/', proxy);
  
  return router;
}

/**
 * Create a proxy to forward requests to deployed agents
 */
export function createAgentProxy(): Router {
  const router = Router();
  
  router.all('/:deploymentId/*', async (req, res) => {
    try {
      const { deploymentId } = req.params;
      
      // Get deployment details from the deployment service
      const deploymentResponse = await axios.get(
        `${process.env.DEPLOYMENT_SERVICE_URL || 'http://deployment-service:3003'}/api/deployments/${deploymentId}`
      );
      
      if (deploymentResponse.status !== 200 || !deploymentResponse.data?.deployment) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
      }
      
      const deployment = deploymentResponse.data.deployment;
      
      // Check if agent is running
      if (deployment.status !== 'running') {
        res.status(503).json({
          success: false,
          error: `Agent is not running (status: ${deployment.status})`
        });
        return;
      }
      
      // Get agent endpoint
      const agentEndpoint = deployment.endpoint;
      
      if (!agentEndpoint) {
        res.status(500).json({
          success: false,
          error: 'Agent endpoint not configured'
        });
        return;
      }
      
      // Forward request to agent
      const path = req.originalUrl.split(`/agents/${deploymentId}`)[1] || '/';
      
      const requestConfig: AxiosRequestConfig = {
        method: req.method,
        url: `${agentEndpoint}${path}`,
        headers: {
          ...req.headers,
          host: new URL(agentEndpoint).host,
          'x-forwarded-for': req.ip,
          'x-agent-id': deployment.agentId,
          'x-deployment-id': deploymentId
        },
        data: req.method !== 'GET' ? req.body : undefined,
        responseType: 'stream' as const
      };
      
      if (requestConfig.headers) {
        delete requestConfig.headers.host;
      }
      
      // Forward the agent response back to the client
      const agentResponse = await axios(requestConfig);
      
      res.status(agentResponse.status);
      
      // Copy headers from agent response
      Object.entries(agentResponse.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      agentResponse.data.pipe(res);
    } catch (error: unknown) {
      logger.error('Error proxying request to agent:', error);
      
      // If it's an axios error with a response, forward the status code and message
      if (error instanceof AxiosError && error.response) {
        res.status(error.response.status).json({
          success: false,
          error: error.response.data?.error || 'Error communicating with agent'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });
  
  return router;
}
