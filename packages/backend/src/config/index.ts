/**
 * CI/CD 部署配置
 * 
 * 包含远程服务器配置和GitHub配置
 */

export interface ServerConfig {
  host: string;
  port: number;
  username: string;
  authType: 'key' | 'password';
  privateKeyPath?: string;
  password?: string;
}

export interface GitHubConfig {
  username: string;
  token: string;
  // 本地代码缓存目录
  clonePath: string;
}

export interface DeploymentConfig {
  projectPath: string;
  dockerfileName: string;
  buildContext: string;
  imageName: string;
  imageTag: string;
  containerName: string;
  containerPort: number;
  hostPort: number;
  envVars?: Record<string, string>;
  volumes?: Array<{
    hostPath: string;
    containerPath: string;
    readOnly?: boolean;
  }>;
}

export interface AppConfig {
  remote: ServerConfig;
  github: GitHubConfig;
  deployment: DeploymentConfig;
}

const config: AppConfig = {
  // 远程部署服务器配置
  remote: {
    host: process.env.REMOTE_HOST || '162.14.200.36',
    port: parseInt(process.env.REMOTE_PORT || '22'),
    username: process.env.REMOTE_USER || 'baidan',
    authType: 'key',
    privateKeyPath: process.env.SSH_KEY_PATH || '/Users/a1234/.ssh/id_rsa',
  },
  
  // GitHub配置
  github: {
    username: process.env.GITHUB_USERNAME || 'pericross',
    token: process.env.GITHUB_TOKEN || '',
    clonePath: process.env.GITHUB_CLONE_PATH || '/tmp/cicd-repos',
  },
  
  // 部署配置
  deployment: {
    projectPath: process.env.PROJECT_PATH || '',
    dockerfileName: 'Dockerfile',
    buildContext: '.',
    imageName: process.env.IMAGE_NAME || 'myapp',
    imageTag: process.env.IMAGE_TAG || 'latest',
    containerName: process.env.CONTAINER_NAME || 'myapp',
    containerPort: parseInt(process.env.CONTAINER_PORT || '3000'),
    hostPort: parseInt(process.env.HOST_PORT || '3000'),
    envVars: {
      NODE_ENV: 'production',
    },
  },
};

export default config;
