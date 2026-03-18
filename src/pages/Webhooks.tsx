import React, { useState } from 'react';
import { useAppStore } from '@/stores';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Label } from '@/components/ui';
import { Modal } from '@/components/ui';
import { cn, formatRelativeTime } from '@/utils';
import {
  Webhook,
  Plus,
  Search,
  Edit,
  Trash2,
  Play,
  Pause,
  Bell,
  MessageSquare,
  Mail,
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { WebhookConfig } from '@/types';

export const Webhooks: React.FC = () => {
  const { webhooks, addWebhook, updateWebhook, deleteWebhook } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);

  const filteredWebhooks = webhooks.filter((webhook) =>
    webhook.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    webhook.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddWebhook = () => {
    setEditingWebhook({
      id: '',
      name: '',
      url: '',
      events: [],
      enabled: true,
    });
    setShowAddModal(true);
  };

  const handleEditWebhook = (webhook: WebhookConfig) => {
    setEditingWebhook({ ...webhook });
    setShowAddModal(true);
  };

  const handleSaveWebhook = () => {
    if (!editingWebhook) return;
    
    if (editingWebhook.id) {
      updateWebhook(editingWebhook.id, editingWebhook);
    } else {
      addWebhook(editingWebhook);
    }
    setShowAddModal(false);
    setEditingWebhook(null);
  };

  const handleDeleteWebhook = (id: string) => {
    if (confirm('确定要删除这个 Webhook 吗？')) {
      deleteWebhook(id);
    }
  };

  const toggleWebhook = (id: string, enabled: boolean) => {
    updateWebhook(id, { enabled });
  };

  const getEventLabel = (event: string) => {
    switch (event) {
      case 'deployment.success':
        return '部署成功';
      case 'deployment.failed':
        return '部署失败';
      case 'deployment.started':
        return '部署开始';
      case 'server.online':
        return '服务器上线';
      case 'server.offline':
        return '服务器离线';
      case 'health.check.failed':
        return '健康检查失败';
      default:
        return event;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhook 配置</h1>
          <p className="mt-1 text-muted-foreground">配置通知 Webhook 集成</p>
        </div>
        <Button onClick={handleAddWebhook}>
          <Plus className="mr-2 h-4 w-4" />
          添加 Webhook
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索 Webhook..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Webhooks Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredWebhooks.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Webhook className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">暂无 Webhook 配置</p>
                <Button className="mt-4" onClick={handleAddWebhook}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加第一个 Webhook
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredWebhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "rounded-lg p-2",
                    webhook.enabled ? "bg-green-500/10" : "bg-gray-500/10"
                  )}>
                    <Webhook className={cn(
                      "h-5 w-5",
                      webhook.enabled ? "text-green-500" : "text-gray-500"
                    )} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{webhook.name}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">{webhook.url}</p>
                  </div>
                </div>
                <Badge variant={webhook.enabled ? 'success' : 'secondary'}>
                  {webhook.enabled ? '启用' : '禁用'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Events */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">触发事件</p>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.length === 0 ? (
                        <span className="text-xs text-muted-foreground">未配置</span>
                      ) : (
                        webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {getEventLabel(event)}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleWebhook(webhook.id, !webhook.enabled)}
                    >
                      {webhook.enabled ? (
                        <>
                          <Pause className="mr-1 h-3 w-3" />
                          禁用
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 h-3 w-3" />
                          启用
                        </>
                      )}
                    </Button>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditWebhook(webhook)}
                        className="rounded p-1 hover:bg-accent"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="rounded p-1 hover:bg-accent"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Webhook Modal */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingWebhook(null);
        }}
        title={editingWebhook?.id ? '编辑 Webhook' : '添加 Webhook'}
        className="max-w-lg"
      >
        {editingWebhook && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input
                value={editingWebhook.name}
                onChange={(e) => setEditingWebhook({ ...editingWebhook, name: e.target.value })}
                placeholder="飞书通知"
              />
            </div>

            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                value={editingWebhook.url}
                onChange={(e) => setEditingWebhook({ ...editingWebhook, url: e.target.value })}
                placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
              />
            </div>

            <div className="space-y-2">
              <Label>触发事件</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'deployment.success', label: '部署成功' },
                  { value: 'deployment.failed', label: '部署失败' },
                  { value: 'deployment.started', label: '部署开始' },
                  { value: 'server.online', label: '服务器上线' },
                  { value: 'server.offline', label: '服务器离线' },
                  { value: 'health.check.failed', label: '健康检查失败' },
                ].map((event) => (
                  <label key={event.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingWebhook.events.includes(event.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingWebhook({
                            ...editingWebhook,
                            events: [...editingWebhook.events, event.value],
                          });
                        } else {
                          setEditingWebhook({
                            ...editingWebhook,
                            events: editingWebhook.events.filter((e) => e !== event.value),
                          });
                        }
                      }}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{event.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>启用</Label>
                <p className="text-xs text-muted-foreground">启用后将会发送通知</p>
              </div>
              <input
                type="checkbox"
                checked={editingWebhook.enabled}
                onChange={(e) => setEditingWebhook({ ...editingWebhook, enabled: e.target.checked })}
                className="rounded border-input"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                取消
              </Button>
              <Button onClick={handleSaveWebhook}>
                保存
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
