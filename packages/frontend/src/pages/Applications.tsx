import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Label, Textarea, Switch } from '@/components/ui';
import { Modal, Tabs, TabList, Tab, TabContent } from '@/components/ui';
import { cn, formatRelativeTime } from '@/utils';
import {
  Package,
  Plus,
  Search,
  Container,
  Edit,
  Trash2,
  Rocket,
} from 'lucide-react';
import type { Application } from '@/types';

export const Applications: React.FC = () => {
  const navigate = useNavigate();
  const { applications, servers, addApplication, updateApplication, deleteApplication, deployments } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const filteredApps = applications.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddApp = () => {
    setEditingApp({
      id: '',
      name: '',
      description: '',
      repository: '',
      dockerImage: '',
      dockerfilePath: '',
      buildContext: '',
      environment: {},
      ports: [],
      volumes: [],
      healthCheck: undefined,
      deploymentStrategy: 'rolling',
      autoDeploy: false,
      rollbackOnFailure: true,
      createdAt: '',
      updatedAt: '',
    });
    setShowAddModal(true);
  };

  const handleEditApp = (app: Application) => {
    setEditingApp({ ...app });
    setShowAddModal(true);
  };

  const handleSaveApp = () => {
    if (!editingApp) return;
    
    if (editingApp.id) {
      updateApplication(editingApp.id, editingApp);
    } else {
      addApplication(editingApp);
    }
    setShowAddModal(false);
    setEditingApp(null);
  };

  const handleDeleteApp = (id: string) => {
    if (confirm('确定要删除这个应用吗？')) {
      deleteApplication(id);
    }
  };

  const getDeploymentCount = (appId: string) => {
    return deployments.filter((d) => d.applicationId === appId).length;
  };

  const getLatestDeployment = (appId: string) => {
    return deployments.find((d) => d.applicationId === appId);
  };

  const getStrategyName = (strategy: string) => {
    switch (strategy) {
      case 'rolling': return '滚动更新';
      case 'blue-green': return '蓝绿部署';
      case 'canary': return '金丝雀';
      default: return strategy;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">应用管理</h1>
          <p className="mt-1 text-muted-foreground">管理您的 Docker 应用</p>
        </div>
        <Button onClick={handleAddApp}>
          <Plus className="mr-2 h-4 w-4" />
          添加应用
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索应用..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Applications Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredApps.map((app) => {
          const latestDeploy = getLatestDeployment(app.id);
          const deployCount = getDeploymentCount(app.id);
          
          return (
            <Card
              key={app.id}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => setSelectedApp(app)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Container className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{app.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{app.dockerImage}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {app.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{app.description}</p>
                  )}
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {getStrategyName(app.deploymentStrategy)}
                    </Badge>
                    {app.autoDeploy && (
                      <Badge variant="success" className="text-xs">自动部署</Badge>
                    )}
                    {app.healthCheck && (
                      <Badge variant="secondary" className="text-xs">健康检查</Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Rocket className="mr-1 h-3 w-3" />
                      <span>{deployCount} 次部署</span>
                    </div>
                    {latestDeploy && (
                      <span>{formatRelativeTime(latestDeploy.startedAt || '')}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/deployments', { state: { appId: app.id } });
                      }}
                    >
                      <Rocket className="mr-1 h-3 w-3" />
                      部署
                    </Button>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditApp(app);
                        }}
                        className="rounded p-1 hover:bg-accent"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteApp(app.id);
                        }}
                        className="rounded p-1 hover:bg-accent"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Application Modal */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingApp(null);
        }}
        title={editingApp?.id ? '编辑应用' : '添加应用'}
        className="max-w-3xl"
      >
        {editingApp && (
          <div className="space-y-4">
            <Tabs defaultValue="basic">
              <TabList>
                <Tab value="basic">基本信息</Tab>
                <Tab value="docker">Docker 配置</Tab>
                <Tab value="health">健康检查</Tab>
                <Tab value="strategy">部署策略</Tab>
              </TabList>

              <TabContent value="basic">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>应用名称</Label>
                      <Input
                        value={editingApp.name}
                        onChange={(e) => setEditingApp({ ...editingApp, name: e.target.value })}
                        placeholder="Web 应用"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Docker 镜像</Label>
                      <Input
                        value={editingApp.dockerImage}
                        onChange={(e) => setEditingApp({ ...editingApp, dockerImage: e.target.value })}
                        placeholder="nginx:latest"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>描述</Label>
                    <Textarea
                      value={editingApp.description || ''}
                      onChange={(e) => setEditingApp({ ...editingApp, description: e.target.value })}
                      placeholder="应用描述..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>代码仓库</Label>
                    <Input
                      value={editingApp.repository || ''}
                      onChange={(e) => setEditingApp({ ...editingApp, repository: e.target.value })}
                      placeholder="https://github.com/user/repo"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Dockerfile 路径</Label>
                      <Input
                        value={editingApp.dockerfilePath || ''}
                        onChange={(e) => setEditingApp({ ...editingApp, dockerfilePath: e.target.value })}
                        placeholder="./Dockerfile"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>构建上下文</Label>
                      <Input
                        value={editingApp.buildContext || ''}
                        onChange={(e) => setEditingApp({ ...editingApp, buildContext: e.target.value })}
                        placeholder="."
                      />
                    </div>
                  </div>
                </div>
              </TabContent>

              <TabContent value="docker">
                <div className="space-y-4">
                  {/* Environment Variables */}
                  <div>
                    <Label className="mb-2 block">环境变量</Label>
                    <div className="space-y-2">
                      {Object.entries(editingApp.environment).map(([key, value], index) => (
                        <div key={index} className="flex space-x-2">
                          <Input
                            value={key}
                            onChange={(e) => {
                              const newEnv = { ...editingApp.environment };
const val = newEnv[key];
                              delete newEnv[key];
                              newEnv[e.target.value] = val;
                              setEditingApp({ ...editingApp, environment: newEnv });
                            }}
                            placeholder="KEY"
                            className="flex-1"
                          />
                          <Input
                            value={value}
                            onChange={(e) => {
                              setEditingApp({
                                ...editingApp,
                                environment: { ...editingApp.environment, [key]: e.target.value },
                              });
                            }}
                            placeholder="value"
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const newEnv = { ...editingApp.environment };
                              delete newEnv[key];
                              setEditingApp({ ...editingApp, environment: newEnv });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingApp({
                            ...editingApp,
                            environment: { ...editingApp.environment, '': '' },
                          });
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        添加变量
                      </Button>
                    </div>
                  </div>

                  {/* Ports */}
                  <div>
                    <Label className="mb-2 block">端口映射</Label>
                    <div className="space-y-2">
                      {editingApp.ports.map((port, index) => (
                        <div key={index} className="flex space-x-2">
                          <Input
                            type="number"
                            value={port.hostPort}
                            onChange={(e) => {
                              const newPorts = [...editingApp.ports];
                              newPorts[index] = { ...port, hostPort: parseInt(e.target.value) };
                              setEditingApp({ ...editingApp, ports: newPorts });
                            }}
                            placeholder="主机端口"
                            className="w-24"
                          />
                          <Input
                            type="number"
                            value={port.containerPort}
                            onChange={(e) => {
                              const newPorts = [...editingApp.ports];
                              newPorts[index] = { ...port, containerPort: parseInt(e.target.value) };
                              setEditingApp({ ...editingApp, ports: newPorts });
                            }}
                            placeholder="容器端口"
                            className="w-24"
                          />
                          <select
                            className="flex h-10 w-20 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={port.protocol}
                            onChange={(e) => {
                              const newPorts = [...editingApp.ports];
                              newPorts[index] = { ...port, protocol: e.target.value as 'tcp' | 'udp' };
                              setEditingApp({ ...editingApp, ports: newPorts });
                            }}
                          >
                            <option value="tcp">TCP</option>
                            <option value="udp">UDP</option>
                          </select>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const newPorts = editingApp.ports.filter((_, i) => i !== index);
                              setEditingApp({ ...editingApp, ports: newPorts });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingApp({
                            ...editingApp,
                            ports: [...editingApp.ports, { containerPort: 80, hostPort: 8080, protocol: 'tcp' }],
                          });
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        添加端口
                      </Button>
                    </div>
                  </div>

                  {/* Volumes */}
                  <div>
                    <Label className="mb-2 block">卷挂载</Label>
                    <div className="space-y-2">
                      {editingApp.volumes.map((volume, index) => (
                        <div key={index} className="flex space-x-2">
                          <Input
                            value={volume.hostPath}
                            onChange={(e) => {
                              const newVolumes = [...editingApp.volumes];
                              newVolumes[index] = { ...volume, hostPath: e.target.value };
                              setEditingApp({ ...editingApp, volumes: newVolumes });
                            }}
                            placeholder="主机路径"
                            className="flex-1"
                          />
                          <Input
                            value={volume.containerPath}
                            onChange={(e) => {
                              const newVolumes = [...editingApp.volumes];
                              newVolumes[index] = { ...volume, containerPath: e.target.value };
                              setEditingApp({ ...editingApp, volumes: newVolumes });
                            }}
                            placeholder="容器路径"
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const newVolumes = editingApp.volumes.filter((_, i) => i !== index);
                              setEditingApp({ ...editingApp, volumes: newVolumes });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingApp({
                            ...editingApp,
                            volumes: [...editingApp.volumes, { containerPath: '', hostPath: '', readOnly: false }],
                          });
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        添加卷
                      </Button>
                    </div>
                  </div>
                </div>
              </TabContent>

              <TabContent value="health">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>启用健康检查</Label>
                      <p className="text-sm text-muted-foreground">定期检查应用健康状态</p>
                    </div>
                    <Switch
                      checked={!!editingApp.healthCheck}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingApp({
                            ...editingApp,
                            healthCheck: {
                              path: '/health',
                              port: 80,
                              interval: 30,
                              timeout: 5,
                              healthyThreshold: 3,
                              unhealthyThreshold: 3,
                            },
                          });
                        } else {
                          setEditingApp({ ...editingApp, healthCheck: undefined });
                        }
                      }}
                    />
                  </div>

                  {editingApp.healthCheck && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>健康检查路径</Label>
                        <Input
                          value={editingApp.healthCheck.path || ''}
                          onChange={(e) => setEditingApp({
                            ...editingApp,
                            healthCheck: { ...editingApp.healthCheck!, path: e.target.value },
                          })}
                          placeholder="/health"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检查端口</Label>
                        <Input
                          type="number"
                          value={editingApp.healthCheck.port || 80}
                          onChange={(e) => setEditingApp({
                            ...editingApp,
                            healthCheck: { ...editingApp.healthCheck!, port: parseInt(e.target.value) },
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检查间隔 (秒)</Label>
                        <Input
                          type="number"
                          value={editingApp.healthCheck.interval}
                          onChange={(e) => setEditingApp({
                            ...editingApp,
                            healthCheck: { ...editingApp.healthCheck!, interval: parseInt(e.target.value) },
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>超时时间 (秒)</Label>
                        <Input
                          type="number"
                          value={editingApp.healthCheck.timeout}
                          onChange={(e) => setEditingApp({
                            ...editingApp,
                            healthCheck: { ...editingApp.healthCheck!, timeout: parseInt(e.target.value) },
                          })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </TabContent>

              <TabContent value="strategy">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>部署策略</Label>
                    <select
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={editingApp.deploymentStrategy}
                      onChange={(e) => setEditingApp({
                        ...editingApp,
                        deploymentStrategy: e.target.value as 'rolling' | 'blue-green' | 'canary',
                      })}
                    >
                      <option value="rolling">滚动更新 (Rolling)</option>
                      <option value="blue-green">蓝绿部署 (Blue-Green)</option>
                      <option value="canary">金丝雀发布 (Canary)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>自动部署</Label>
                      <p className="text-sm text-muted-foreground">代码提交时自动触发部署</p>
                    </div>
                    <Switch
                      checked={editingApp.autoDeploy}
                      onChange={(e) => setEditingApp({ ...editingApp, autoDeploy: e.target.checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>失败自动回滚</Label>
                      <p className="text-sm text-muted-foreground">部署失败时自动回滚到上一版本</p>
                    </div>
                    <Switch
                      checked={editingApp.rollbackOnFailure}
                      onChange={(e) => setEditingApp({ ...editingApp, rollbackOnFailure: e.target.checked })}
                    />
                  </div>
                </div>
              </TabContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                取消
              </Button>
              <Button onClick={handleSaveApp}>
                保存
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* App Detail Modal */}
      {selectedApp && (
        <Modal
          open={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          title={selectedApp.name}
          className="max-w-3xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">基本信息</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Docker 镜像</span>
                      <span>{selectedApp.dockerImage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">部署策略</span>
                      <span>{getStrategyName(selectedApp.deploymentStrategy)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">自动部署</span>
                      <span>{selectedApp.autoDeploy ? '是' : '否'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">失败回滚</span>
                      <span>{selectedApp.rollbackOnFailure ? '是' : '否'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">端口映射</h4>
                  <div className="mt-2 space-y-1 text-sm">
                    {selectedApp.ports.length === 0 ? (
                      <span className="text-muted-foreground">无</span>
                    ) : (
                      selectedApp.ports.map((port, i) => (
                        <div key={i} className="flex justify-between">
                          <span>主机: {port.hostPort}</span>
                          <span>容器: {port.containerPort}/{port.protocol}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">环境变量</h4>
                  <div className="mt-2 space-y-1 text-sm font-mono">
                    {Object.keys(selectedApp.environment).length === 0 ? (
                      <span className="text-muted-foreground">无</span>
                    ) : (
                      Object.entries(selectedApp.environment).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key}</span>
                          <span className="text-muted-foreground">{value}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedApp(null)}>
                关闭
              </Button>
              <Button onClick={() => {
                handleEditApp(selectedApp);
                setSelectedApp(null);
              }}>
                编辑
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
