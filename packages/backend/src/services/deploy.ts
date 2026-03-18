import { Client, ConnectConfig } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';
import { Writable } from 'stream';
import config from '../config';
import { broadcastLog, broadcastStatus } from '../index';

interface DeployResult {
  success: boolean;
  message: string;
  logs: string[];
}

class SSHService {
  private client: Client;
  
  constructor() {
    this.client = new Client();
  }
  
  /**
   * 连接到远程服务器
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const connConfig: ConnectConfig = {
        host: config.remote.host,
        port: config.remote.port,
        username: config.remote.username,
      };
      
      if (config.remote.authType === 'key' && config.remote.privateKeyPath) {
        try {
          connConfig.privateKey = fs.readFileSync(config.remote.privateKeyPath);
        } catch (err) {
          reject(new Error(`无法读取SSH私钥: ${config.remote.privateKeyPath}`));
          return;
        }
      } else if (config.remote.password) {
        connConfig.password = config.remote.password;
      }
      
      this.client.on('ready', () => {
        console.log('✅ SSH连接成功');
        resolve();
      });
      
      this.client.on('error', (err) => {
        console.error('❌ SSH连接失败:', err.message);
        reject(err);
      });
      
      this.client.connect(connConfig);
    });
  }
  
  /**
   * 执行远程命令
   */
  async exec(command: string, deploymentId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        
        let output = '';
        
        stream.on('close', (code: number) => {
          if (code !== 0 && code !== null) {
            // Some commands may have non-zero exit but still succeed
            console.log(`Command exited with code: ${code}`);
          }
          resolve(output);
        });
        
        stream.on('data', (data: Buffer) => {
          const str = data.toString();
          output += str;
          if (deploymentId) {
            broadcastLog(deploymentId, str);
          }
        });
        
        stream.stderr.on('data', (data: Buffer) => {
          const str = data.toString();
          output += str;
          if (deploymentId) {
            broadcastLog(deploymentId, `[stderr] ${str}`);
          }
        });
      });
    });
  }
  
  /**
   * 上传文件到远程服务器
   */
  async uploadFile(localPath: string, remotePath: string, deploymentId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }
        
        sftp.fastPut(localPath, remotePath, {}, (err) => {
          if (err) {
            reject(err);
            return;
          }
          if (deploymentId) {
            broadcastLog(deploymentId, `📤 已上传: ${path.basename(localPath)}\n`);
          }
          resolve();
        });
      });
    });
  }
  
  /**
   * 从远程服务器下载文件
   */
  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }
        
        sftp.fastGet(remotePath, localPath, {}, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }
  
  /**
   * 关闭连接
   */
  disconnect(): void {
    this.client.end();
  }
}

/**
 * 部署服务
 */
export class DeployService {
  private deploymentId: string;
  
  constructor(deploymentId: string) {
    this.deploymentId = deploymentId;
  }
  
