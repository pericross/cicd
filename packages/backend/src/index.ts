import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { DeployRouter } from './routes/deploy';
import { ServerRouter } from './routes/server';
import { DockerRouter } from './routes/docker';
import { GitHubRouter } from './routes/github';
import { HealthRouter } from './routes/health';
import { ProcessRouter } from './routes/process';
import { ServerAdminRouter } from './routes/server-admin';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - 允许所有跨域请求
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Create HTTP server
const server = createServer(app);

// Create WebSocket server for log streaming
const wss = new WebSocketServer({ server, path: '/ws' });

// Store active WebSocket connections
export const wsClients = new Map<string, Set<any>>();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const deploymentId = url.searchParams.get('deploymentId');
  
  if (deploymentId) {
    if (!wsClients.has(deploymentId)) {
      wsClients.set(deploymentId, new Set());
    }
    wsClients.get(deploymentId)?.add(ws);
    
    ws.on('close', () => {
      wsClients.get(deploymentId)?.delete(ws);
    });
  }
});

// Broadcast to all clients watching a deployment
export function broadcastLog(deploymentId: string, log: string) {
  const clients = wsClients.get(deploymentId);
  if (clients) {
    clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({ type: 'log', data: log }));
      }
    });
  }
}

export function broadcastStatus(deploymentId: string, status: string) {
  const clients = wsClients.get(deploymentId);
  if (clients) {
    clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: 'status', data: status }));
      }
    });
  }
}

// Routes
app.use('/api/deploy', DeployRouter);
app.use('/api/server', ServerRouter);
app.use('/api/docker', DockerRouter);
app.use('/api/github', GitHubRouter);
app.use('/api/health', HealthRouter);
app.use('/api/process', ProcessRouter);
app.use('/api/server-admin', ServerAdminRouter);

// Health check
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
  console.log(`🚀 CI/CD Deploy Bridge Service running on port ${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`📦 API available at http://localhost:${PORT}/api`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST /api/deploy/github     - Deploy from GitHub`);
  console.log(`  GET  /api/health/check      - Health check`);
  console.log(`  GET  /api/process/list      - PM2 process list`);
  console.log(`  POST /api/server-admin/setup - Server setup`);
  console.log(`  POST /api/server-admin/exec  - Execute command`);
});
