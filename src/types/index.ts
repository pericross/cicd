// Server types
export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  privateKey?: string;
  labels: string[];
  status: 'online' | 'offline' | 'unknown';
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

// Application types
export interface Application {
  id: string;
  name: string;
  description?: string;
  repository?: string;
  dockerImage: string;
  dockerfilePath?: string;
  buildContext?: string;
  environment: Record<string, string>;
  ports: PortMapping[];
  volumes: VolumeMapping[];
  healthCheck?: HealthCheckConfig;
  deploymentStrategy: 'rolling' | 'blue-green' | 'canary';
  autoDeploy: boolean;
  rollbackOnFailure: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortMapping {
  containerPort: number;
  hostPort: number;
  protocol: 'tcp' | 'udp';
}

export interface VolumeMapping {
  containerPath: string;
  hostPath: string;
  readOnly?: boolean;
}

export interface HealthCheckConfig {
  path?: string;
  port?: number;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

// Deployment types
export interface Deployment {
  id: string;
  applicationId: string;
  serverIds: string[];
  version: string;
  imageTag: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolling-back';
  strategy: 'rolling' | 'blue-green' | 'canary';
  steps: DeploymentStep[];
  triggeredBy: string;
  startedAt?: string;
  completedAt?: string;
  logs: string[];
  error?: string;
}

export interface DeploymentStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt?: string;
  completedAt?: string;
  logs: string[];
  error?: string;
}

// Monitoring types
export interface MetricData {
  timestamp: string;
  value: number;
}

export interface ServerMetrics {
  serverId: string;
  cpu: MetricData[];
  memory: MetricData[];
  disk: MetricData[];
  network: MetricData[];
}

export interface ContainerStatus {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'restarting' | 'paused';
  health: 'healthy' | 'unhealthy' | 'unknown';
  cpuPercent: number;
  memoryPercent: number;
  created: string;
  ports: PortMapping[];
}

// Notification types
export interface Notification {
  id: string;
  type: 'deployment' | 'health' | 'metric' | 'system';
  level: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret?: string;
}

// Pipeline types
export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  steps: PipelineStep[];
  triggers: PipelineTrigger[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStep {
  id: string;
  name: string;
  type: 'build' | 'test' | 'deploy' | 'notify' | 'custom';
  config: Record<string, unknown>;
  order: number;
}

export interface PipelineTrigger {
  type: 'manual' | 'schedule' | 'webhook' | 'git';
  config: Record<string, unknown>;
}

// Activity types
export interface Activity {
  id: string;
  type: 'deployment' | 'server' | 'application' | 'pipeline' | 'system';
  action: string;
  description: string;
  entityId?: string;
  entityType?: string;
  userId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
