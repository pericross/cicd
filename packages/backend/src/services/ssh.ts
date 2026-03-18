import { Client, ConnectConfig } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import config from '../config';

// 检查是否连接到本地服务器
const isLocalHost = (host: string) => {
  return host === 'localhost' || 
         host === '127.0.0.1' || 
         host === config.remote.host || 
         host === '0.0.0.0';
};

export class SSHService {
  private client: Client;
  private isLocal: boolean;
  
  constructor() {
    this.client = new Client();
    this.isLocal = isLocalHost(config.remote.host);
  }
  
  /**
   * 连接到远程服务器
   */
  async connect(): Promise<void> {
    // 如果是本地服务器，直接返回
    if (this.isLocal) {
      return Promise.resolve();
    }
    
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
        resolve();
      });
      
      this.client.on('error', (err) => {
        reject(err);
      });
      
      this.client.connect(connConfig);
    });
  }
  
  /**
   * 执行远程命令
   */
  async exec(command: string): Promise<string> {
    // 如果是本地服务器，直接执行命令
    if (this.isLocal) {
      try {
        return execSync(command, { encoding: 'utf-8', timeout: 30000 });
      } catch (err: any) {
        return err.stdout || err.message || '';
      }
    }
    
    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        
        let output = '';
        
        stream.on('close', (code: number) => {
          resolve(output);
        });
        
        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        stream.stderr.on('data', (data: Buffer) => {
          output += data.toString();
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
          } else {
            resolve();
          }
        });
      });
    });
  }
  
  /**
   * 下载文件
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
          } else {
            resolve();
          }
        });
      });
    });
  }
  
  /**
   * 关闭连接
   */
  disconnect(): void {
    if (!this.isLocal) {
      this.client.end();
    }
  }
}

export default SSHService;
