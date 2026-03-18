import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { cn } from '@/utils';
import {
  GitBranch,
  Plus,
  Play,
  Pause,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  ChevronRight,
} from 'lucide-react';

const mockPipelines = [
  {
    id: 'pipeline-1',
    name: '前端构建流水线',
    description: '构建和部署前端应用到测试环境',
    steps: 4,
    enabled: true,
    lastRun: '2024-01-28T10:00:00Z',
    status: 'success',
  },
  {
    id: 'pipeline-2',
    name: '后端构建流水线',
    description: '构建后端服务并运行测试',
    steps: 5,
    enabled: true,
    lastRun: '2024-01-28T09:30:00Z',
    status: 'failed',
  },
  {
    id: 'pipeline-3',
    name: '全量部署流水线',
    description: '部署应用到生产环境',
    steps: 3,
    enabled: false,
    lastRun: '2024-01-27T15:00:00Z',
    status: 'success',
  },
];

export const Pipelines: React.FC = () => {
  const getStatusIcon = (status: string) => {
    switch (status) {
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
          <h1 className="text-3xl font-bold">流水线</h1>
          <p className="mt-1 text-muted-foreground">管理 CI/CD 流水线</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          创建流水线
        </Button>
      </div>

      {/* Pipelines List */}
      <div className="grid gap-4">
        {mockPipelines.map((pipeline) => (
          <Card key={pipeline.id} className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    "rounded-lg p-2",
                    pipeline.enabled ? "bg-primary/10" : "bg-gray-500/10"
                  )}>
                    <GitBranch className={cn(
                      "h-5 w-5",
                      pipeline.enabled ? "text-primary" : "text-gray-500"
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{pipeline.name}</span>
                      <Badge variant={pipeline.enabled ? 'success' : 'secondary'}>
                        {pipeline.enabled ? '启用' : '禁用'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{pipeline.description}</p>
                    <div className="mt-1 flex items-center space-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Settings className="mr-1 h-3 w-3" />
                        {pipeline.steps} 个步骤
                      </span>
                      <span className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        最后运行: {new Date(pipeline.lastRun).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(pipeline.status)}
                    <span className="text-sm">
                      {pipeline.status === 'success' ? '成功' : 
                       pipeline.status === 'failed' ? '失败' : 
                       pipeline.status === 'running' ? '运行中' : '未运行'}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline">
                      <Play className="mr-1 h-3 w-3" />
                      运行
                    </Button>
                    <Button size="sm" variant="ghost">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
