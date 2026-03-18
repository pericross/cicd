import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Label, Switch } from '@/components/ui';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Key,
  Globe,
  Palette,
  Save,
  Github,
  Gitlab,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">设置</h1>
        <p className="mt-1 text-muted-foreground">管理平台设置和首选项</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start">
            <User className="mr-2 h-4 w-4" />
            个人资料
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Bell className="mr-2 h-4 w-4" />
            通知设置
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Shield className="mr-2 h-4 w-4" />
            安全设置
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Key className="mr-2 h-4 w-4" />
            API 密钥
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Globe className="mr-2 h-4 w-4" />
            集成
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Palette className="mr-2 h-4 w-4" />
            外观
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                个人资料
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input defaultValue="admin" />
                </div>
                <div className="space-y-2">
                  <Label>邮箱</Label>
                  <Input defaultValue="admin@example.com" type="email" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>显示名称</Label>
                <Input defaultValue="管理员" />
              </div>
              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  保存更改
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                通知设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>部署通知</Label>
                  <p className="text-sm text-muted-foreground">接收部署状态变更通知</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>服务器告警</Label>
                  <p className="text-sm text-muted-foreground">服务器离线或异常时通知</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>健康检查告警</Label>
                  <p className="text-sm text-muted-foreground">应用健康检查失败时通知</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>邮件通知</Label>
                  <p className="text-sm text-muted-foreground">通过邮件接收重要通知</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Integration Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                集成
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center space-x-3">
                  <Github className="h-6 w-6" />
                  <div>
                    <p className="font-medium">GitHub</p>
                    <p className="text-sm text-muted-foreground">未连接</p>
                  </div>
                </div>
                <Button variant="outline">连接</Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center space-x-3">
                  <Gitlab className="h-6 w-6" />
                  <div>
                    <p className="font-medium">GitLab</p>
                    <p className="text-sm text-muted-foreground">未连接</p>
                  </div>
                </div>
                <Button variant="outline">连接</Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                安全设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>双因素认证</Label>
                  <p className="text-sm text-muted-foreground">增强账户安全性</p>
                </div>
                <Button variant="outline">启用</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>会话超时</Label>
                  <p className="text-sm text-muted-foreground">自动登出空闲会话</p>
                </div>
                <select className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="30">30 分钟</option>
                  <option value="60">1 小时</option>
                  <option value="120">2 小时</option>
                  <option value="0">从不</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
