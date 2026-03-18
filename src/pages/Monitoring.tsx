import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { cn, formatRelativeTime, getStatusColor, getStatusBgColor, formatPercent, formatBytes } from '@/utils';
import {
  Monitor,
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Activity,
  Container,
  Heart,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Gauge,
  Play,
  Square,
  RotateCcw,
  Terminal,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface ServerHealth {
  success: boolean;
  status: string;
  timestamp: string;
  system?: {
    hostname: string;
    uptime: string;
    cpu: {
      usage_percent: number;
      load_avg: {
        '1m': number;
        '5m': number;
        '15m': number;
      };
    };
    memory: {
      total_mb: number;
      used_mb: number;
      free_mb: number;
      usage_percent: number;
    };
    disk: {
      total: string;
      used: string;
      available: string;
      usage_percent: number;
      mount: string;
    };
  };
  runtime?: {
    docker: {
      installed: boolean;
      version: string;
    };
  };
}

interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  created: string;
  ports: string;
  cpu_percent: number;
  memory_usage: string;
  memory_percent: number;
}

interface ServerMetrics {
  cpu: { usage_percent: number; load_1m: number; load_5m: number; load_15m: number };
  memory: { total_mb: number; used_mb: number; free_mb: number; usage_percent: number };
  disk: { total: string; used: string; available: string; usage_percent: number };
  network: { rx_bytes: number; tx_bytes: number };
  docker: { version: string; total_containers: number; running_containers: number; images: number };
}

