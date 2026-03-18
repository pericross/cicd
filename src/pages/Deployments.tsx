import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Label, Select } from '@/components/ui';
import { Modal, Tabs, TabList, Tab, TabContent, Progress } from '@/components/ui';
import { cn, formatDate, formatRelativeTime, getStatusColor, getStatusBgColor } from '@/utils';
import {
  Rocket,
  Plus,
  Search,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Server,
  GitBranch,
  Container,
  Terminal,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import type { Deployment, DeploymentStep } from '@/types';

export const Deployments: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { deployments, applications, servers, addDeployment, updateDeployment } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // New deployment form
  const [newDeployment, setNewDeployment] = useState({
    applicationId: '',
    serverIds: [] as string[],
    version: '',
    imageTag: '',
    strategy: 'rolling' as 'rolling' | 'blue-green' | 'canary',
  });

  const filteredDeployments = deployments.filter((deploy) => {
    const app = applications.find((a) => a.id === deploy.applicationId);
    const matchSearch = !searchQuery || 
      app?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deploy.version.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || deploy.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleNewDeployment = () => {
    const app = applications.find((a) => a.id === newDeployment.applicationId);
    setNewDeployment({
      applicationId: app?.id || '',
      serverIds: [],
      version: '',
      imageTag: app?.dockerImage.split(':')[0] + ':' || '',
      strategy: app?.deploymentStrategy || 'rolling',
    });
    setShowDeployModal(true);
  };

  const handleStartDeployment = () => {
    if (!newDeployment.applicationId || newDeployment.serverIds.length === 0) {
      alert('请选择应用和服务器');
      return;
    }

    addDeployment({
      applicationId: newDeployment.applicationId,
      serverIds: newDeployment.serverIds,
      version: newDeployment.version,
      imageTag: newDeployment.imageTag,
      status: 'running',
      strategy: newDeployment.strategy,
      steps: [
        { name: '构建', status: 'pending', logs: [] },
        { name: '传输', status: 'pending', logs: [] },
        { name: '部署', status: 'pending', logs: [] },
        { name: '健康检查', status: 'pending', logs: [] },
      ],
      triggeredBy: 'user',
    });

    setShowDeployModal(false);
    setNewDeployment({ applicationId: '', serverIds: [], version: '', imageTag: '', strategy: 'rolling' });

    // Simulate deployment progress
    simulateDeployment();
  };

  const simulateDeployment = () => {
    // This would normally be handled by the backend
    // Simulating deployment progress for demo
    setTimeout(() => {
      const runningDeploy = deployments.find((d) => d.status === 'running');
      if (runningDeploy) {
        updateDeployment(runningDeploy.id, {
          status: 'success',
          completedAt: new Date().toISOString(),
          steps: runningDeploy.steps.map((step, i) => ({
            ...step,
            status: 'success',
            completedAt: new Date().toISOString(),
          })),
        });
      }
    }, 5000);
  };

  const handleRollback = (deploymentId: string) => {
    if (confirm('确定要回滚到这个版本吗？')) {
      const deploy = deployments.find((d) => d.id === deploymentId);
      if (!deploy) return;

      addDeployment({
        applicationId: deploy.applicationId,
        serverIds: deploy.serverIds,
        version: `rollback-${deploy.version}`,
        imageTag: deploy.imageTag,
        status: 'running',
        strategy: deploy.strategy,
        steps: [
          { name: '回滚', status: 'running', logs: ['Starting rollback...'] },
        ],
        triggeredBy: 'user',
      });

      setShowDetailModal(false);
    }
  };

  const toggleStep = (stepName: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepName)) {
      newExpanded.delete(stepName);
    } else {
      newExpanded.add(stepName);
    }
    setExpandedSteps(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">成功</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
      case 'running':
        return <Badge variant="warning">运行中</Badge>;
      case 'pending':
        return <Badge variant="secondary">等待中</Badge>;
      case 'rolling-back':
        return <Badge variant="warning">回滚中</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStepIcon = (step: DeploymentStep) => {
    switch (step.status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">部署管理</h1>
          <p className="mt-1 text-muted-foreground">管理应用的部署和回滚</p>
        </div>
        <Button onClick={handleNewDeployment}>
          <Plus className="mr-2 h-4 w-4" />
          新建部署
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索部署..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">全部状态</option>
          <option value="running">运行中</option>
          <option value="success">成功</option>
          <option value="failed">失败</option>
          <option value="pending">等待中</option>
        </select>
      </div>

      {/* Deployments List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredDeployments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Rocket className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">暂无部署记录</p>
              </div>
            ) : (
              filteredDeployments.map((deploy) => {
                const app = applications.find((a) => a.id === deploy.applicationId);
                const deployServers = servers.filter((s) => deploy.serverIds.includes(s.id));
                
                return (
                  <div
                    key={deploy.id}
                    className="cursor-pointer p-4 transition-colors hover:bg-accent"
                    onClick={() => {
                      setSelectedDeployment(deploy);
                      setShowDetailModal(true);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          "rounded-lg p-2",
                          deploy.status === 'success' ? 'bg-green-500/10' :
                          deploy.status === 'failed' ? 'bg-red-500/10' :
                          deploy.status === 'running' ? 'bg-yellow-500/10' :
                          'bg-gray-500/10'
                        )}>
                          {deploy.status === 'running' ? (
                            <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                          ) : deploy.status === 'success' ? (
                            <Rocket className="h-5 w-5 text-green-500" />
                          ) : deploy.status === 'failed' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{app?.name || '未知应用'}</span>
                            <span className="text-sm text-muted-foreground">v{deploy.version}</span>
                          </div>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <GitBranch className="mr-1 h-3 w-3" />
                              {deploy.imageTag}
                            </span>
                            <span className="flex items-center">
                              <Server className="mr-1 h-3 w-3" />
                              {deployServers.map((s) => s.name).join(', ')}
                            </span>
                            <span>
                              {deploy.startedAt ? formatRelativeTime(deploy.startedAt) : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {getStatusBadge(deploy.status)}
                        {deploy.status === 'success' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRollback(deploy.id);
                            }}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            回滚
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    {deploy.status === 'running' && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                          <span>部署进度</span>
                          <span>{Math.round((deploy.steps.filter((s) => s.status === 'success').length / deploy.steps.length) * 100)}%</span>
                        </div>
                        <Progress value={(deploy.steps.filter((s) => s.status === 'success').length / deploy.steps.length) * 100} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* New Deployment Modal */}
      <Modal
        open={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        title="新建部署"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>选择应用</Label>
            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newDeployment.applicationId}
              onChange={(e) => {
                const app = applications.find((a) => a.id === e.target.value);
                setNewDeployment({
                  ...newDeployment,
                  applicationId: e.target.value,
                  imageTag: app?.dockerImage || '',
                  strategy: app?.deploymentStrategy || 'rolling',
                });
              }}
            >
              <option value="">选择应用...</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>{app.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>选择服务器</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
              {servers.filter((s) => s.status === 'online').map((server) => (
                <label key={server.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDeployment.serverIds.includes(server.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewDeployment({
                          ...newDeployment,
                          serverIds: [...newDeployment.serverIds, server.id],
                        });
                      } else {
                        setNewDeployment({
                          ...newDeployment,
                          serverIds: newDeployment.serverIds.filter((id) => id !== server.id),
                        });
                      }
                    }}
                    className="rounded border-input"
                  />
                  <span className="text-sm">{server.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>版本号</Label>
              <Input
                value={newDeployment.version}
                onChange={(e) => setNewDeployment({ ...newDeployment, version: e.target.value })}
                placeholder="v1.0.0"
              />
            </div>
            <div className="space-y-2">
              <Label>镜像标签</Label>
              <Input
                value={newDeployment.imageTag}
                onChange={(e) => setNewDeployment({ ...newDeployment, imageTag: e.target.value })}
                placeholder="myapp:latest"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>部署策略</Label>
            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newDeployment.strategy}
              onChange={(e) => setNewDeployment({ ...newDeployment, strategy: e.target.value as any })}
            >
              <option value="rolling">滚动更新</option>
              <option value="blue-green">蓝绿部署</option>
              <option value="canary">金丝雀发布</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeployModal(false)}>
              取消
            </Button>
            <Button onClick={handleStartDeployment}>
              <Play className="mr-2 h-4 w-4" />
              开始部署
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deployment Detail Modal */}
      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="部署详情"
        className="max-w-3xl"
      >
        {selectedDeployment && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {applications.find((a) => a.id === selectedDeployment.applicationId)?.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  版本: {selectedDeployment.version} | 镜像: {selectedDeployment.imageTag}
                </p>
              </div>
              {getStatusBadge(selectedDeployment.status)}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">部署策略</span>
                <p className="font-medium">
                  {selectedDeployment.strategy === 'rolling' ? '滚动更新' :
                   selectedDeployment.strategy === 'blue-green' ? '蓝绿部署' : '金丝雀'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">触发者</span>
                <p className="font-medium">{selectedDeployment.triggeredBy}</p>
              </div>
              <div>
                <span className="text-muted-foreground">耗时</span>
                <p className="font-medium">
                  {selectedDeployment.startedAt && selectedDeployment.completedAt
                    ? Math.round((new Date(selectedDeployment.completedAt).getTime() - new Date(selectedDeployment.startedAt).getTime()) / 60000) + ' 分钟'
                    : '-'}
                </p>
              </div>
            </div>

            {/* Steps */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">部署步骤</h4>
              <div className="space-y-2">
                {selectedDeployment.steps.map((step, index) => (
                  <div key={index} className="rounded-lg border">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer"
                      onClick={() => toggleStep(step.name)}
                    >
                      <div className="flex items-center space-x-3">
                        {getStepIcon(step)}
                        <span className="font-medium">{step.name}</span>
                        {step.error && (
                          <span className="text-sm text-red-500">{step.error}</span>
                        )}
                      </div>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        expandedSteps.has(step.name) && "rotate-180"
                      )} />
                    </div>
                    {expandedSteps.has(step.name) && step.logs.length > 0 && (
                      <div className="border-t p-3 bg-muted/30">
                        <div className="font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
                          {step.logs.map((log, i) => (
                            <p key={i} className="text-muted-foreground">{log}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Error Info */}
            {selectedDeployment.error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-500">部署失败</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{selectedDeployment.error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                关闭
              </Button>
              {selectedDeployment.status === 'success' && (
                <Button onClick={() => handleRollback(selectedDeployment.id)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  回滚到此版本
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
