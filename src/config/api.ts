/**
 * CI/CD 平台 API 配置
 * 
 * 后端API地址配置
 */

// 后端API基础URL - 使用nginx代理的相对路径
const API_BASE_URL = '/cicd-api';

export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  wsUrl: API_BASE_URL.replace('http', 'ws'),
  
  // API Endpoints
  endpoints: {
    // GitHub
    github: {
      repos: '/api/github/repos',
      repo: (owner: string, repo: string) => `/api/github/repos/${owner}/${repo}`,
      clone: '/api/github/clone',
      dockerfile: (owner: string, repo: string) => `/api/github/dockerfile/${owner}/${repo}`,
    },
    
    // Deploy
    deploy: {
      list: '/api/deploy',
      create: '/api/deploy/github',
      status: (id: string) => `/api/deploy/${id}`,
    },
    
    // Server
    server: {
      status: '/api/server/status',
      health: '/api/server/health',
      containers: '/api/server/containers',
      metrics: '/api/server/metrics',
    },
    
    // Docker
    docker: {
      images: '/api/docker/images',
      containers: '/api/docker/containers',
      info: '/api/docker/info',
    },
    
    // Health
    health: '/api/health',
  }
};

export default API_CONFIG;
