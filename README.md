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
├── packages/
│   ├── frontend/          # Web控制台 (React + TypeScript)
│   └── backend/           # API服务 (Express + Node.js)
├── scripts/               # 运维脚本
│   ├── deploy-to-server.sh
│   ├── setup-server.sh
│   ├── health-check.sh
│   └── manage-servers.sh
├── templates/             # 配置模板
│   └── test-config.json
├── .github/workflows/      # GitHub Actions
│   ├── ci-cd.yml
│   └── health-check.yml
└── package.json           # Monorepo根配置
```

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发

```bash
# 启动全部服务
pnpm dev

# 仅前端
pnpm dev:frontend

# 仅后端
pnpm dev:backend
```

### 构建

```bash
# 构建全部
pnpm build

# 仅前端
pnpm build:frontend

# 仅后端
pnpm build:backend
```

### 添加服务器

在Web控制台的"服务器管理"页面添加目标服务器，将SSH公钥添加到服务器 `~/.ssh/authorized_keys`。

### 部署应用

**方式一：通过Web控制台**
1. 进入"应用管理"页面
2. 选择目标服务器
3. 上传构建产物或连接GitHub仓库
4. 点击部署

**方式二：通过GitHub Actions**
1. 配置GitHub Secrets
2. 推送代码到对应分支自动触发部署

## 运维脚本

### 健康检查
```bash
./scripts/health-check.sh <url> [expected-status-code]
```

### 服务器初始化
```bash
curl -sL https://raw.githubusercontent.com/pericross/cicd/main/scripts/setup-server.sh | sudo bash
```

### 部署到服务器
```bash
./scripts/deploy-to-server.sh <server-host> <project-name> [environment]
```

## 许可证

MIT
