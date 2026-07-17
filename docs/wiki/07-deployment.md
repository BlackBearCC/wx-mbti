# 07 · 项目运行方式

本文档说明如何安装、配置、启动、预览与测试本项目。

---

## 7.1 环境要求

### 前端（微信小程序）
- Node.js `>= 14.0.0`
- 微信开发者工具（最新稳定版）
- 一个微信小程序 AppID

### 后端（mbtiserver）
- Node.js `>= 18`（需原生 `fetch` 支持；Docker 镜像用 `node:20-alpine`）
- 豆包 API Key（火山方舟 ARK）
- 可选：Docker + Docker Compose

### 外部后端（wx-mbti-server，独立仓库）
- Python 环境
- TLS 证书（mkcert 生成）
- 详见 `AGENTS.md`

---

## 7.2 前端启动

### 步骤 1：安装依赖

```bash
npm install
```

### 步骤 2：配置 `config.js`

文件：[config.js](../../config.js)

确保以下配置指向有效的 HTTPS/WSS 后端：

```javascript
export default {
  baseUrl: 'https://localhost:8000',
  aiWebSocketUrl: 'wss://localhost:8000/service/ws',
  assetBaseUrl: 'https://localhost:8000',
  enforceHttpsAssets: true,
  tabIcons: {
    home: '/static/ui/icons/tabs/home.svg',
    chat: '/static/ui/icons/tabs/chat.svg',
    user: '/static/ui/icons/tabs/user.svg',
  },
};
```

### 步骤 3：微信开发者工具配置

1. 打开微信开发者工具，导入项目根目录 `/workspace`。
2. 修改 `project.config.json` 中的 `appid` 为你的小程序 AppID。
3. 在小程序管理后台配置通信域名：
   - HTTPS 请求域名：你的 API 服务域名（如 `localhost` 仅开发用）
   - WebSocket 域名：你的 AI WebSocket 服务域名
4. **构建 npm**：工具菜单 → "构建 npm"（生成 `miniprogram_npm/`）。
5. 本地设置中勾选"不校验合法域名"（仅开发联调时，特别是对接 HTTP 的 mbtiserver :8080 时必需）。
6. 点击"编译"运行，使用"预览/真机调试"测试。

### 步骤 4：域名配置（生产）

在微信公众平台 → 开发设置 → 服务器域名中添加：
- request 合法域名：`https://<你的API域名>`
- socket 合法域名：`wss://<你的AI域名>`

---

## 7.3 后端启动（mbtiserver）

### 方式 A：本地开发（ts-node 直跑源码）

```bash
cd mbtiserver
npm install
cp .env.example .env
# 编辑 .env，填入 DOUBAO_API_KEY
npm run dev        # ts-node src/index.ts，默认端口 8080
```

### 方式 B：编译后运行（生产）

```bash
cd mbtiserver
npm install
npm run build      # tsc → dist/
npm start          # node dist/index.js
```

### 方式 C：Docker 部署

```bash
cd mbtiserver
npm run build                      # 先编译出 dist/
export DOUBAO_API_KEY=你的密钥
docker-compose up -d --build       # 启动 mbtiserver（:8080）
```

健康检查：`GET http://localhost:8080/api/health` → `{status:'ok', timestamp}`

### 环境变量配置

文件：[mbtiserver/.env.example](../../mbtiserver/.env.example)

```bash
PORT=8080
NODE_ENV=production
DOUBAO_API_KEY=your-doubao-api-key-here
DOUBAO_MODEL=doubao-seed-1.8-high
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

---

## 7.4 外部后端启动（wx-mbti-server，Python）

详见 `AGENTS.md`，要点：

1. 后端仓库路径：`C:\Users\TYZS\PycharmProjects\wx-mbti-server`。
2. 生成 TLS 证书（Windows，mkcert）：

```bash
mkcert -install
mkcert localhost 127.0.0.1
```

3. 启动（示例）：

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 \
  --ssl-keyfile .\localhost+2-key.pem \
  --ssl-certfile .\localhost+2.pem
```

4. 确保以下均可通过 `https://localhost:8000` 访问：
   - `/home/cards`、`/home/swipers`（首页，200 返回 HTTPS 图像）
   - `/api/characters/`、`/api/user/profile`（登录后 200）
   - `/service/ws`（WebSocket，仅 WSS）

---

## 7.5 测试

### 前端代码规范检查

```bash
npm run lint          # ESLint 检查
npm run lint:fix      # ESLint + Prettier 自动修复
```

### 后端单元测试

```bash
cd mbtiserver
npm test              # 运行所有 Jest 测试
npm run test:watch    # 监听模式
npm run test:coverage # 生成覆盖率报告
```

测试覆盖：
- `src/api.test.ts`：8 个端点的集成测试（独立 app 实例，2 道题）
- `src/__tests__/doubao.test.ts`：豆包代理测试（mock fetch）

---

## 7.6 开发联调验证要点（DevTools）

来自 `AGENTS.md`，均走 HTTPS/WSS：

- `/home/cards`、`/home/swipers` 图像均为 HTTPS 并可 200 返回。
- `/api/characters/`、`/api/user/profile` 登录后返回 200。
- WebSocket 仅连 `wss://<host>/service/ws`。
- 任何 HTTP 资源均视为错误（不允许）。

> 例外：`services/doubao.js` 直连 `http://localhost:8080`（mbtiserver），开发时需勾选"不校验合法域名"。

---

## 7.7 常用脚本速查

### 前端（根目录 package.json）
| 命令 | 作用 |
|------|------|
| `npm i` | 安装依赖 |
| `npm run lint` | ESLint 检查 |
| `npm run lint:fix` | ESLint + Prettier 自动修复 |

### 后端（mbtiserver/package.json）
| 命令 | 作用 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run dev` | 开发模式（ts-node 直跑） |
| `npm run build` | TS 编译到 `dist/` |
| `npm start` | 生产启动（`node dist/index.js`） |
| `npm test` | 运行 Jest 测试 |
| `npm run test:watch` | 监听模式测试 |
| `npm run test:coverage` | 测试覆盖率 |

---

## 7.8 构建部署（小程序发布）

1. **开发预览**：微信开发者工具中直接"预览"或"真机调试"。
2. **生产上传**：开发者工具点击"上传"，填写版本号与备注。
3. **提审发布**：微信公众平台 → 版本管理 → 提交审核 → 审核通过后发布。

---

## 7.9 故障排查

| 问题 | 可能原因 | 解决 |
|------|----------|------|
| 前端请求 401 | `access_token` 未存或过期 | 重新登录，确认 `api/request.js` 能读到 `wx.getStorageSync('access_token')` |
| AI 对话无响应 | WebSocket 未连上 | 检查 `config.aiWebSocketUrl` 是否 WSS、后端 `/service/ws` 是否可用 |
| MBTI 测试题目加载失败 | mbtiserver 未启动或 `DOUBAO_API_KEY` 未配置 | 启动 mbtiserver，配置 `.env`，检查 `services/doubao.js` 的 `API_BASE` |
| TabBar 图标不显示 | `config.tabIcons` 路径错误或后端 `/static/...` 不可达 | 确认 `assetBaseUrl` + 图标路径可 200 返回 HTTPS |
| `pages/test`、`pages/result`、`pages/home/home` 无法访问 | 未在 `app.json` 注册 | 在 `app.json` 的 `pages` 数组中补齐这三个路由 |
| 域名校验失败 | 生产环境用了 HTTP/WS | 全部改为 HTTPS/WSS；开发时勾选"不校验合法域名" |