export const Monitoring: React.FC = () => {
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Historical data for charts
  const [cpuHistory, setCpuHistory] = useState<Array<{ time: string; value: number }>>([]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch health
      const healthData = await apiService.getServerHealth();
      setHealth(healthData);
      
      // Fetch containers
      const containerData = await apiService.getServerContainers();
      setContainers(containerData.containers || []);
      
      // Fetch metrics
      try {
        const metricsData = await apiService.getServerMetrics();
        setMetrics(metricsData);
        
        // Add to history
        if (metricsData?.cpu?.usage_percent) {
          setCpuHistory(prev => {
            const newHistory = [...prev, {
              time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
              value: metricsData.cpu.usage_percent
            }];
            // Keep last 20 data points
            return newHistory.slice(-20);
          });
        }
      } catch (e) {
        console.error('Failed to fetch metrics:', e);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch server data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh]);

  const handleContainerAction = async (action: string, containerName: string) => {
    if (!confirm(`确定要对容器 ${containerName} 执行 ${action} 操作吗？`)) return;
    
    setActionLoading(containerName);
    try {
      await apiService.controlContainer(action, containerName);
      await fetchData();
    } catch (err: any) {
      alert(`操作失败: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getContainerStateIcon = (state: string) => {
    switch (state?.toLowerCase()) {
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'exited':
      case 'stopped':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'restarting':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getContainerStateBadge = (state: string) => {
    switch (state?.toLowerCase()) {
      case 'running':
        return <Badge variant="success">运行中</Badge>;
      case 'exited':
      case 'stopped':
        return <Badge variant="secondary">已停止</Badge>;
      case 'restarting':
        return <Badge variant="warning">重启中</Badge>;
      case 'paused':
        return <Badge variant="outline">已暂停</Badge>;
      default:
        return <Badge>{state}</Badge>;
    }
  };

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">正在获取服务器信息...</p>
        </div>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <XCircle className="h-12 w-12 mx-auto text-red-500" />
          <p className="mt-4 text-lg font-medium">无法连接到服务器</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重试
          </Button>
        </div>
      </div>
    );
  }

  const isOnline = health?.status === 'online';
  const cpu = health?.system?.cpu || { usage_percent: 0, load_avg: { '1m': 0, '5m': 0, '15m': 0 } };
  const memory = health?.system?.memory || { total_mb: 0, used_mb: 0, free_mb: 0, usage_percent: 0 };
  const disk = health?.system?.disk || { total: '0', used: '0', available: '0', usage_percent: 0, mount: '/' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">服务器监控</h1>
          <p className="mt-1 text-muted-foreground">实时监控服务器健康状态和部署的应用</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span>自动刷新 (5s)</span>
          </label>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            刷新
          </Button>
        </div>
      </div>

      {/* Server Status Banner */}
      <div className={cn(
        "rounded-lg p-4 flex items-center justify-between",
        isOnline ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
      )}>
        <div className="flex items-center space-x-3">
          <div className={cn(
            "w-3 h-3 rounded-full",
            isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"
          )} />
          <div>
            <span className="font-medium">{health?.system?.hostname || '服务器'}</span>
            <span className="mx-2 text-muted-foreground">|</span>
            <span className={isOnline ? "text-green-500" : "text-red-500"}>
              {isOnline ? '在线' : '离线'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>运行时间: {health?.system?.uptime || '-'}</span>
          {health?.runtime?.docker?.installed && (
            <span>Docker: {health.runtime.docker.version}</span>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* CPU Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CPU 使用率</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold">{formatPercent(cpu.usage_percent)}</div>
              <div className={cn(
                "text-xs",
                cpu.usage_percent > 80 ? "text-red-500" : cpu.usage_percent > 60 ? "text-yellow-500" : "text-green-500"
              )}>
                负载: {cpu.load_avg['1m'].toFixed(2)}
              </div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div 
                className={cn(
                  "h-full transition-all",
                  cpu.usage_percent > 80 ? "bg-red-500" : cpu.usage_percent > 60 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${Math.min(cpu.usage_percent, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>1m: {cpu.load_avg['1m'].toFixed(2)}</span>
              <span>5m: {cpu.load_avg['5m'].toFixed(2)}</span>
              <span>15m: {cpu.load_avg['15m'].toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Memory Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">内存使用</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold">{formatPercent(memory.usage_percent)}</div>
              <div className="text-xs text-muted-foreground">
                {memory.used_mb} / {memory.total_mb} MB
              </div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div 
                className={cn(
                  "h-full transition-all",
                  memory.usage_percent > 80 ? "bg-red-500" : memory.usage_percent > 60 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${Math.min(memory.usage_percent, 100)}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              可用: {memory.free_mb} MB
            </div>
          </CardContent>
        </Card>

        {/* Disk Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">磁盘使用</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold">{disk.usage_percent}%</div>
              <div className="text-xs text-muted-foreground">
                {disk.used} / {disk.total}
              </div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div 
                className={cn(
                  "h-full transition-all",
                  disk.usage_percent > 90 ? "bg-red-500" : disk.usage_percent > 75 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${Math.min(disk.usage_percent, 100)}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              挂载点: {disk.mount}
            </div>
          </CardContent>
        </Card>

        {/* Docker Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Docker 容器</CardTitle>
            <Container className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold">{containers.length}</div>
              <div className="text-xs text-green-500">
                {containers.filter(c => c.state === 'running').length} 运行中
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {metrics?.docker?.images || 0} 个镜像
            </div>
            <div className="mt-2 flex space-x-2">
              {health?.runtime?.docker?.installed ? (
                <Badge variant="success" className="text-xs">Docker 已安装</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">未安装</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CPU History Chart */}
      {cpuHistory.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              CPU 使用率趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cpuHistory}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#cpuGradient)"
                    name="CPU %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deployed Applications (Containers) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Container className="mr-2 h-5 w-5" />
            部署的应用 ({containers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {containers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Container className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">暂无部署的容器</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">状态</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">容器名称</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">镜像</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">端口映射</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">状态</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">资源使用</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.map((container) => (
                    <tr key={container.id} className="border-b hover:bg-accent/50">
                      <td className="py-3 px-4">
                        {getContainerStateIcon(container.state)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{container.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-mono text-muted-foreground">{container.image}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">{container.ports || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        {getContainerStateBadge(container.state)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2 text-xs">
                          <Cpu className="h-3 w-3 text-blue-500" />
                          <span>{container.cpu_percent.toFixed(1)}%</span>
                          <MemoryStick className="h-3 w-3 text-green-500 ml-2" />
                          <span>{container.memory_percent.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          {container.state === 'running' ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleContainerAction('stop', container.name)}
                                disabled={actionLoading === container.name}
                                title="停止"
                              >
                                <Square className="h-3 w-3 text-yellow-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleContainerAction('restart', container.name)}
                                disabled={actionLoading === container.name}
                                title="重启"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleContainerAction('start', container.name)}
                              disabled={actionLoading === container.name}
                              title="启动"
                            >
                              <Play className="h-3 w-3 text-green-500" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleContainerAction('logs', container.name)}
                            title="查看日志"
                          >
                            <Terminal className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
