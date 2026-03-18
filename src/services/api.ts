import API_CONFIG from '../config/api';

class ApiService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
  }
  
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // ============ GitHub API ============
  
  async getGitHubRepos() {
    return this.request<any>(API_CONFIG.endpoints.github.repos);
  }
  
  async getGitHubRepo(owner: string, repo: string) {
    return this.request<any>(API_CONFIG.endpoints.github.repo(owner, repo));
  }
  
  async cloneGitHubRepo(owner: string, repo: string, branch?: string) {
    return this.request<any>(API_CONFIG.endpoints.github.clone, {
      method: 'POST',
      body: JSON.stringify({ owner, repo, branch }),
    });
  }
  
  async getDockerfile(owner: string, repo: string) {
    return this.request<any>(API_CONFIG.endpoints.github.dockerfile(owner, repo));
  }
  
  // ============ Deploy API ============
  
  async getDeployments() {
    return this.request<any>(API_CONFIG.endpoints.deploy.list);
  }
  
  async getDeploymentStatus(id: string) {
    return this.request<any>(API_CONFIG.endpoints.deploy.status(id));
  }
  
  async createDeployment(data: {
    owner: string;
    repo: string;
    branch?: string;
    imageName?: string;
    imageTag?: string;
    containerName?: string;
    containerPort?: number;
    hostPort?: number;
    envVars?: Record<string, string>;
  }) {
    return this.request<any>(API_CONFIG.endpoints.deploy.create, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  // ============ Server API ============
  
  async getServerHealth() {
    return this.request<any>(API_CONFIG.endpoints.server.health);
  }
  
  async getServerStatus() {
    return this.request<any>(API_CONFIG.endpoints.server.status);
  }
  
  async getServerContainers() {
    return this.request<any>(API_CONFIG.endpoints.server.containers);
  }
  
  async getServerMetrics() {
    return this.request<any>(API_CONFIG.endpoints.server.metrics);
  }
  
  async controlContainer(action: string, containerName: string) {
    return this.request<any>(`/api/server/container/${action}/${containerName}`, {
      method: 'POST',
    });
  }
  
  // ============ Docker API ============
  
  async getDockerImages() {
    return this.request<any>(API_CONFIG.endpoints.docker.images);
  }
  
  async getDockerContainers() {
    return this.request<any>(API_CONFIG.endpoints.docker.containers);
  }
  
  async getDockerInfo() {
    return this.request<any>(API_CONFIG.endpoints.docker.info);
  }
  
  // ============ Health Check ============
  
  async healthCheck() {
    return this.request<any>(API_CONFIG.endpoints.health);
  }
  
  // ============ WebSocket ============
  
  connectWebSocket(deploymentId: string): WebSocket {
    const wsUrl = `${API_CONFIG.wsUrl}/ws?deploymentId=${deploymentId}`;
    return new WebSocket(wsUrl);
  }
}

export const apiService = new ApiService();
export default apiService;
