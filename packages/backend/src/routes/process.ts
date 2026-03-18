import { Router } from 'express';
import { SSHService } from '../services/ssh';
import config from '../config';

const router = Router();

interface ProcessInfo {
  name: string;
  id: string;
  status: string;
  restarts: number;
  uptime: string;
  cpu: string;
  memory: string;
}

/**
 * GET /api/process/list
 * 获取PM2进程列表
 */
router.get('/list', async (req, res) => {
  try {
    const ssh = new SSHService();
    await ssh.connect();

    const output = await ssh.exec('pm2 jlist');
    ssh.disconnect();

    let processes: any[] = [];
    try {
      processes = JSON.parse(output);
    } catch {
      // 如果解析失败，尝试解析pm2 list格式
      processes = parsePM2List(output);
    }

    res.json({
      success: true,
      processes
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * GET /api/process/info/:name
 * 获取指定进程信息
 */
router.get('/info/:name', async (req, res) => {
  const { name } = req.params;

  try {
    const ssh = new SSHService();
    await ssh.connect();

    const output = await ssh.exec(`pm2 jlist | grep -o '"name":"${name}"[^}]*}' || pm2 show ${name}`);
    ssh.disconnect();

    let info: any = null;
    try {
      const processes = JSON.parse(output);
      info = processes.find((p: any) => p.name === name);
    } catch {
      info = parsePM2Show(output);
    }

    if (!info) {
      return res.status(404).json({
        success: false,
        message: `Process '${name}' not found`
      });
    }

    res.json({
      success: true,
      process: info
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * POST /api/process/start
 * 启动进程
 */
router.post('/start', async (req, res) => {
  const { name, script, args, instances, exec_mode } = req.body;

  if (!name || !script) {
    return res.status(400).json({
      success: false,
      message: '请提供 name 和 script 参数'
    });
  }

  try {
    const ssh = new SSHService();
    await ssh.connect();

    let cmd = `pm2 start ${script} --name ${name}`;
    
    if (args) cmd += ` -- ${args}`;
    if (instances) cmd += ` --instances ${instances}`;
    if (exec_mode) cmd += ` --exec-mode ${exec_mode}`;

    const output = await ssh.exec(cmd);
    await ssh.exec('pm2 save');

    ssh.disconnect();

    res.json({
      success: true,
      message: `Process '${name}' started`,
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
 * POST /api/process/stop
 * 停止进程
 */
router.post('/stop', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: '请提供 name 参数'
    });
  }

  try {
    const ssh = new SSHService();
    await ssh.connect();

    const output = await ssh.exec(`pm2 stop ${name}`);
    await ssh.exec('pm2 save');

    ssh.disconnect();

    res.json({
      success: true,
      message: `Process '${name}' stopped`,
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
 * POST /api/process/restart
 * 重启进程
 */
router.post('/restart', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: '请提供 name 参数'
    });
  }

  try {
    const ssh = new SSHService();
    await ssh.connect();

    const output = await ssh.exec(`pm2 restart ${name}`);

    ssh.disconnect();

    res.json({
      success: true,
      message: `Process '${name}' restarted`,
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
 * POST /api/process/delete
 * 删除进程
 */
router.post('/delete', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: '请提供 name 参数'
    });
  }

  try {
    const ssh = new SSHService();
    await ssh.connect();

    const output = await ssh.exec(`pm2 delete ${name}`);
    await ssh.exec('pm2 save');

    ssh.disconnect();

    res.json({
      success: true,
      message: `Process '${name}' deleted`,
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
 * GET /api/process/logs/:name
 * 获取进程日志
 */
router.get('/logs/:name', async (req, res) => {
  const { name } = req.params;
  const { lines = 100, out = false, err = false } = req.query;

  try {
    const ssh = new SSHService();
    await ssh.connect();

    let cmd = `pm2 logs ${name} --nostream --lines ${lines}`;
    if (out) cmd += ' --out';
    if (err) cmd += ' --err';

    const output = await ssh.exec(cmd);
    ssh.disconnect();

    res.json({
      success: true,
      name,
      logs: output
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * GET /api/process/monitor
 * 实时监控数据
 */
router.get('/monitor', async (req, res) => {
  try {
    const ssh = new SSHService();
    await ssh.connect();

    // 获取CPU和内存使用
    const output = await ssh.exec('pm2 monit json 2>/dev/null || pm2 jlist');
    ssh.disconnect();

    let data: any[] = [];
    try {
      data = JSON.parse(output);
    } catch {
      data = [];
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * POST /api/process/reload
 * 零 downtime 重载
 */
router.post('/reload', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: '请提供 name 参数'
    });
  }

  try {
    const ssh = new SSHService();
    await ssh.connect();

    const output = await ssh.exec(`pm2 reload ${name}`);

    ssh.disconnect();

    res.json({
      success: true,
      message: `Process '${name}' reloaded`,
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
 * 解析pm2 list输出
 */
function parsePM2List(output: string): ProcessInfo[] {
  const lines = output.split('\n').filter(l => l.trim());
  const processes: ProcessInfo[] = [];

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length >= 6) {
      processes.push({
        name: parts[0],
        id: parts[1],
        status: parts[2],
        restarts: parseInt(parts[3]) || 0,
        uptime: parts[4] || '-',
        cpu: parts[5] || '0',
        memory: parts[6] || '0'
      });
    }
  }

  return processes;
}

/**
 * 解析pm2 show输出
 */
function parsePM2Show(output: string): any {
  const info: any = {};
  const lines = output.split('\n');

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      info[key.trim().toLowerCase().replace(/\s+/g, '_')] = valueParts.join(':').trim();
    }
  }

  return info;
}

export const ProcessRouter = router;
