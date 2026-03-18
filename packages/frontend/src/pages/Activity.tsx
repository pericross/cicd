import React, { useState } from 'react';
import { useAppStore } from '@/stores';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from '@/components/ui';
import { cn, formatRelativeTime } from '@/utils';
import {
  Activity,
  Server,
  Rocket,
  Package,
  GitBranch,
  Bell,
  Search,
  Filter,
  ChevronDown,
  User,
} from 'lucide-react';

export const ActivityPage: React.FC = () => {
  const { activities, notifications } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredActivities = activities.filter((activity) => {
    const matchSearch = !searchQuery || 
      activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.action.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || activity.type === typeFilter;
    return matchSearch && matchType;
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deployment':
        return <Rocket className="h-4 w-4 text-blue-500" />;
      case 'server':
        return <Server className="h-4 w-4 text-green-500" />;
      case 'application':
        return <Package className="h-4 w-4 text-purple-500" />;
      case 'pipeline':
        return <GitBranch className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'deployment':
        return 'bg-blue-500/10';
      case 'server':
        return 'bg-green-500/10';
      case 'application':
        return 'bg-purple-500/10';
      case 'pipeline':
        return 'bg-yellow-500/10';
      default:
        return 'bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">活动日志</h1>
          <p className="mt-1 text-muted-foreground">查看系统活动记录</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索活动..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex space-x-1 rounded-lg bg-secondary p-1">
          <button
            onClick={() => setTypeFilter('all')}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              typeFilter === 'all' ? "bg-background text-foreground shadow" : "text-muted-foreground"
            )}
          >
            全部
          </button>
          <button
            onClick={() => setTypeFilter('deployment')}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              typeFilter === 'deployment' ? "bg-background text-foreground shadow" : "text-muted-foreground"
            )}
          >
            部署
          </button>
          <button
            onClick={() => setTypeFilter('server')}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              typeFilter === 'server' ? "bg-background text-foreground shadow" : "text-muted-foreground"
            )}
          >
            服务器
          </button>
          <button
            onClick={() => setTypeFilter('application')}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              typeFilter === 'application' ? "bg-background text-foreground shadow" : "text-muted-foreground"
            )}
          >
            应用
          </button>
        </div>
      </div>

      {/* Activity List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">暂无活动记录</p>
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-4 p-4 transition-colors hover:bg-accent"
                >
                  <div className={cn("rounded-full p-2", getActivityBgColor(activity.type))}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{activity.action}</span>
                        <span className="mx-2 text-muted-foreground">-</span>
                        <span className="text-muted-foreground">{activity.description}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                    {activity.userId && (
                      <div className="mt-1 flex items-center text-xs text-muted-foreground">
                        <User className="mr-1 h-3 w-3" />
                        {activity.userId}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
