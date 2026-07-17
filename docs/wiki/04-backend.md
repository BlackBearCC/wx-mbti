# 04 · 后端服务（mbtiserver）

本文档解析仓库内 Node.js + TypeScript 后端服务 `mbtiserver/`。

---

## 4.1 概述

`mbtiserver` 是 MBTI 性格测试小程序的后端服务，核心职责：

1. **安全代理豆包 AI**：前端不持有 API Key，由后端转发请求至火山方舟 ARK。
2. **管理 MBTI 测试会话状态**：创建用户、记录答案、计算结果。
3. **提供本地题库与本地 MBTI 计算作为备用方案**。

- **入口**：[mbtiserver/src/index.ts](../../mbtiserver/src/index.ts)（407 行）
- **框架**：Express 4.18 + cors + express.json()
- **端口**：默认 `8080`（`PORT` 环境变量可覆盖）
- **协议**：HTTP（无 TLS、无 WebSocket）
- **存储**：内存 `Map<string, User>`（重启即丢，生产需替换为真实数据库）
- **HTTP 客户端**：Node 原生 `fetch`（调用豆包）

> 注意：与 `AGENTS.md` 描述的 Python 后端 `wx-mbti-server`（:8000，HTTPS/WSS）是两套独立实现，不要混淆。

---

## 4.2 环境变量

文件：[mbtiserver/.env.example](../../mbtiserver/.env.example)

| 变量 | 示例值 | 默认值 | 说明 |
|------|--------|--------|------|
| `PORT` | `8080` | `8080` | 服务端口 |
| `NODE_ENV` | `production` | - | Node 运行环境 |
| `DOUBAO_API_KEY` | `your-doubao-api-key-here` | `''` | 豆包 API 密钥（必须配置才能用 AI 代理；空则 `/api/ai/doubao` 返回 500） |
| `DOUBAO_MODEL` | `doubao-seed-1.8-high` | `doubao-seed-1.8-high` | 默认模型 |
| `DOUBAO_BASE_URL` | `https://ark.cn-beijing.volces.com/api/v3` | `https://ark.cn-beijing.volces.com/api/v3` | 豆包 API 基础 URL |

> 这些值在模块加载时一次性读取并赋给常量，运行时修改环境变量不会生效。

---

## 4.3 中间件

| 中间件 | 用途 |
|--------|------|
| `app.use(cors())` | 全局允许跨域（开放所有源） |
| `app.use(express.json())` | 解析 JSON 请求体 |
| 末尾错误处理中间件 | 捕获未处理异常，统一返回 500 `{ success:false, error:'服务器内部错误' }` |

> 无身份认证中间件，无 JWT/Token 校验。`Authorization` 头仅用于后端调用豆包时携带 Bearer Token。

---

## 4.4 TypeScript 类型定义

