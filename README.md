# CICD Platform

统一CI/CD平台，用于软件产品的远程发布和健康性能监控。

## 功能特性

- **Web控制台**: React前端，实时监控和管理
- **服务器管理**: 添加、编辑、删除部署服务器
- **健康检查**: 自动检测服务器和应用状态
- **自动化部署**: 一键部署应用到远程服务器
- **GitHub集成**: 支持GitHub Actions自动化流程
- **Docker支持**: 容器化部署管理
- **PM2进程管理**: Node.js应用进程管理
- **SSL证书检查**: 自动检查证书有效期

## 目录结构

```
├── frontend/                 # Web控制台前端 (React + TypeScript)
├── backend/                  # API服务后端 (Node.js)
├── scripts/                  # 运维脚本
│   ├── deploy-to-server.sh   # 部署脚本
│   ├── setup-server.sh       # 服务器初始化脚本
│   ├── health-check.sh       # 健康检查脚本
│   └── manage-servers.sh     # 服务器管理脚本
├── templates/                # 配置模板
│   └── test-config.json      # 测试配置
├── .github/workflows/        # GitHub Actions
│   ├── ci-cd.yml            # CI/CD流程
│   └── health-check.yml     # 健康检查
└── README.md
```

## 快速开始

### 1. 添加服务器

在Web控制台的"服务器管理"页面添加目标服务器：

1. 点击"添加服务器"
2. 填写服务器信息（名称、IP、SSH用户）
3. 将控制台显示的SSH公钥添加到服务器 `~/.ssh/authorized_keys`
4. 点击"测试连接"确认连通性

### 2. 部署应用

**方式一：通过Web控制台**
1. 进入"应用管理"页面
2. 选择目标服务器
3. 上传构建产物或连接GitHub仓库
4. 点击部署

**方式二：通过GitHub Actions**
1. 配置GitHub Secrets
2. 推送代码到对应分支自动触发部署

### 3. 配置GitHub Secrets

在GitHub仓库Settings > Secrets中添加：

- `SSH_PRIVATE_KEY`: SSH私钥
- `STAGING_HOST`: 预发服务器地址
- `STAGING_USER`: 预发服务器用户名
- `PRODUCTION_HOST`: 生产服务器地址
- `PRODUCTION_USER`: 生产服务器用户名

## 运维脚本

### 健康检查

```bash
./scripts/health-check.sh <url> [expected-status-code]
```

### 服务器初始化

在目标服务器上运行：

```bash
curl -sL https://raw.githubusercontent.com/pericross/cicd/main/scripts/setup-server.sh | sudo bash
```

### 部署到服务器

```bash
./scripts/deploy-to-server.sh <server-host> <project-name> [environment]
```

## 许可证

MIT
