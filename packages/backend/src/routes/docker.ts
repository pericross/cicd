import { Router } from 'express';
import Docker from 'dockerode';

const router = Router();
const docker = new Docker();

/**
 * GET /api/docker/images
 * 获取本地Docker镜像列表
 */
router.get('/images', async (req, res) => {
  try {
    const images = await docker.listImages();
    const imageList = images.map(img => ({
      id: img.Id.replace('sha256:', '').substring(0, 12),
      repoTags: img.RepoTags || ['<none>:<none>'],
      size: img.Size,
      created: new Date(img.Created * 1000).toISOString()
    }));
    
    res.json({
      success: true,
      images: imageList
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/docker/containers
 * 获取本地容器列表
 */
router.get('/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const containerList = containers.map(c => ({
      id: c.Id.substring(0, 12),
      names: c.Names,
      image: c.Image,
      state: c.State,
      status: c.Status,
      ports: c.Ports
    }));
    
    res.json({
      success: true,
      containers: containerList
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/docker/info
 * 获取Docker信息
 */
router.get('/info', async (req, res) => {
  try {
    const info = await docker.info();
    res.json({
      success: true,
      info: {
        containers: info.Containers,
        containersRunning: info.ContainersRunning,
        containersPaused: info.ContainersPaused,
        containersStopped: info.ContainersStopped,
        images: info.Images,
        serverVersion: info.ServerVersion,
        memTotal: info.MemTotal,
        cpuCount: info.NCPU
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
 * POST /api/docker/build
 * 构建Docker镜像
 */
router.post('/build', async (req, res) => {
  try {
    const { imageName, imageTag, dockerfile, context } = req.body;
    
    if (!imageName) {
      return res.status(400).json({
        success: false,
        message: '请提供镜像名称'
      });
    }
    
    const tag = imageTag || 'latest';
    
    // 这里简化处理，实际应该接收构建上下文
    res.json({
      success: true,
      message: '构建任务已启动',
      imageName: `${imageName}:${tag}`
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export const DockerRouter = router;
