export type DeploymentStatus = 'active' | 'inactive' | 'error';

export interface DeploymentConfig {
  image?: string;
  code?: string;
  cpu: string;
  memory: string;
  environment: Record<string, string | number | boolean>;
  minInstances?: number;
  maxInstances?: number;
}

export interface Deployment {
  id: string;
  name: string;
  description: string;
  type: 'kubernetes' | 'aws-lambda' | 'cloud-run';
  status: DeploymentStatus;
  config: DeploymentConfig;
  createdAt: Date;
  updatedAt: Date;
} 