  /**
   * 执行完整部署流程
   * 
   * 流程：
   * 1. 本地构建Docker镜像
   * 2. 导出镜像为tar文件
   * 3. SSH传输到远程服务器
   * 4. 远程服务器加载镜像
   * 5. 停止旧容器
   * 6. 运行新容器
   */
  async execute(): Promise<DeployResult> {
    const logs: string[] = [];
    const addLog = (msg: string) => {
      const timestamp = new Date().toISOString();
      const log = `[${timestamp}] ${msg}`;
      logs.push(log);
      broadcastLog(this.deploymentId, log + '\n');
    };
    
    try {
      addLog('🚀 开始部署流程...');
      broadcastStatus(this.deploymentId, 'building');
      
      const { deployment } = config;
      
      // Step 1: 构建Docker镜像
      addLog('📦 步骤1/5: 构建Docker镜像...');
      await this.buildImage(deployment.imageName, deployment.imageTag, deployment.buildContext);
      addLog('✅ Docker镜像构建成功');
      
      // Step 2: 导出镜像
      addLog('💾 步骤2/5: 导出镜像为tar文件...');
      const tarPath = await this.saveImage(deployment.imageName, deployment.imageTag);
      addLog(`✅ 镜像已保存到: ${tarPath}`);
      
      // Step 3: SSH连接到远程服务器
      addLog(`🔌 步骤3/5: 连接到远程服务器 ${config.remote.host}...`);
      const ssh = new SSHService();
      await ssh.connect();
      addLog('✅ SSH连接成功');
      
      // Step 4: 上传镜像到远程服务器
      addLog('📤 步骤4/5: 上传镜像到远程服务器...');
      const remoteTarPath = `/tmp/${deployment.imageName}.tar`;
      await ssh.uploadFile(tarPath, remoteTarPath, this.deploymentId);
      addLog('✅ 镜像上传完成');
      
      // 删除本地tar文件释放空间
      fs.unlinkSync(tarPath);
      
      // Step 5: 远程服务器加载镜像并运行容器
      addLog('🐳 步骤5/5: 远程服务器部署容器...');
      
      // 加载镜像
      addLog('  - 加载Docker镜像...');
      await ssh.exec(`docker load -i ${remoteTarPath}`, this.deploymentId);
      
      // 构建容器运行命令
      let runCmd = `docker stop ${deployment.containerName} 2>/dev/null || true && docker rm ${deployment.containerName} 2>/dev/null || true && docker run -d --name ${deployment.containerName}`;
      
      // 添加端口映射
      runCmd += ` -p ${deployment.hostPort}:${deployment.containerPort}`;
      
      // 添加环境变量
      if (deployment.envVars) {
        for (const [key, value] of Object.entries(deployment.envVars)) {
          runCmd += ` -e ${key}=${value}`;
        }
      }
      
      // 添加卷挂载
      if (deployment.volumes) {
        for (const vol of deployment.volumes) {
          runCmd += ` -v ${vol.hostPath}:${vol.containerPath}${vol.readOnly ? ':ro' : ''}`;
        }
      }
      
      // 添加镜像
      runCmd += ` ${deployment.imageName}:${deployment.imageTag}`;
      
      // 执行部署命令
      addLog('  - 启动容器...');
      await ssh.exec(runCmd, this.deploymentId);
      
      // 清理远程tar文件
      await ssh.exec(`rm -f ${remoteTarPath}`);
      
      // 关闭SSH连接
      ssh.disconnect();
      
      addLog('🎉 部署完成！');
      broadcastStatus(this.deploymentId, 'success');
      
      return {
        success: true,
        message: '部署成功',
        logs,
      };
      
    } catch (error: any) {
      addLog(`❌ 部署失败: ${error.message}`);
      broadcastStatus(this.deploymentId, 'failed');
      
      return {
        success: false,
        message: error.message,
        logs,
      };
    }
  }
  
  /**
   * 构建Docker镜像
   */
  private async buildImage(imageName: string, imageTag: string, context: string): Promise<void> {
    const Docker = require('dockerode');
    const docker = new Docker();
    
    return new Promise((resolve, reject) => {
      docker.buildImage(
        {
          context: context,
          src: ['Dockerfile', 'package.json', 'src'] // 需要根据实际项目调整
        },
        {
          t: `${imageName}:${imageTag}`,
          dockerfile: 'Dockerfile'
        },
        (err: any, stream: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          docker.modem.followProgress(stream, (err: any, output: any) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      );
    });
  }
  
  /**
   * 保存Docker镜像为tar文件
   */
  private async saveImage(imageName: string, imageTag: string): Promise<string> {
    const Docker = require('dockerode');
    const docker = new Docker();
    const path = require('path');
    const os = require('os');
    
    const image = docker.getImage(`${imageName}:${imageTag}`);
    const tarPath = path.join(os.tmpdir(), `${imageName}.tar`);
    
    return new Promise((resolve, reject) => {
      const stream = image.tarLayer();
      const fs = require('fs');
      const writeStream = fs.createWriteStream(tarPath);
      
      stream.pipe(writeStream);
      
      writeStream.on('finish', () => {
        resolve(tarPath);
      });
      
      writeStream.on('error', reject);
    });
  }
}

export default DeployService;
