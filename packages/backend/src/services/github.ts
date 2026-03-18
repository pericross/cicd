import * as https from 'https';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  language: string;
  updated_at: string;
}

export interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

/**
 * GitHub API 服务
 */
export class GitHubService {
  private username: string;
  private token: string;
  private clonePath: string;
  
  constructor() {
    this.username = config.github.username;
    this.token = config.github.token;
    this.clonePath = config.github.clonePath;
    
    // 确保克隆目录存在
    if (!fs.existsSync(this.clonePath)) {
      fs.mkdirSync(this.clonePath, { recursive: true });
    }
  }
  
  /**
   * 发起GitHub API请求
   */
  private async apiRequest(endpoint: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = `https://api.github.com${endpoint}`;
      
      const options = {
        headers: {
          'User-Agent': 'CI/CD-Platform',
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${this.token}`
        }
      };
      
      https.get(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse GitHub response'));
          }
        });
      }).on('error', reject);
    });
  }
  
  /**
   * 获取用户的所有仓库
   */
  async getRepositories(): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const data: any = await this.apiRequest(`/user/repos?page=${page}&per_page=100&sort=updated`);
      
      if (data.length === 0 || Array.isArray(data) === false) {
        hasMore = false;
      } else {
        repos.push(...data);
        page++;
        
        // 最多获取500个仓库
        if (repos.length >= 500) {
          hasMore = false;
        }
      }
    }
    
    return repos;
  }
  
  /**
   * 获取特定仓库的详细信息
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
    return await this.apiRequest(`/repos/${owner}/${repo}`);
  }
  
  /**
   * 获取仓库的文件结构
   */
  async getRepositoryContents(owner: string, repo: string, path: string = ''): Promise<GitHubFile[]> {
    const endpoint = path ? `/repos/${owner}/${repo}/contents/${path}` : `/repos/${owner}/${repo}/contents`;
    return await this.apiRequest(endpoint);
  }
  
  /**
   * 检查仓库是否包含Dockerfile
   */
  async hasDockerfile(owner: string, repo: string): Promise<boolean> {
    try {
      const contents = await this.getRepositoryContents(owner, repo);
      return contents.some((f: any) => f.name.toLowerCase() === 'dockerfile');
    } catch {
      return false;
    }
  }
  
  /**
   * 克隆或更新仓库
   */
  async cloneOrPull(owner: string, repo: string, branch: string = 'main'): Promise<string> {
    const repoPath = path.join(this.clonePath, `${owner}-${repo}`);
    const repoUrl = `https://${this.token}@github.com/${owner}/${repo}.git`;
    
    console.log(`📦 准备克隆/更新仓库: ${owner}/${repo}`);
    
    if (fs.existsSync(repoPath)) {
      // 如果已存在，执行git pull
      console.log(`🔄 仓库已存在，执行git pull...`);
      try {
        execSync('git pull', { cwd: repoPath, stdio: 'inherit' });
      } catch (e) {
        // 如果pull失败，尝试重新克隆
        console.log('⚠️ git pull失败，尝试重新克隆...');
        execSync(`rm -rf "${repoPath}"`);
        execSync(`git clone -b ${branch} ${repoUrl} "${repoPath}"`, { stdio: 'inherit' });
      }
    } else {
      // 克隆仓库
      console.log(`📥 克隆仓库...`);
      execSync(`git clone -b ${branch} ${repoUrl} "${repoPath}"`, { stdio: 'inherit' });
    }
    
    return repoPath;
  }
  
  /**
   * 获取Dockerfile内容
   */
  async getDockerfileContent(owner: string, repo: string): Promise<string> {
    const data: any = await this.apiRequest(`/repos/${owner}/${repo}/contents/Dockerfile`);
    if (data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    throw new Error('Dockerfile not found');
  }
  
  /**
   * 清理本地缓存的仓库
   */
  async cleanCache(): Promise<void> {
    if (fs.existsSync(this.clonePath)) {
      execSync(`rm -rf "${this.clonePath}/*"`);
      console.log('🗑️ 已清理本地仓库缓存');
    }
  }
}

export default GitHubService;
