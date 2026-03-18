import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { cn, formatRelativeTime, getStatusColor, getStatusBgColor } from '@/utils';
import {
  Server,
  Package,
  Rocket,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Cpu,
  HardDrive,
  Network,
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

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    servers,
    applications,
    deployments,
    activities,
    serverMetrics,
    initializeDemoData,
  } = useAppStore();

  useEffect(() => {
    if (servers.length === 0) {
      initializeDemoData();
    }
  }, []);

  const onlineServers = servers.filter((s) => s.status === 'online').length;
  const runningDeployments = deployments.filter((d) => d.status === 'running').length;
  const successDeployments = deployments.filter((d) => d.status === 'success').length;
  const failedDeployments = deployments.filter((d) => d.status === 'failed').length;

  // Get latest metrics for chart
  const latestMetrics = serverMetrics['server-1'];
  const chartData = latestMetrics?.cpu.map((cpuPoint, index) => ({
    time: new Date(cpuPoint.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    cpu: cpuPoint.value,
    memory: latestMetrics.memory[index]?.value || 0,
  })) || [];

  const recentDeployments = deployments.slice(0, 5);
  const recentActivities = activities.slice(0, 5);

  const getDeploymentStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">成功</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
      case 'running':
        return <Badge variant="warning">运行中</Badge>;
      case 'pending':
        return <Badge variant="secondary">等待中</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getServerStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge variant="success">在线</Badge>;
      case 'offline':
        return <Badge variant="destructive">离线</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">仪表盘</h1>
          <p className="mt-1 text-muted-foreground">监控您的服务器和应用状态</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate('/servers')}>
            <Server className="mr-2 h-4 w-4" />
            管理服务器
          </Button>
          <Button onClick={() => navigate('/deployments')}>
            <Rocket className="mr-2 h-4 w-4" />
            新建部署
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">服务器总数</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servers.length}</div>
            <p className="mt-1 flex items-center text-xs text-muted-foreground">
              <span className={cn("flex items-center", getStatusColor('online'))}>
                {onlineServers} 在线
              </span>
              <span className="mx-2">/</span>
              <span className={cn(getStatusColor('offline'))}>
                {servers.length - onlineServers} 离线
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">应用总数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {applications.filter((a) => a.autoDeploy).length} 个开启自动部署
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">部署统计</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deployments.length}</div>
            <p className="mt-1 flex items-center text-xs text-muted-foreground">
              <span className="flex items-center text-green-500">
                <CheckCircle className="mr-1 h-3 w-3" />
                {successDeployments}
              </span>
              <span className="mx-2">/</span>
              <span className="flex items-center text-red-500">
                <AlertCircle className="mr-1 h-3 w-3" />
                {failedDeployments}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">运行中部署</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningDeployments}</div>
            <p className="mt-1 flex items-center text-xs text-muted-foreground">
              {runningDeployments > 0 ? (
                <span className="flex items-center text-yellow-500">
                  <Clock className="mr-1 h-3 w-3" />
                  部署进行中
                </span>
              ) : (
                <span>暂无进行中的部署</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* CPU & Memory Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cpu className="mr-2 h-5 w-5" />
              服务器性能趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#cpuGradient)"
                    name="CPU %"
                  />
                  <Area
                    type="monotone"
                    dataKey="memory"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#memoryGradient)"
                    name="内存 %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-center space-x-6">
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm text-muted-foreground">CPU 使用率</span>
              </div>
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">内存使用率</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Deployments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <Rocket className="mr-2 h-5 w-5" />
              最近部署
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/deployments')}>
              查看全部
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDeployments.map((deploy) => {
                const app = applications.find((a) => a.id === deploy.applicationId);
                return (
                  <div
                    key={deploy.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium">{app?.name || '未知应用'}</span>
                        <span className="ml-2 text-sm text-muted-foreground">v{deploy.version}</span>
                      </div>
                      <div className="mt-1 flex items-center text-xs text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        {deploy.startedAt ? formatRelativeTime(deploy.startedAt) : ''}
                        <span className="mx-2">•</span>
                        <span>{deploy.strategy === 'rolling' ? '滚动更新' : deploy.strategy === 'blue-green' ? '蓝绿部署' : '金丝雀'}</span>
                      </div>
                    </div>
                    {getDeploymentStatusBadge(deploy.status)}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Server Status */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <Server className="mr-2 h-5 w-5" />
              服务器状态
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/servers')}>
              查看全部
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {servers.slice(0, 4).map((server) => {
                const metrics = serverMetrics[server.id];
                const latestCpu = metrics?.cpu[metrics.cpu.length - 1]?.value || 0;
                const latestMem = metrics?.memory[metrics.memory.length - 1]?.value || 0;
                
                return (
                  <div
                    key={server.id}
                    className={cn(
                      "rounded-lg border p-4 transition-colors hover:bg-accent",
                      getStatusBgColor(server.status)
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={cn("mr-2 h-2 w-2 rounded-full", server.status === 'online' ? 'bg-green-500' : 'bg-red-500')} />
                        <span className="font-medium">{server.name}</span>
                      </div>
                      {getServerStatusBadge(server.status)}
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      <p>{server.host}:{server.port}</p>
                    </div>
                    {server.status === 'online' && (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center">
                          <Cpu className="mr-1 h-3 w-3 text-blue-500" />
                          <span>CPU: {latestCpu.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center">
                          <HardDrive className="mr-1 h-3 w-3 text-green-500" />
                          <span>内存: {latestMem.toFixed(1)}%</span>
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {server.labels.map((label) => (
                        <Badge key={label} variant="outline" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              最近活动
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/activity')}>
              查看全部
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={cn(
                    "mt-0.5 rounded-full p-1",
                    activity.type === 'deployment' ? 'bg-blue-500/10' :
                    activity.type === 'server' ? 'bg-green-500/10' :
                    'bg-gray-500/10'
                  )}>
                    {activity.type === 'deployment' ? (
                      <Rocket className="h-3 w-3 text-blue-500" />
                    ) : activity.type === 'server' ? (
                      <Server className="h-3 w-3 text-green-500" />
                    ) : (
                      <Activity className="h-3 w-3 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
