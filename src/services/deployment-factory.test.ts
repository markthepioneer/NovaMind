import { DeploymentFactory } from './deployment-factory.service';
import { KubernetesService } from './kubernetes.service';
import { AWSLambdaService } from './aws-lambda.service';
import { CloudRunService } from './cloud-run.service';
import { ValidationError } from '@/utils/error-handling';

jest.mock('./kubernetes.service');
jest.mock('./aws-lambda.service');
jest.mock('./cloud-run.service');

describe('DeploymentFactory', () => {
  let factory: DeploymentFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    factory = new DeploymentFactory();
  });

  describe('getService', () => {
    it('should return Kubernetes service for kubernetes type', () => {
      const service = factory.getService('kubernetes');
      expect(service).toBeInstanceOf(KubernetesService);
    });

    it('should return AWS Lambda service for aws-lambda type', () => {
      const service = factory.getService('aws-lambda');
      expect(service).toBeInstanceOf(AWSLambdaService);
    });

    it('should return Cloud Run service for cloud-run type', () => {
      const service = factory.getService('cloud-run');
      expect(service).toBeInstanceOf(CloudRunService);
    });

    it('should throw ValidationError for unsupported type', () => {
      expect(() => factory.getService('unsupported')).toThrow(ValidationError);
    });
  });

  describe('deployAgent', () => {
    const mockDeployment = {
      _id: 'test-id',
      name: 'test-deployment',
      type: 'kubernetes',
      status: 'pending',
      config: {
        namespace: 'default',
        image: 'test-image',
        replicas: 1
      }
    };

    it('should successfully deploy to Kubernetes', async () => {
      const service = factory.getService('kubernetes');
      await factory.deployAgent(mockDeployment);
      expect(service.deploy).toHaveBeenCalledWith(mockDeployment);
    });

    it('should handle deployment errors', async () => {
      const error = new Error('Deployment failed');
      const service = factory.getService('kubernetes');
      (service.deploy as jest.Mock).mockRejectedValue(error);

      await expect(factory.deployAgent(mockDeployment)).rejects.toThrow(error);
    });
  });

  describe('getDeploymentStatus', () => {
    const mockDeployment = {
      _id: 'test-id',
      name: 'test-deployment',
      type: 'kubernetes',
      status: 'pending',
      config: {
        namespace: 'default',
        image: 'test-image',
        replicas: 1
      }
    };

    it('should return correct status from provider', async () => {
      const service = factory.getService('kubernetes');
      (service.getStatus as jest.Mock).mockResolvedValue('running');

      const status = await factory.getDeploymentStatus(mockDeployment);
      expect(status).toBe('running');
      expect(service.getStatus).toHaveBeenCalledWith(mockDeployment);
    });

    it('should handle status check errors', async () => {
      const service = factory.getService('kubernetes');
      (service.getStatus as jest.Mock).mockRejectedValue(new Error('Status check failed'));

      const status = await factory.getDeploymentStatus(mockDeployment);
      expect(status).toBe('failed');
    });
  });
}); 