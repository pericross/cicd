import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores';
import { apiService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Label, Select } from '@/components/ui';
import { Modal } from '@/components/ui';
import { cn, formatRelativeTime } from '@/utils';
import {
  Github,
  GitBranch,
  Container,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Server,
  Settings,
  ExternalLink,
  Search,
  Star,
} from 'lucide-react';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  url: string;
  default_branch: string;
  language: string;
  updated_at: string;
}

export const GitHubDeploy: React.FC = () => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<string>('');
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  
  // Deploy form
  const [deployConfig, setDeployConfig] = useState({
    branch: 'main',
    imageName: '',
    containerName: '',
    containerPort: 3000,
    hostPort: 3000,
    envVars: '',
  });

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      await apiService.healthCheck();
      setConnectionStatus('connected');
      loadRepos();
    } catch (e) {
      setConnectionStatus('disconnected');
    }
  };

  const loadRepos = async () => {
    setLoading(true);
    try {
      const response = await apiService.getGitHubRepos();
      setRepos(response.repos || []);
    } catch (e: any) {
      console.error('Failed to load repos:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedRepo) return;
    
    setDeploying(true);
    setDeployStatus('pending');
    setDeployLogs(['🚀 开始部署...']);
    
    try {
      // 解析环境变量
      const envVars: Record<string, string> = {};
      if (deployConfig.envVars) {
        deployConfig.envVars.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        });
      }

      // 创建部署
      const response = await apiService.createDeployment({
        owner: selectedRepo.full_name.split('/')[0],
        repo: selectedRepo.name,
        branch: deployConfig.branch,
        imageName: deployConfig.imageName || selectedRepo.name,
        containerName: deployConfig.containerName || selectedRepo.name,
        containerPort: deployConfig.containerPort,
        hostPort: deployConfig.hostPort,
        envVars,
      });

      if (response.success) {
        setDeployStatus('deploying');
        setDeployLogs(prev => [...prev, `📦 部署任务已创建: ${response.deploymentId}`]);
        
        // 连接WebSocket获取实时日志
        const ws = apiService.connectWebSocket(response.deploymentId);
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'log') {
            setDeployLogs(prev => [...prev, data.data]);
          } else if (data.type === 'status') {
            setDeployStatus(data.data);
            if (data.data === 'success') {
              setDeploying(false);
            } else if (data.data === 'failed') {
              setDeploying(false);
            }
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      }
    } catch (e: any) {
      setDeployStatus('failed');
      setDeployLogs(prev => [...prev, `❌ 部署失败: ${e.message}`]);
      setDeploying(false);
    }
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" /> 已连接</Badge>;
      case 'disconnected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> 未连接</Badge>;
      default:
        return <Badge variant="warning"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> 检查中</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">GitHub 部署</h1>
          <p className="mt-1 text-muted-foreground">从GitHub仓库一键部署应用到服务器</p>
        </div>
        <div className="flex items-center space-x-4">
          {getStatusBadge()}
          <Button variant="outline" onClick={loadRepos} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            刷新
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索仓库..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Repositories Grid */}
      {connectionStatus === 'disconnected' ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-red-500" />
            <p className="mt-4 text-lg font-medium">无法连接到后端服务</p>
            <p className="text-sm text-muted-foreground">请确保后端服务已启动</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRepos.map((repo) => (
            <Card
              key={repo.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedRepo?.id === repo.id && "ring-2 ring-primary"
              )}
              onClick={() => {
                setSelectedRepo(repo);
                setDeployConfig(prev => ({
                  ...prev,
                  imageName: repo.name,
                  containerName: repo.name,
                }));
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Github className="h-5 w-5" />
                    <CardTitle className="text-base">{repo.name}</CardTitle>
                  </div>
                  {repo.private && (
                    <Badge variant="secondary">私有</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {repo.description || '无描述'}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-3">
                    {repo.language && (
                      <span>{repo.language}</span>
                    )}
                    <span className="flex items-center">
                      <GitBranch className="mr-1 h-3 w-3" />
                      {repo.default_branch}
                    </span>
                  </div>
                  <span>{formatRelativeTime(repo.updated_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Deploy Modal */}
      <Modal
        open={!!selectedRepo && showDeployModal}
        onClose={() => {
          setShowDeployModal(false);
          setDeployStatus('');
          setDeployLogs([]);
        }}
        title={`部署 ${selectedRepo?.name}`}
        className="max-w-2xl"
      >
        {selectedRepo && (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center space-x-2">
                <Github className="h-5 w-5" />
                <span className="font-medium">{selectedRepo.full_name}</span>
              </div>
              {selectedRepo.description && (
                <p className="mt-1 text-sm text-muted-foreground">{selectedRepo.description}</p>
              )}
            </div>

            {/* Deploy Config */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>分支</Label>
                <Input
                  value={deployConfig.branch}
                  onChange={(e) => setDeployConfig({ ...deployConfig, branch: e.target.value })}
                  placeholder="main"
                />
              </div>
              <div className="space-y-2">
                <Label>镜像名称</Label>
                <Input
                  value={deployConfig.imageName}
                  onChange={(e) => setDeployConfig({ ...deployConfig, imageName: e.target.value })}
                  placeholder={selectedRepo.name}
                />
              </div>
              <div className="space-y-2">
                <Label>容器名称</Label>
                <Input
                  value={deployConfig.containerName}
                  onChange={(e) => setDeployConfig({ ...deployConfig, containerName: e.target.value })}
                  placeholder={selectedRepo.name}
                />
              </div>
              <div className="space-y-2">
                <Label>主机端口</Label>
                <Input
                  type="number"
                  value={deployConfig.hostPort}
                  onChange={(e) => setDeployConfig({ ...deployConfig, hostPort: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Environment Variables */}
            <div className="space-y-2">
              <Label>环境变量（每行一个，格式：KEY=value）</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder="NODE_ENV=production&#10;API_URL=https://api.example.com"
                value={deployConfig.envVars}
                onChange={(e) => setDeployConfig({ ...deployConfig, envVars: e.target.value })}
              />
            </div>

            {/* Deploy Button */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeployModal(false)}>
                取消
              </Button>
              <Button onClick={handleDeploy} disabled={deploying}>
{deploying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    部署中...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    开始部署
                  </>
                )}
              </Button>
            </div>

            {/* Deployment Logs */}
            {(deployLogs.length > 0 || deployStatus) && (
              <div className="rounded-lg border bg-black p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">部署日志</span>
                  {deployStatus === 'success' && (
                    <Badge variant="success">成功</Badge>
                  )}
                  {deployStatus === 'failed' && (
                    <Badge variant="destructive">失败</Badge>
                  )}
                  {deployStatus === 'deploying' && (
                    <Badge variant="warning">部署中</Badge>
                  )}
                </div>
                <pre className="h-48 overflow-auto text-xs text-green-400 font-mono whitespace-pre-wrap">
                  {deployLogs.join('')}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Floating Action Button */}
      {selectedRepo && !showDeployModal && (
        <div className="fixed bottom-6 right-6">
          <Button size="lg" onClick={() => setShowDeployModal(true)}>
            <Play className="mr-2 h-4 w-4" />
            部署 {selectedRepo.name}
          </Button>
        </div>
      )}
    </div>
  );
};
