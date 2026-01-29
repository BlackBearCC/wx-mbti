FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY dist ./dist

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["node", "dist/index.js"]
