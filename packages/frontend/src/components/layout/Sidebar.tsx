import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils';
import { useAppStore } from '@/stores';
import {
  Server,
  Package,
  Rocket,
  Activity,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
  GitBranch,
  Monitor,
  Webhook,
  Github,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  { path: '/', icon: Home, label: '仪表盘' },
  { path: '/github-deploy', icon: Github, label: 'GitHub部署' },
  { path: '/servers', icon: Server, label: '服务器' },
  { path: '/applications', icon: Package, label: '应用' },
  { path: '/deployments', icon: Rocket, label: '部署' },
  { path: '/monitoring', icon: Monitor, label: '监控' },
  { path: '/pipelines', icon: GitBranch, label: '流水线' },
  { path: '/webhooks', icon: Webhook, label: 'Webhook' },
  { path: '/activity', icon: Activity, label: '活动' },
  { path: '/settings', icon: Settings, label: '设置' },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const notifications = useAppStore((state) => state.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <Rocket className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">CI/CD 平台</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="rounded-md p-1 hover:bg-accent"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-3 rounded-md px-3 py-2 transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                  {item.path === '/activity' && unreadCount > 0 && !collapsed && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        {!collapsed && (
          <div className="text-xs text-muted-foreground">
            <p>版本: 1.0.0</p>
            <p className="mt-1">© 2024 CI/CD Platform</p>
          </div>
        )}
      </div>
    </div>
  );
};
