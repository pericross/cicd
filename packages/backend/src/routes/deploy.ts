import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { GitHubService } from '../services/github';
import { SSHService } from '../services/ssh';
import { broadcastLog, broadcastStatus } from '../index';
import config from '../config';
import { execSync } from 'child_process';

const router = Router();

// 存储部署任务状态
const deployments = new Map<string, any>();

/**
 * POST /api/deploy/github
 * 从GitHub仓库部署应用到远程服务器
 */
router.post('/github', async (req, res) => {
  const deploymentId = uuidv4();
  
  // 解构请求参数
  const {
    owner,           // GitHub仓库所有者
    repo,            // 仓库名
    branch,          // 分支名，默认main
    imageName,       // 镜像名称
    imageTag,        // 镜像标签
    containerName,   // 容器名称
    containerPort,   // 容器端口
    hostPort,        // 主机端口
    envVars,         // 环境变量
  } = req.body;
  
  if (!owner || !repo) {
    return res.status(400).json({
      success: false,
      message: '请提供 owner 和 repo 参数'
    });
  }
  
  // 创建部署记录
  const deployment = {
    id: deploymentId,
    type: 'github',
    source: `${owner}/${repo}`,
    branch: branch || 'main',
    status: 'pending',
    createdAt: new Date().toISOString(),
    params: {
      imageName: imageName || `${repo}-${Date.now()}`,
      imageTag: imageTag || 'latest',
      containerName: containerName || repo,
      containerPort: containerPort || 3000,
      hostPort: hostPort || 3000,
      envVars: envVars || {}
    }
  };
  
  deployments.set(deploymentId, deployment);
  
  // 立即返回，让部署在后台执行
  res.json({
    success: true,
    deploymentId,
    status: 'pending',
    message: '部署任务已创建'
  });
  
  // 在后台执行部署
  executeGitHubDeployment(deploymentId, req.body);
});

/**
 * 执行从GitHub仓库的部署
 */