文件：[mbtiserver/src/index.ts](../../mbtiserver/src/index.ts#L20-L57)

```typescript
interface User { id: string; createdAt: string; answers: Answer[]; result: TestResult | null }
interface Answer { questionId: number; optionId: string }
interface TestResult { type: string; name: string; description: string; scores: {E,I,S,N,T,F,J,P: number} }
interface TestQuestion { id: number; text: string; options: {id,text,scores: Record<string,number>}[] }
```

---

## 4.5 HTTP 端点

共 8 个端点，Base URL：`http://localhost:8080/api`，`Content-Type: application/json`。

| # | 方法 | 路径 | 请求体/参数 | 响应要点 |
|---|------|------|-------------|----------|
| 1 | POST | `/api/ai/doubao` | `{messages, model?, max_tokens?, temperature?}` | 代理豆包，返回 `{success, data:{id,object,created,model,choices,usage}}` |
| 2 | GET | `/api/health` | 无 | `{status:'ok', timestamp}` |
| 3 | GET | `/api/questions` | 无 | `{success, data: defaultQuestions, total}` |
| 4 | POST | `/api/test/start` | 无 | `{success, data:{userId, questionCount}}` |
| 5 | POST | `/api/test/answer` | `{userId, questionId, optionId}` | `{success, data:{questionId, optionId, answeredCount, totalQuestions}}` |
| 6 | POST | `/api/test/submit` | `{userId}` | `{success, data: TestResult}` |
| 7 | GET | `/api/test/result/:userId` | URL 参数 `userId` | `{success, data: TestResult}` |
| 8 | GET | `/api/test/status/:userId` | URL 参数 `userId` | `{success, data:{userId, answeredCount, totalQuestions, hasResult}}` |

**错误码约定：** 200 成功；400 参数错误/无答案/结果未生成；404 用户不存在；500 服务器错误/豆包调用失败。

> 完整请求/响应示例见 [mbtiserver/API.md](../../mbtiserver/API.md)。

---

## 4.6 关键函数：`calculateMBTI`

文件：[mbtiserver/src/index.ts](../../mbtiserver/src/index.ts#L256-L305)

```typescript
function calculateMBTI(answers: Answer[]): TestResult
```

**逻辑：**
1. 初始化 `scores = {E:0,I:0,S:0,N:0,T:0,F:0,J:0,P:0}`。
2. 遍历 `answers`，从 `defaultQuestions` 查找对应 `questionId` 与 `optionId`，累加 `option.scores` 到 `scores`。
3. 比较 4 对维度生成 4 字母类型：`E>=I?E:I` + `S>=N?S:N` + `T>=F?T:F` + `J>=P?J:P`。
4. 通过内置 16 种类型中文名映射表（ISTJ 物流师 ... ENTP 辩论家）查 `name`。
5. 返回 `{type, name, description: '你是 ${type} 类型。', scores}`。

---

## 4.7 豆包 AI 代理（`POST /api/ai/doubao`）

文件：[mbtiserver/src/index.ts](../../mbtiserver/src/index.ts#L109-L180)

后端代理模式，避免前端泄露 API Key：

1. 解构请求体 `{messages, model, max_tokens, temperature}`。
2. 校验 `messages` 为数组，否则 400。
3. 校验 `DOUBAO_API_KEY` 非空，否则 500（"服务器未配置 Doubao API Key"）。
4. `fetch POST ${DOUBAO_BASE_URL}/chat/completions`：
   - Headers：`Content-Type: application/json` + `Authorization: Bearer ${DOUBAO_API_KEY}`
   - Body：`{ model: model||DOUBAO_MODEL, messages, max_tokens: max_tokens||2000, temperature: temperature||0.7 }`
5. `response.ok` 为 false：记录错误日志，透传豆包 HTTP 状态码，返回 `{success:false, error:'Doubao API 错误: ${statusText}'}`。
6. 成功：解析 JSON，包装为 `{success:true, data:{id,object,created,model,choices,usage}}` 返回。
7. `catch` 网络异常：返回 500 `{success:false, error:'调用 Doubao API 失败'}`。

---

## 4.8 本地题库

文件：[mbtiserver/src/index.ts](../../mbtiserver/src/index.ts#L63-L104)

`defaultQuestions: TestQuestion[]` 内置 5 道 MBTI 题目（id 1-5），覆盖 E/I、T/F、S/N、J/P 维度。作为豆包 AI 生成题目的备用方案，同时供 `/api/questions`、`/api/test/answer` 的 `answeredCount`/`totalQuestions` 计算使用。

---

## 4.9 测试

### `mbtiserver/src/api.test.ts`

文件：[mbtiserver/src/api.test.ts](../../mbtiserver/src/api.test.ts)

使用 `supertest` + `jest`。**特点**：不导入 `src/index.ts`，而是通过 `createTestApp()` 构造独立 Express 应用（内置 2 道题、独立内存数据库），实现测试隔离。

覆盖：`/api/health`、`/api/questions`、`/api/test/start`、`/api/test/answer`（成功/缺参 400/用户不存在 404/更新已有答案）、`/api/test/submit`（两题均选 A → `ESTJ`、无答案 400、用户不存在 404）、`/api/test/result/:userId`、`/api/test/status/:userId`。

### `mbtiserver/src/__tests__/doubao.test.ts`

文件：[mbtiserver/src/__tests__/doubao.test.ts](../../mbtiserver/src/__tests__/doubao.test.ts)

导入真实 `app`，导入前设置 `process.env.DOUBAO_API_KEY`，通过 `global.fetch = jest.fn()` mock 全局 fetch。

覆盖：`messages` 缺失/非数组 → 400；API Key 未设置 → 500；mock 成功 → 200 校验透传；自定义 `model` → 校验 fetch body；豆包 401 → 透传 401；网络异常 → 500。

---

## 4.10 Docker 部署

### `mbtiserver/Dockerfile`

文件：[mbtiserver/Dockerfile](../../mbtiserver/Dockerfile)

- 基础镜像：`node:20-alpine`
- 工作目录：`/app`
- 构建：`COPY package*.json` → `npm ci --only=production` → `COPY dist ./dist`
- 暴露：`8080`
- 启动：`CMD ["node", "dist/index.js"]`

> 注意：Dockerfile 假设 `dist/` 已存在（需在构建镜像前先执行 `npm run build`），未在镜像内执行 `tsc`。

### `mbtiserver/docker-compose.yml`

文件：[mbtiserver/docker-compose.yml](../../mbtiserver/docker-compose.yml)

| 服务 | 端口 | 说明 |
|------|------|------|
| `mbtiserver` | `8080:8080` | 后端，环境变量注入 `DOUBAO_API_KEY`/`DOUBAO_MODEL`，`restart: unless-stopped`，健康检查 `wget --spider http://localhost:8080/api/health`（间隔 30s） |
| `doubao-app` | `3000:80` | 可选前端（构建自 `../doubao_app`），`depends_on: mbtiserver`，环境变量 `VITE_API_BASE=http://mbtiserver:8080/api` |

网络：`mbti-network`。

---

## 4.11 TypeScript 配置

文件：[mbtiserver/tsconfig.json](../../mbtiserver/tsconfig.json)

| 配置项 | 值 |
|--------|-----|
| `target` | `ES2020`（支持原生 `fetch` 类型） |
| `module` | `commonjs` |
| `outDir` / `rootDir` | `./dist` / `./src` |
| `strict` | `true` |
| `esModuleInterop` | `true` |
| `declaration`/`declarationMap`/`sourceMap` | `true` |
| `include` | `["src/**/*"]` |
| `exclude` | `["node_modules","dist","**/*.test.ts"]` |
