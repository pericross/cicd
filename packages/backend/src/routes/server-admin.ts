import { Router } from 'express';
import { SSHService } from '../services/ssh';

const router = Router();

/**
 * GET /api/server/info
 * 获取服务器系统信息
 */
router.get('/info', async (req, res) => {
  try {
    const ssh = new SSHService();
    await ssh.connect();

    const commands = [
      'cat /etc/os-release | grep PRETTY_NAME',
      'uptime -p',
      'node --version',
      'npm --version',
      'pnpm --version',
      'pm2 --version',
      'nginx -v 2>&1',
      'docker --version',
      'df -h / | tail -1',
      'free -h',
      'cat /proc/cpuinfo | grep "model name" | head -1'
    ];

    const results: Record<string, string> = {};
    const keys = ['os', 'uptime', 'node', 'npm', 'pnpm', 'pm2', 'nginx', 'docker', 'disk', 'memory', 'cpu'];

    for (let i = 0; i < commands.length; i++) {
      try {
        const output = (await ssh.exec(commands[i])).trim();
        results[keys[i]] = output.replace(/.*=/, '').replace(/"/g, '') || 'N/A';
      } catch {
        results[keys[i]] = 'Not installed';
      }
    }

    ssh.disconnect();

    res.json({
      success: true,
      info: {
        os: results.os,
        uptime: results.uptime,
        versions: {
          node: results.node,
          npm: results.npm,
          pnpm: results.pnpm,
          pm2: results.pm2,
          nginx: results.nginx,
          docker: results.docker
        },
        resources: {
          disk: results.disk,
          memory: results.memory,
          cpu: results.cpu
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * POST /api/server/setup
 * 初始化服务器（整合setup-server.sh功能）
 */
router.post('/setup', async (req, res) => {
  const { sshKey } = req.body;

  try {
    const ssh = new SSHService();
    await ssh.connect();

    // 记录日志
    const logs: string[] = [];
    const log = (msg: string) => {
      const timestamp = new Date().toISOString();
      logs.push(`[${timestamp}] ${msg}`);
      console.log(msg);
    };

    log('开始服务器初始化...');

    // 1. 更新系统
    log('更新系统包...');
    await ssh.exec('apt-get update -qq && apt-get upgrade -y -qq');
    log('✓ 系统已更新');

    // 2. 安装基础软件
    log('安装基础软件...');
    await ssh.exec(`apt-get install -y -qq curl wget git build-essential nginx certbot python3-certbot-nginx ufw`);
    log('✓ 基础软件已安装');

    // 3. 安装 Node.js
    log('安装 Node.js 22.x...');
    await ssh.exec('curl -fsSL https://deb.nodesource.com/setup_22.x | bash -');
    await ssh.exec('apt-get install -y nodejs');
    log('✓ Node.js 已安装');

    // 4. 安装 pnpm
    log('安装 pnpm...');
    await ssh.exec('npm install -g pnpm');
    log('✓ pnpm 已安装');

    // 5. 安装 PM2
    log('安装 PM2...');
    await ssh.exec('npm install -g pm2');
    await ssh.exec('pm2 startup systemd -u root --hp /root');
    log('✓ PM2 已安装');

    // 6. 配置防火墙
    log('配置防火墙...');
    await ssh.exec('ufw --force enable');
    await ssh.exec('ufw allow 22/tcp');
    await ssh.exec('ufw allow 80/tcp');
    await ssh.exec('ufw allow 443/tcp');
    log('✓ 防火墙已配置');

    // 7. 启动 Nginx
    log('启动 Nginx...');
    await ssh.exec('systemctl enable nginx');
    await ssh.exec('systemctl start nginx');
    log('✓ Nginx 已启动');

    // 8. 创建部署目录
    log('创建部署目录...');
    await ssh.exec('mkdir -p /var/www/manus-projects');
    log('✓ 部署目录已创建');

    // 9. 安装 Docker
    log('安装 Docker...');
    const dockerCheck = await ssh.exec('command -v docker');
    if (!dockerCheck.trim()) {
      await ssh.exec('curl -fsSL https://get.docker.com -o /tmp/get-docker.sh');
      await ssh.exec('sh /tmp/get-docker.sh');
      await ssh.exec('systemctl enable docker');
      await ssh.exec('systemctl start docker');
      await ssh.exec('rm /tmp/get-docker.sh');
    }
    log('✓ Docker 已安装');

    // 10. 保存 PM2 进程列表
    await ssh.exec('pm2 save');

    log('服务器初始化完成！');
    ssh.disconnect();

    res.json({
      success: true,
      message: '服务器初始化完成',
      logs
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * POST /api/server/check-packages
 * 检查服务器软件包安装状态
 */
router.get('/check-packages', async (req, res) => {
  try {
    const ssh = new SSHService();
    await ssh.connect();

    const packages = ['node', 'npm', 'pnpm', 'pm2', 'nginx', 'docker', 'git', 'curl'];

    const results: Record<string, { installed: boolean; version?: string }> = {};

    for (const pkg of packages) {
      try {
        const versionCmd = pkg === 'node' ? 'node --version' : 
                          pkg === 'npm' ? 'npm --version' :
                          pkg === 'pnpm' ? 'pnpm --version' :
                          pkg === 'pm2' ? 'pm2 --version' :
                          pkg === 'nginx' ? 'nginx -v 2>&1' :
                          pkg === 'docker' ? 'docker --version' :
                          pkg === 'git' ? 'git --version' :
                          'curl --version';
        
        const version = (await ssh.exec(versionCmd)).trim();
        results[pkg] = { installed: true, version };
      } catch {
        results[pkg] = { installed: false };
      }
    }

    ssh.disconnect();

    res.json({
      success: true,
      packages: results
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * POST /api/server/exec
 * 在服务器上执行命令
 */
router.post('/exec', async (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({
      success: false,
      message: '请提供 command 参数'
    });
  }

  // 安全检查
  const dangerousCommands = ['rm -rf /', 'dd if=', ':(){:|:&};:', '> /dev/sda'];
  const isDangerous = dangerousCommands.some(dc => command.includes(dc));
  
  if (isDangerous) {
    return res.status(403).json({
      success: false,
      message: '禁止执行危险命令'
    });
  }

  try {
    const ssh = new SSHService();
    await ssh.connect();

    const output = await ssh.exec(command);
    ssh.disconnect();

    res.json({
      success: true,
      output
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * GET /api/server/disk
 * 获取磁盘使用情况
 */
router.get('/disk', async (req, res) => {
  try {
    const ssh = new SSHService();
    await ssh.connect();

    const output = await ssh.exec('df -h');
    ssh.disconnect();

    const lines = output.split('\n').filter(l => l.trim());
    const disks = lines.slice(1).map(line => {
      const parts = line.split(/\s+/);
      return {
        filesystem: parts[0],
        大小: parts[1],
        已用: parts[2],
        可用: parts[3],
        使用率: parts[4],
        挂载点: parts[5]
      };
    });

    res.json({
      success: true,
      disks
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * GET /api/server/memory
 * 获取内存使用情况
 */
router.get('/memory', async (req, res) => {
  try {
    const ssh = new SSHService();
    await ssh.connect();

    const output = await ssh.exec('free -h');
    ssh.disconnect();

    res.json({
      success: true,
      memory: output
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * GET /api/server/network
 * 获取网络连接状态
 */
router.get('/network', async (req, res) => {
  try {
    const ssh = new SSHService();
    await ssh.connect();

    const connections = await ssh.exec('ss -tuln | head -20');
    const listeningPorts = await ssh.exec('netstat -tuln 2>/dev/null | grep LISTEN || ss -tuln | grep LISTEN');
    
    ssh.disconnect();

    res.json({
      success: true,
      connections,
      listeningPorts
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

export const ServerAdminRouter = router;
