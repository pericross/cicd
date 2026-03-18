import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Label, Textarea } from '@/components/ui';
import { Modal, Tabs, TabList, Tab, TabContent } from '@/components/ui';
import { cn, formatRelativeTime, getStatusColor, getStatusBgColor } from '@/utils';
import {
  Server,
  Plus,
  Search,
  MoreVertical,
  Power,
  PowerOff,
  Edit,
  Trash2,
  Terminal,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Key,
  Tag,
  Copy,
  Check,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import type { Server as ServerType } from '@/types';
import API_SERVICE from '@/services/api';

// SSH公钥 - 用于一键拷贝
const SSH_PUBLIC_KEY = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDNjwfOH4gGfvSnNAp15gJhEpGNSFb/gdxRcBOL4BEBMailCNiQvgq2+p9eFCerUtKmpbEVoLkHon2lA7fi7lSK71gy4TlGbBVIynccWYGQ7VWLsMFfeiCxEFGuZeo3EhTUtt+r9xswVBXd2sNofscMpa/9TaC5YJg2vJdnxKCXyc68FeIxPFVVzjYtoWBfm2gqWF/auEJx3Zybbwyku1jviZOlncLw8UUSxDRJArabVWNd6nKsXuKu0wuz4jGR7rGggpmbaXB8NfhE11s/Kzy2IUQNiXfl+VXRKRTSB7aUOXVBvOayjcewfq5Of+0D7F3keZFKdT0COvQgxgW6zFKsImG14OSzeac+FJeUKjL1iQNDngdx+2bbLdpNkWXNSZ/SoZVQGU9vTtpT4hBLjYoIMT0N1xVwa/guLYD13j1tyMSccBjaukgS+GjARC13e7r9aRLzIlVeymeR1SONOtK4Kx6t6bsemGlrib+3j0w90Km3sRn8+lJUXKkRLrnLgoNvgVv2B7ESqW0mpJYCr4aWaob+n1Wbpka8lDuNARqjU02jkUXiNrfacuF1mi0091IHumRaOjbh9+dFRSUb5gXfZ2IZc51+ChEqy5PF0XmY2L4Xc/DluA90oTi4ID2XPV0zAxdPM5gs7+ng49WTOtjlHz8jUdHc8WIyaJHSCxxTSQ== a1234@1234deMacBook-Pro.local';

export const Servers: React.FC = () => {
  const { servers, addServer, updateServer, deleteServer, serverMetrics } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerType | null>(null);
  const [selectedServer, setSelectedServer] = useState<ServerType | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [copied, setCopied] = useState(false);
  const [testingServerId, setTestingServerId] = useState<string | null>(null);
  const [serverStatuses, setServerStatuses] = useState<Record<string, { status: string; success: boolean; error?: string }>>({});

  // 测试服务器连接
  const testServerConnection = useCallback(async (server: ServerType) => {
    setTestingServerId(server.id);
    try {
      const result = await API_SERVICE.getServerHealth();
      setServerStatuses(prev => ({
        ...prev,
        [server.id]: {
          status: result.status,
          success: result.success,
          error: result.error
        }
      }));
      // 更新服务器状态
      if (result.success) {
        updateServer(server.id, { 
          ...server, 
          status: 'online',
          lastSeen: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setServerStatuses(prev => ({
        ...prev,
        [server.id]: {
          status: 'offline',
          success: false,
          error: err.message
        }
      }));
      updateServer(server.id, { ...server, status: 'offline' });
    } finally {
      setTestingServerId(null);
    }
  }, [updateServer]);

  // 自动刷新服务器状态
  useEffect(() => {
    const interval = setInterval(() => {
      servers.forEach(server => {
        testServerConnection(server);
      });
    }, 30000); // 每30秒刷新一次

    return () => clearInterval(interval);
  }, [servers, testServerConnection]);

  // 首次加载时刷新状态
  useEffect(() => {
    if (servers.length > 0) {
      servers.forEach(server => {
        testServerConnection(server);
      });
    }
  }, []);

  const handleCopyPublicKey = async () => {
    try {
      await navigator.clipboard.writeText(SSH_PUBLIC_KEY);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const filteredServers = servers.filter((server) => {
    const matchSearch = server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.host.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTab = activeTab === 'all' ||
      (activeTab === 'online' && server.status === 'online') ||
      (activeTab === 'offline' && server.status === 'offline') ||
      (activeTab === server.labels[0]);
    return matchSearch && matchTab;
  });

  const handleAddServer = () => {
    setEditingServer({
      id: '',
      name: '',
      host: '',
      port: 22,
      username: 'root',
      authType: 'key',
      privateKey: '',
      labels: [],
      status: 'unknown',
      createdAt: '',
      updatedAt: '',
    });
    setShowAddModal(true);
  };

  const handleEditServer = (server: ServerType) => {
    setEditingServer({ ...server });
    setShowAddModal(true);
  };

  const handleSaveServer = () => {
    if (!editingServer) return;
    
    if (editingServer.id) {
      updateServer(editingServer.id, editingServer);
    } else {
      addServer({
        name: editingServer.name,
        host: editingServer.host,
        port: editingServer.port,
        username: editingServer.username,
        authType: editingServer.authType,
        password: editingServer.password,
        privateKey: editingServer.privateKey,
        labels: editingServer.labels,
      });
    }
    setShowAddModal(false);
    setEditingServer(null);
  };

  const handleDeleteServer = (id: string) => {
    if (confirm('确定要删除这个服务器吗？')) {
      deleteServer(id);
    }
  };

  const labels = Array.from(new Set(servers.flatMap((s) => s.labels)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">服务器管理</h1>
          <p className="mt-1 text-muted-foreground">管理您的部署服务器</p>
        </div>
        <Button onClick={handleAddServer}>
          <Plus className="mr-2 h-4 w-4" />
          添加服务器
        </Button>
      </div>

      {/* SSH Public Key Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">SSH 公钥</h3>
                <Badge variant="outline" className="text-xs">用于服务器授权</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                将此公钥添加到目标服务器的 ~/.ssh/authorized_keys 文件中，即可通过SSH部署应用
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 rounded-md bg-muted px-3 py-2 text-xs font-mono break-all">
                  {SSH_PUBLIC_KEY}
                </code>
                <Button
                  variant={copied ? "secondary" : "default"}
                  size="sm"
                  onClick={handleCopyPublicKey}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" />
                      一键复制
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索服务器..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex space-x-1 rounded-lg bg-secondary p-1">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === 'all' ? "bg-background text-foreground shadow" : "text-muted-foreground"
            )}
          >
            全部 ({servers.length})
          </button>
          <button
            onClick={() => setActiveTab('online')}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === 'online' ? "bg-background text-foreground shadow" : "text-muted-foreground"
            )}
          >
            在线 ({servers.filter((s) => s.status === 'online').length})
          </button>
          <button
            onClick={() => setActiveTab('offline')}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === 'offline' ? "bg-background text-foreground shadow" : "text-muted-foreground"
            )}
          >
            离线 ({servers.filter((s) => s.status === 'offline').length})
          </button>
          {labels.slice(0, 3).map((label) => (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === label ? "bg-background text-foreground shadow" : "text-muted-foreground"
              )}
            >
              {label} ({servers.filter((s) => s.labels.includes(label)).length})
            </button>
          ))}
        </div>
      </div>

      {/* Server Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredServers.map((server) => {
          const metrics = serverMetrics[server.id];
          const latestCpu = metrics?.cpu[metrics.cpu.length - 1]?.value || 0;
          const latestMem = metrics?.memory[metrics.memory.length - 1]?.value || 0;
          const latestDisk = metrics?.disk[metrics.disk.length - 1]?.value || 0;
          
          return (
            <Card
              key={server.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedServer?.id === server.id && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedServer(server)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "rounded-lg p-2",
                    server.status === 'online' ? "bg-green-500/10" : "bg-red-500/10"
                  )}>
                    <Server className={cn("h-5 w-5", getStatusColor(server.status))} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{server.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{server.host}:{server.port}</p>
                  </div>
                </div>
                <Badge variant={server.status === 'online' ? 'success' : 'destructive'}>
                  {server.status === 'online' ? '在线' : '离线'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Metrics */}
                  {server.status === 'online' && (
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center space-x-1">
                        <Cpu className="h-3 w-3 text-blue-500" />
                        <span>{latestCpu.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MemoryStick className="h-3 w-3 text-green-500" />
                        <span>{latestMem.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <HardDrive className="h-3 w-3 text-yellow-500" />
                        <span>{latestDisk.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Labels */}
                  <div className="flex flex-wrap gap-1">
                    {server.labels.map((label) => (
                      <Badge key={label} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>

                  {/* Last Seen */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>最后在线: {server.lastSeen ? formatRelativeTime(server.lastSeen) : '未知'}</span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          testServerConnection(server);
                        }}
                        className="flex items-center rounded px-2 py-1 hover:bg-accent text-xs"
                        title="测试连接"
                      >
                        {testingServerId === server.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditServer(server);
                        }}
                        className="rounded p-1 hover:bg-accent"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteServer(server.id);
                        }}
                        className="rounded p-1 hover:bg-accent"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                  {/* Connection Error Message */}
                  {serverStatuses[server.id] && !serverStatuses[server.id].success && (
                    <div className="text-xs text-red-500 mt-1">
                      连接失败: {serverStatuses[server.id].error || '未知错误'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Server Modal */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingServer(null);
        }}
        title={editingServer?.id ? '编辑服务器' : '添加服务器'}
        className="max-w-2xl"
      >
        {editingServer && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>服务器名称</Label>
                <Input
                  value={editingServer.name}
                  onChange={(e) => setEditingServer({ ...editingServer, name: e.target.value })}
                  placeholder="生产服务器 A"
                />
              </div>
              <div className="space-y-2">
                <Label>标签</Label>
                <Input
                  value={editingServer.labels.join(', ')}
                  onChange={(e) => setEditingServer({ ...editingServer, labels: e.target.value.split(',').map((l) => l.trim()).filter(Boolean) })}
                  placeholder="production, primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>主机地址</Label>
                <Input
                  value={editingServer.host}
                  onChange={(e) => setEditingServer({ ...editingServer, host: e.target.value })}
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="space-y-2">
                <Label>端口</Label>
                <Input
                  type="number"
                  value={editingServer.port}
                  onChange={(e) => setEditingServer({ ...editingServer, port: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>用户名</Label>
                <Input
                  value={editingServer.username}
                  onChange={(e) => setEditingServer({ ...editingServer, username: e.target.value })}
                  placeholder="root"
                />
              </div>
              <div className="space-y-2">
                <Label>认证方式</Label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editingServer.authType}
                  onChange={(e) => setEditingServer({ ...editingServer, authType: e.target.value as 'password' | 'key' })}
                >
                  <option value="key">SSH 密钥</option>
                  <option value="password">密码</option>
                </select>
              </div>
            </div>

            {editingServer.authType === 'key' ? (
              <div className="space-y-2">
                <Label>私钥内容</Label>
                <Textarea
                  value={editingServer.privateKey || ''}
                  onChange={(e) => setEditingServer({ ...editingServer, privateKey: e.target.value })}
                  placeholder="-----BEGIN RSA PRIVATE KEY-----"
                  className="h-24 font-mono text-xs"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>密码</Label>
                <Input
                  type="password"
                  value={editingServer.password || ''}
                  onChange={(e) => setEditingServer({ ...editingServer, password: e.target.value })}
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                取消
              </Button>
              <Button onClick={handleSaveServer}>
                保存
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Server Detail Modal */}
      {selectedServer && (
        <Modal
          open={!!selectedServer}
          onClose={() => setSelectedServer(null)}
          title={selectedServer.name}
          className="max-w-3xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">服务器信息</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">主机地址</span>
                      <span>{selectedServer.host}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">端口</span>
                      <span>{selectedServer.port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">用户名</span>
                      <span>{selectedServer.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">认证方式</span>
                      <span>{selectedServer.authType === 'key' ? 'SSH 密钥' : '密码'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">状态</span>
                      <Badge variant={selectedServer.status === 'online' ? 'success' : 'destructive'}>
                        {selectedServer.status === 'online' ? '在线' : '离线'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">标签</h4>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedServer.labels.map((label) => (
                      <Badge key={label} variant="outline">{label}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">最近活动</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    最后在线: {selectedServer.lastSeen ? formatRelativeTime(selectedServer.lastSeen) : '未知'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedServer(null)}>
                关闭
              </Button>
              <Button onClick={() => {
                handleEditServer(selectedServer);
                setSelectedServer(null);
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