async function executeGitHubDeployment(deploymentId: string, params: any) {
  const {
    owner,
    repo,
    branch,
    imageName,
    imageTag,
    containerName,
    containerPort,
    hostPort,
    envVars
  } = params;
  
  const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[${deploymentId}] ${msg}`);
    broadcastLog(deploymentId, `[${timestamp}] ${msg}\n`);
  };
  
  const ghService = new GitHubService();
  
  try {
    // Step 1: 克隆/更新仓库
    log('='.repeat(50));
    log('🚀 开始从GitHub部署');
    log(`📦 仓库: ${owner}/${repo}`);
    log(`🌿 分支: ${branch || 'main'}`);
    log('='.repeat(50));
    
    broadcastStatus(deploymentId, 'cloning');
    log('\n📥 步骤1/6: 克隆GitHub仓库...');
    
    const repoPath = await ghService.cloneOrPull(owner, repo, branch || 'main');
    log(`✅ 代码已克隆到: ${repoPath}`);
    
    // Step 2: 构建Docker镜像
    broadcastStatus(deploymentId, 'building');
    log('\n🐳 步骤2/6: 构建Docker镜像...');
    
    const finalImageName = imageName || `${repo}-${Date.now()}`;
    const finalImageTag = imageTag || 'latest';
    
    try {
      execSync(`docker build -t ${finalImageName}:${finalImageTag} "${repoPath}"`, {
        stdio: 'inherit'
      });
      log(`✅ 镜像构建成功: ${finalImageName}:${finalImageTag}`);
    } catch (err: any) {
      log(`❌ Docker构建失败: ${err.message}`);
      broadcastStatus(deploymentId, 'failed');
      deployments.set(deploymentId, { ...deployments.get(deploymentId), status: 'failed', error: err.message });
      return;
    }
    
    // Step 3: 导出镜像为tar
    broadcastStatus(deploymentId, 'saving');
    log('\n💾 步骤3/6: 导出Docker镜像...');
    
    const tarPath = `/tmp/${finalImageName}.${Date.now()}.tar`;
    try {
      execSync(`docker save -o ${tarPath} ${finalImageName}:${finalImageTag}`);
      log(`✅ 镜像已保存到: ${tarPath}`);
    } catch (err: any) {
      log(`❌ 镜像导出失败: ${err.message}`);
      broadcastStatus(deploymentId, 'failed');
      return;
    }
    
    // Step 4: SSH连接远程服务器
    broadcastStatus(deploymentId, 'connecting');
    log(`\n🔌 步骤4/6: 连接到远程服务器 ${config.remote.host}...`);
    
    const ssh = new SSHService();
    try {
      await ssh.connect();
      log('✅ SSH连接成功');
    } catch (err: any) {
      log(`❌ SSH连接失败: ${err.message}`);
      broadcastStatus(deploymentId, 'failed');
      execSync(`rm -f ${tarPath}`);
      return;
    }
    
    // Step 5: 上传镜像到远程服务器
    broadcastStatus(deploymentId, 'transferring');
    log('\n📤 步骤5/6: 上传镜像到远程服务器...');
    
    const remoteTarPath = `/tmp/${finalImageName}.tar`;
    try {
      await ssh.uploadFile(tarPath, remoteTarPath);
      log('✅ 镜像上传完成');
    } catch (err: any) {
      log(`❌ 上传失败: ${err.message}`);
      broadcastStatus(deploymentId, 'failed');
      ssh.disconnect();
      execSync(`rm -f ${tarPath}`);
      return;
    }
    
    // 删除本地tar
    execSync(`rm -f ${tarPath}`);
    
    // Step 6: 远程服务器部署
    broadcastStatus(deploymentId, 'deploying');
    log('\n🐳 步骤6/6: 远程服务器部署容器...');
    
    try {
      // 加载镜像
      log('  - 加载Docker镜像...');
      await ssh.exec(`docker load -i ${remoteTarPath}`);
      
      // 构建运行命令
      const finalContainerName = containerName || repo;
      const finalContainerPort = containerPort || 3000;
      const finalHostPort = hostPort || 3000;
      
      let runCmd = `docker stop ${finalContainerName} 2>/dev/null || true && docker rm ${finalContainerName} 2>/dev/null || true && docker run -d --name ${finalContainerName}`;
      runCmd += ` -p ${finalHostPort}:${finalContainerPort}`;
      
      // 环境变量
      const allEnvVars = { ...config.deployment.envVars, ...envVars };
      for (const [key, value] of Object.entries(allEnvVars)) {
        runCmd += ` -e ${key}=${value}`;
      }
      
      // 镜像
      runCmd += ` ${finalImageName}:${finalImageTag}`;
      
      log('  - 启动容器...');
await ssh.exec(runCmd);
      
      // 清理远程tar
      await ssh.exec(`rm -f ${remoteTarPath}`);
      
      log('✅ 容器启动成功');
      
    } catch (err: any) {
      log(`❌ 部署失败: ${err.message}`);
      broadcastStatus(deploymentId, 'failed');
      ssh.disconnect();
      return;
    }
    
    // 关闭SSH
    ssh.disconnect();
    
    // 完成
    log('\n' + '='.repeat(50));
    log('🎉 部署完成！');
    log(`🌐 应用已部署到: http://${config.remote.host}:${hostPort || 3000}`);
    log('='.repeat(50));
    
    broadcastStatus(deploymentId, 'success');
    deployments.set(deploymentId, {
      ...deployments.get(deploymentId),
      status: 'success',
      completedAt: new Date().toISOString(),
      url: `http://${config.remote.host}:${hostPort || 3000}`
    });
    
  } catch (error: any) {
    log(`\n❌ 部署异常: ${error.message}`);
    broadcastStatus(deploymentId, 'failed');
    deployments.set(deploymentId, {
      ...deployments.get(deploymentId),
      status: 'failed',
      error: error.message
    });
  }
}

/**
 * POST /api/deploy
 * 通用部署接口（保持向后兼容）
 */
router.post('/', async (req, res) => {
  // 如果没有GitHub信息，返回错误
  res.json({
    success: false,
    message: '请使用 /api/deploy/github 接口进行部署'
  });
});

/**
 * GET /api/deploy/:id
 * 获取部署状态
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const deployment = deployments.get(id);
  
  if (!deployment) {
    return res.status(404).json({
      success: false,
      message: '部署任务不存在'
    });
  }
  
  res.json({
    success: true,
    deployment
  });
});

/**
 * GET /api/deploy
 * 获取所有部署记录
 */
router.get('/', (req, res) => {
  const allDeployments = Array.from(deployments.values()).reverse();
  
  res.json({
    success: true,
    deployments: allDeployments
  });
});

export const DeployRouter = router;
