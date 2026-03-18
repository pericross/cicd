import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Server, Application, Deployment, Notification, Activity, WebhookConfig, ServerMetrics, ContainerStatus, MetricData } from '@/types';
import { generateId } from '@/utils';

interface AppState {
  // Servers
  servers: Server[];
  addServer: (server: Omit<Server, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  updateServer: (id: string, updates: Partial<Server>) => void;
  deleteServer: (id: string) => void;
  
  // Applications
  applications: Application[];
  addApplication: (app: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  
  // Deployments
  deployments: Deployment[];
  addDeployment: (deployment: Omit<Deployment, 'id' | 'startedAt' | 'completedAt' | 'logs'>) => void;
  updateDeployment: (id: string, updates: Partial<Deployment>) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Activities
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  
  // Webhooks
  webhooks: WebhookConfig[];
  addWebhook: (webhook: Omit<WebhookConfig, 'id'>) => void;
  updateWebhook: (id: string, updates: Partial<WebhookConfig>) => void;
  deleteWebhook: (id: string) => void;
  
  // Metrics (simulated real-time data)
  serverMetrics: Record<string, ServerMetrics>;
  updateServerMetrics: (serverId: string, metrics: ServerMetrics) => void;
  
  // Container Status
  containerStatuses: Record<string, ContainerStatus[]>;
  updateContainerStatus: (serverId: string, containers: ContainerStatus[]) => void;
  
  // UI State
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  // Initialize demo data
  initializeDemoData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      servers: [],
      applications: [],
      deployments: [],
      notifications: [],
      activities: [],
      webhooks: [],
      serverMetrics: {},
      containerStatuses: {},
      sidebarCollapsed: false,

      // Server actions
      addServer: (server) => set((state) => ({
        servers: [...state.servers, {
          ...server,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'unknown',
        }]
      })),

      updateServer: (id, updates) => set((state) => ({
        servers: state.servers.map(s => 
          s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
        )
      })),

      deleteServer: (id) => set((state) => ({
        servers: state.servers.filter(s => s.id !== id)
      })),

      // Application actions
      addApplication: (app) => set((state) => ({
        applications: [...state.applications, {
          ...app,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]
      })),

      updateApplication: (id, updates) => set((state) => ({
        applications: state.applications.map(a => 
          a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
        )
      })),

      deleteApplication: (id) => set((state) => ({
        applications: state.applications.filter(a => a.id !== id)
      })),

      // Deployment actions
      addDeployment: (deployment) => set((state) => ({
        deployments: [{
          ...deployment,
          id: generateId(),
          startedAt: new Date().toISOString(),
          logs: [],
        }, ...state.deployments]
      })),

      updateDeployment: (id, updates) => set((state) => ({
        deployments: state.deployments.map(d => 
          d.id === id ? { ...d, ...updates } : d
        )
      })),

      // Notification actions
      addNotification: (notification) => set((state) => ({
        notifications: [{
          ...notification,
          id: generateId(),
          timestamp: new Date().toISOString(),
          read: false,
        }, ...state.notifications]
      })),

      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, read: true } : n
        )
      })),

      clearNotifications: () => set({ notifications: [] }),

      // Activity actions
      addActivity: (activity) => set((state) => ({
        activities: [{
          ...activity,
          id: generateId(),
          timestamp: new Date().toISOString(),
        }, ...state.activities].slice(0, 100) // Keep last 100 activities
      })),

      // Webhook actions
      addWebhook: (webhook) => set((state) => ({
        webhooks: [...state.webhooks, { ...webhook, id: generateId() }]
      })),

      updateWebhook: (id, updates) => set((state) => ({
        webhooks: state.webhooks.map(w => 
          w.id === id ? { ...w, ...updates } : w
        )
      })),

      deleteWebhook: (id) => set((state) => ({
        webhooks: state.webhooks.filter(w => w.id !== id)
      })),

      // Metrics actions
      updateServerMetrics: (serverId, metrics) => set((state) => ({
        serverMetrics: { ...state.serverMetrics, [serverId]: metrics }
      })),

      // Container status actions
      updateContainerStatus: (serverId, containers) => set((state) => ({
        containerStatuses: { ...state.containerStatuses, [serverId]: containers }
      })),

      // UI actions
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Initialize demo data
      initializeDemoData: () => {
        const demoServers: Server[] = [
          {
            id: 'server-1',
            name: '生产服务器 A',
            host: '192.168.1.100',
            port: 22,
            username: 'deploy',
            authType: 'key',
            labels: ['production', 'primary'],
            status: 'online',
            lastSeen: new Date().toISOString(),
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 'server-2',
            name: '生产服务器 B',
            host: '192.168.1.101',
            port: 22,
            username: 'deploy',
            authType: 'key',
            labels: ['production', 'secondary'],
            status: 'online',
            lastSeen: new Date().toISOString(),
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 'server-3',
            name: '测试服务器',
            host: '192.168.1.200',
            port: 22,
            username: 'deploy',
            authType: 'key',
            labels: ['test', 'staging'],
            status: 'online',
            lastSeen: new Date().toISOString(),
            createdAt: '2024-01-20T10:00:00Z',
            updatedAt: '2024-01-20T10:00:00Z',
          },
          {
            id: 'server-4',
            name: '开发服务器',
            host: '192.168.1.50',
            port: 22,
            username: 'dev',
            authType: 'password',
            password: '******',
            labels: ['development'],
            status: 'offline',
            lastSeen: '2024-01-25T15:30:00Z',
            createdAt: '2024-01-10T10:00:00Z',
            updatedAt: '2024-01-25T15:30:00Z',
          },
        ];

        const demoApplications: Application[] = [
          {
            id: 'app-1',
            name: 'Web 应用',
            description: '主站前端应用',
            repository: 'https://github.com/example/web-app',
            dockerImage: 'nginx:latest',
            deploymentStrategy: 'rolling',
            autoDeploy: true,
            rollbackOnFailure: true,
            environment: {
              NODE_ENV: 'production',
              API_URL: 'https://api.example.com',
            },
            ports: [{ containerPort: 80, hostPort: 8080, protocol: 'tcp' }],
            volumes: [],
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 'app-2',
            name: 'API 服务',
            description: '后端 REST API',
            repository: 'https://github.com/example/api-service',
            dockerImage: 'node:18-alpine',
            deploymentStrategy: 'blue-green',
            autoDeploy: false,
            rollbackOnFailure: true,
            environment: {
              NODE_ENV: 'production',
              DB_HOST: 'localhost',
              DB_PORT: '5432',
            },
            ports: [{ containerPort: 3000, hostPort: 3000, protocol: 'tcp' }],
            volumes: [],
            healthCheck: {
              path: '/health',
              port: 3000,
              interval: 30,
              timeout: 5,
              healthyThreshold: 3,
              unhealthyThreshold: 3,
            },
            createdAt: '2024-01-18T10:00:00Z',
            updatedAt: '2024-01-18T10:00:00Z',
          },
          {
            id: 'app-3',
            name: '数据库服务',
            description: 'PostgreSQL 数据库',
            dockerImage: 'postgres:15',
            deploymentStrategy: 'rolling',
            autoDeploy: false,
            rollbackOnFailure: false,
            environment: {
              POSTGRES_USER: 'appuser',
              POSTGRES_PASSWORD: '******',
              POSTGRES_DB: 'production',
            },
            ports: [{ containerPort: 5432, hostPort: 5432, protocol: 'tcp' }],
            volumes: [{ containerPath: '/var/lib/postgresql/data', hostPath: '/data/postgres', readOnly: false }],
            createdAt: '2024-01-10T10:00:00Z',
            updatedAt: '2024-01-10T10:00:00Z',
          },
        ];

        const demoDeployments: Deployment[] = [
          {
            id: 'deploy-1',
            applicationId: 'app-1',
            serverIds: ['server-1', 'server-2'],
            version: 'v2.3.1',
            imageTag: 'web-app:2.3.1',
            status: 'success',
            strategy: 'rolling',
            steps: [
              { name: '构建', status: 'success', logs: ['Starting build...', 'Build completed'] },
              { name: '传输', status: 'success', logs: ['Transferring files...', 'Transfer completed'] },
              { name: '部署', status: 'success', logs: ['Deploying container...', 'Deployment successful'] },
              { name: '健康检查', status: 'success', logs: ['Health check passed'] },
            ],
            triggeredBy: 'system',
            startedAt: '2024-01-28T10:00:00Z',
            completedAt: '2024-01-28T10:05:00Z',
            logs: [],
          },
          {
            id: 'deploy-2',
            applicationId: 'app-2',
            serverIds: ['server-3'],
            version: 'v1.8.0',
            imageTag: 'api-service:1.8.0',
            status: 'failed',
            strategy: 'blue-green',
            steps: [
              { name: '构建', status: 'success', logs: ['Build completed'] },
              { name: '传输', status: 'success', logs: ['Transfer completed'] },
              { name: '部署', status: 'failed', logs: ['Deploying container...'], error: 'Container failed to start' },
            ],
            triggeredBy: 'admin',
            startedAt: '2024-01-28T09:30:00Z',
            completedAt: '2024-01-28T09:35:00Z',
            logs: [],
            error: 'Container failed to start: port already in use',
          },
          {
            id: 'deploy-3',
            applicationId: 'app-3',
            serverIds: ['server-1'],
            version: 'v15.2',
            imageTag: 'postgres:15',
            status: 'running',
            strategy: 'rolling',
            steps: [
              { name: '构建', status: 'success', logs: ['Pulling image...', 'Image pulled'] },
              { name: '传输', status: 'running', logs: ['Transferring...'] },
            ],
            triggeredBy: 'system',
            startedAt: '2024-01-28T11:00:00Z',
            logs: [],
          },
        ];

        const demoActivities: Activity[] = [
          {
            id: 'act-1',
            type: 'deployment',
            action: '部署成功',
            description: 'Web 应用 v2.3.1 部署成功',
            entityId: 'deploy-1',
            entityType: 'deployment',
            userId: 'system',
            timestamp: '2024-01-28T10:05:00Z',
          },
          {
            id: 'act-2',
            type: 'deployment',
            action: '部署失败',
            description: 'API 服务 v1.8.0 部署失败',
            entityId: 'deploy-2',
            entityType: 'deployment',
            userId: 'admin',
            timestamp: '2024-01-28T09:35:00Z',
          },
          {
            id: 'act-3',
            type: 'server',
            action: '服务器离线',
            description: '开发服务器已离线',
            entityId: 'server-4',
            entityType: 'server',
            timestamp: '2024-01-25T15:30:00Z',
          },
        ];

        const demoNotifications: Notification[] = [
          {
            id: 'notif-1',
            type: 'deployment',
            level: 'success',
            title: '部署成功',
            message: 'Web 应用 v2.3.1 已成功部署到生产服务器',
            timestamp: '2024-01-28T10:05:00Z',
            read: false,
          },
          {
            id: 'notif-2',
            type: 'deployment',
            level: 'error',
            title: '部署失败',
            message: 'API 服务 v1.8.0 部署失败：端口被占用',
            timestamp: '2024-01-28T09:35:00Z',
            read: false,
          },
          {
            id: 'notif-3',
            type: 'health',
            level: 'warning',
            title: '健康检查警告',
            message: '测试服务器 CPU 使用率超过 80%',
            timestamp: '2024-01-28T08:00:00Z',
            read: true,
          },
        ];

        // Generate demo metrics
        const generateMetrics = (serverId: string): ServerMetrics => {
          const now = Date.now();
          const cpu: MetricData[] = Array.from({ length: 60 }, (_, i) => ({
            timestamp: new Date(now - (59 - i) * 60000).toISOString(),
            value: Math.random() * 60 + 20,
          }));
          const memory: MetricData[] = Array.from({ length: 60 }, (_, i) => ({
            timestamp: new Date(now - (59 - i) * 60000).toISOString(),
            value: Math.random() * 40 + 40,
          }));
          const disk: MetricData[] = Array.from({ length: 60 }, (_, i) => ({
            timestamp: new Date(now - (59 - i) * 60000).toISOString(),
            value: Math.random() * 10 + 60,
          }));
          const network: MetricData[] = Array.from({ length: 60 }, (_, i) => ({
            timestamp: new Date(now - (59 - i) * 60000).toISOString(),
            value: Math.random() * 100,
          }));
          return { serverId, cpu, memory, disk, network };
        };

        set({
          servers: demoServers,
          applications: demoApplications,
          deployments: demoDeployments,
          activities: demoActivities,
          notifications: demoNotifications,
          serverMetrics: {
            'server-1': generateMetrics('server-1'),
            'server-2': generateMetrics('server-2'),
            'server-3': generateMetrics('server-3'),
          },
          containerStatuses: {
            'server-1': [
              {
                id: 'container-1',
                name: 'web-app',
                image: 'nginx:latest',
                status: 'running',
                health: 'healthy',
                cpuPercent: 5.2,
                memoryPercent: 32.1,
                created: '2024-01-28T10:00:00Z',
                ports: [{ containerPort: 80, hostPort: 8080, protocol: 'tcp' }],
              },
              {
                id: 'container-2',
                name: 'postgres',
                image: 'postgres:15',
                status: 'running',
                health: 'healthy',
                cpuPercent: 1.8,
                memoryPercent: 45.3,
                created: '2024-01-15T10:00:00Z',
                ports: [{ containerPort: 5432, hostPort: 5432, protocol: 'tcp' }],
              },
            ],
            'server-2': [
              {
                id: 'container-3',
                name: 'web-app',
                image: 'nginx:latest',
                status: 'running',
                health: 'healthy',
                cpuPercent: 4.8,
                memoryPercent: 28.5,
                created: '2024-01-28T10:00:00Z',
                ports: [{ containerPort: 80, hostPort: 8080, protocol: 'tcp' }],
              },
            ],
            'server-3': [
              {
                id: 'container-4',
                name: 'api-service',
                image: 'node:18-alpine',
                status: 'stopped',
                health: 'unhealthy',
                cpuPercent: 0,
                memoryPercent: 0,
                created: '2024-01-20T10:00:00Z',
                ports: [{ containerPort: 3000, hostPort: 3000, protocol: 'tcp' }],
              },
            ],
          },
        });
      },
    }),
    {
      name: 'cicd-platform-storage',
      partialize: (state) => ({
        servers: state.servers,
        applications: state.applications,
        deployments: state.deployments,
        notifications: state.notifications,
        activities: state.activities,
        webhooks: state.webhooks,
      }),
    }
  )
);
