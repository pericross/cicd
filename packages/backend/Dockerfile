FROM node:16-alpine

# 安装 SSH 客户端和 rsync (后端需要SSH连接到其他服务器)
RUN apk add --no-cache openssh-client rsync

WORKDIR /app

# 复制 package.json 和安装依赖
COPY package.json ./
RUN npm install --production

# 复制构建后的代码
COPY dist/ ./dist/

# 设置环境变量
ENV PORT=3001
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["node", "dist/index.js"]
