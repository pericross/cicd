import { Router } from 'express';
import { SSHService } from '../services/ssh';
import config from '../config';

const router = Router();

/**
 * GET /api/server/health
 * 获取远程服务器综合健康状态
 */
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const ssh = new SSHService();
    await ssh.connect();
    
    // 并行获取多个指标
    const [
      uptimeResult,
      cpuResult,
      memResult,
      diskResult,
      dockerResult,
      loadResult
    ] = await Promise.all([
      ssh.exec('uptime -p'),
      ssh.exec("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1"),
      ssh.exec("free -m | grep Mem | awk '{print $2,$3,$4}'"),
      ssh.exec("df -hT / | tail -1 | awk '{print $2,$3,$4,$5,$7}'"),
      ssh.exec('docker version --format "{{.Server.Version}}" 2>/dev/null || echo "not-installed"'),
      ssh.exec("cat /proc/loadavg")
    ]);
    
    // 解析内存
    const memParts = memResult.trim().split(/\s+/);
    const memTotal = parseInt(memParts[0]) || 0;
    const memUsed = parseInt(memParts[1]) || 0;
    const memFree = parseInt(memParts[2]) || 0;
    
    // 解析磁盘
    const diskParts = diskResult.trim().split(/\s+/);
    
    // 解析负载
    const loadParts = loadResult.trim().split(/\s+/);
    
    ssh.disconnect();
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      status: 'online',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      system: {
        hostname: config.remote.host,
        uptime: uptimeResult.trim(),
        cpu: {
          usage_percent: parseFloat(cpuResult.trim()) || 0,
          load_avg: {
            '1m': parseFloat(loadParts[0]) || 0,
            '5m': parseFloat(loadParts[1]) || 0,
            '15m': parseFloat(loadParts[2]) || 0
          }
        },
        memory: {
          total_mb: memTotal,
          used_mb: memUsed,
          free_mb: memFree,
          usage_percent: memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0
        },
        disk: {
          total: diskParts[0] || '0',
          used: diskParts[1] || '0',
          available: diskParts[2] || '0',
          usage_percent: parseInt(diskParts[3]?.replace('%', '')) || 0,
          mount: diskParts[4] || '/'
        }
      },
      runtime: {
        docker: {
          installed: dockerResult.trim() !== 'not-installed',
          version: dockerResult.trim()
        }
      }
    });
    
  } catch (error: any) {
    res.json({
      success: false,
      status: 'offline',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /api/server/containers
 * 获取远程服务器所有容器（应用列表）
 */
router.get('/containers', async (req, res) => {
  try {
    const ssh = new SSHService();
    await ssh.connect();
    
    // 获取所有容器（包括停止的）
    const containersOutput = await ssh.exec('docker ps -a --format "{{json .}}"');
    
    // 获取容器实时资源使用
    let statsOutput = '';
    try {
      statsOutput = await ssh.exec('docker stats --no-stream --format "{{json .}}"');
    } catch (e) {
      // 如果获取失败，继续
    }
    
    // 解析stats为map
    const statsMap = new Map();
    if (statsOutput) {
      statsOutput.split('\n').filter(Boolean).forEach(line => {
        try {
          const stat = JSON.parse(line);
          statsMap.set(stat.Name, stat);
        } catch (e) {}
      });
    }
    
    // 解析容器列表
    const containers = containersOutput.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          const c = JSON.parse(line);
          const stats = statsMap.get(c.Names) || {};
          
          // 解析CPU和内存
          const cpuPercent = parseFloat(stats.CPUPerc || '0%') || 0;
          const memValue = stats.MemUsage || '0MiB / 0GiB';
          const memMatch = memValue.match(/([\d.]+)(MiB|GiB)/);
          const memPercent = parseFloat(stats.MemPerc || '0%') || 0;
          
          return {
            id: c.ID,
            name: c.Names,
            image: c.Image,
            state: c.State,
            status: c.Status,
            created: c.CreatedAt,
            ports: c.Ports || '-',
            // 资源使用
            cpu_percent: cpuPercent,
            memory_usage: memValue,
            memory_percent: memPercent
          };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
    
    // 获取运行中的容器数量
    const runningCount = await ssh.exec('docker ps -q | wc -l');
    
    ssh.disconnect();
    
    res.json({
      success: true,
      count: containers.length,
      running_count: parseInt(runningCount.trim()) || 0,
      containers: containers
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/server/metrics
 * 获取服务器性能指标（详细版）
 */
router.get('/metrics', async (req, res) => {
  try {
    const ssh = new SSHService();
    await ssh.connect();
    
    // CPU使用率
    const cpu = await ssh.exec("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1");
    
    // 内存详情
    const mem = await ssh.exec("free -m | grep Mem | awk '{print $2,$3,$4,$5,$6}'");
    const memParts = mem.trim().split(/\s+/);
    
    // 磁盘详情
    const disk = await ssh.exec("df -h / | tail -1 | awk '{print $2,$3,$4,$5}'");
    const diskParts = disk.trim().split(/\s+/);
    
    // 网络IO
    const network = await ssh.exec("cat /proc/net/dev | grep -E 'eth0|ens|enp' | head -1 | awk '{print $2,$10}'");
    const netParts = network.trim().split(/\s+/);
    
    // 负载
    const load = await ssh.exec("cat /proc/loadavg | awk '{print $1,$2,$3}'");
    const loadParts = load.trim().split(/\s+/);
    
    // Docker状态
    const dockerInfo = await ssh.exec('docker info --format "{{.ServerVersion}},{{.Containers}},{{.ContainersRunning}},{{.Images}}"');
    const dockerParts = dockerInfo.trim().split(',');
    
    ssh.disconnect();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      cpu: {
        usage_percent: parseFloat(cpu.trim()) || 0,
        load_1m: parseFloat(loadParts[0]) || 0,
        load_5m: parseFloat(loadParts[1]) || 0,
        load_15m: parseFloat(loadParts[2]) || 0
      },
      memory: {
        total_mb: parseInt(memParts[0]) || 0,
        used_mb: parseInt(memParts[1]) || 0,
        free_mb: parseInt(memParts[2]) || 0,
        available_mb: parseInt(memParts[3]) || 0,
        buffers_mb: parseInt(memParts[4]) || 0,
        usage_percent: memParts[0] ? Math.round((parseInt(memParts[1]) / parseInt(memParts[0])) * 100) : 0
      },
      disk: {
        total: diskParts[0] || '0',
        used: diskParts[1] || '0',
        available: diskParts[2] || '0',
        usage_percent: parseInt(diskParts[3]?.replace('%', '')) || 0
      },
      network: {
        rx_bytes: parseInt(netParts[0]) || 0,
        tx_bytes: parseInt(netParts[1]) || 0
      },
      docker: {
        version: dockerParts[0] || 'N/A',
        total_containers: parseInt(dockerParts[1]) || 0,
        running_containers: parseInt(dockerParts[2]) || 0,
        images: parseInt(dockerParts[3]) || 0
      }
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/server/container/:action/:containerName
 * 容器操作（start/stop/restart/remove）
 */
router.post('/container/:action/:containerName', async (req, res) => {
  const { action, containerName } = req.params;
  const validActions = ['start', 'stop', 'restart', 'remove', 'logs'];
  
  if (!validActions.includes(action)) {
    return res.status(400).json({
      success: false,
      message: '无效的操作'
    });
  }
  
  try {
    const ssh = new SSHService();
    await ssh.connect();
    
    let cmd = '';
    switch (action) {
      case 'start':
        cmd = `docker start ${containerName}`;
        break;
      case 'stop':
        cmd = `docker stop ${containerName}`;
        break;
      case 'restart':
        cmd = `docker restart ${containerName}`;
        break;
      case 'remove':
        cmd = `docker stop ${containerName} && docker rm ${containerName}`;
        break;
      case 'logs':
        cmd = `docker logs --tail 50 ${containerName}`;
        break;
    }
    
    const output = await ssh.exec(cmd);
    ssh.disconnect();
    
    res.json({
      success: true,
      action,
      container: containerName,
      output: action === 'logs' ? output : undefined,
      message: `${action} 操作成功`
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/server/status
 * 获取远程服务器简明状态（兼容旧版）
 */
router.get('/status', async (req, res) => {
  try {
    const ssh = new SSHService();
    
    try {
      await ssh.connect();
      
      // 获取系统信息
      const uptime = await ssh.exec('uptime');
      const df = await ssh.exec('df -h / | tail -1');
      const dockerVersion = await ssh.exec('docker --version');
      const containerCount = await ssh.exec('docker ps -q | wc -l');
      
      // 获取容器简要列表
      const containers = await ssh.exec('docker ps --format "{{.Names}}|{{.Status}}|{{.Ports}}"');
      const containerList = containers.split('\n')
        .filter(c => c.trim())
        .map(c => {
          const [name, status, ports] = c.split('|');
          return { name, status, ports };
        });
      
      ssh.disconnect();
      
      res.json({
        success: true,
        server: {
          host: config.remote.host,
          status: 'online',
          uptime: uptime.trim(),
          disk: df.trim(),
          dockerVersion: dockerVersion.trim(),
          containers: containerList,
          containerCount: parseInt(containerCount.trim()) || 0
        }
      });
      
    } catch (err: any) {
      res.json({
        success: false,
        server: {
          host: config.remote.host,
          status: 'offline',
          error: err.message
        }
      });
    }
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export const ServerRouter = router;
