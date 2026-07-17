# 06 · 依赖关系

本文档梳理前后端依赖包、模块间依赖、事件/存储依赖关系。

---

## 6.1 前端依赖（package.json）

文件：[package.json](../../package.json)

### 运行时依赖（dependencies）
| 包 | 版本 | 用途 |
|----|------|------|
| `tdesign-miniprogram` | `^1.8.6` | TDesign 小程序 UI 组件库（toast/navbar/cell/upload/picker 等数十个组件） |

### 开发依赖（devDependencies）
| 包 | 版本 | 用途 |
|----|------|------|
| `eslint` | `^8.49.0` | 代码检查 |
| `eslint-config-airbnb-base` | `^15.0.0` | Airbnb 代码风格 |
| `eslint-config-prettier` | `^9.0.0` | 关闭与 Prettier 冲突的规则 |
| `eslint-plugin-import` | `^2.28.1` | ES Module import 规则 |
| `eslint-plugin-prettier` | `^5.0.0` | Prettier 集成 |
| `husky` | `^8.0.3` | Git hooks |
| `lint-staged` | `^14.0.1` | 暂存区文件 lint |
| `prettier` | `^3.0.2` | 代码格式化 |

### 构建产物
`miniprogram_npm/` 下包含 `tdesign-miniprogram` 与 `dayjs`（tdesign 内部依赖）的构建产物，需在微信开发者工具中"构建 npm"生成。

---

## 6.2 后端依赖（mbtiserver/package.json）

文件：[mbtiserver/package.json](../../mbtiserver/package.json)

### 运行时依赖（dependencies）
| 包 | 版本 | 用途 |
|----|------|------|
| `express` | `^4.18.2` | Web 框架 |
| `cors` | `^2.8.5` | 跨域中间件 |
| `uuid` | `^9.0.1` | 生成用户 ID（uuid v4） |
| `dotenv` | `^16.3.1` | 加载 `.env` 环境变量 |

### 开发依赖（devDependencies）
| 包 | 版本 | 用途 |
|----|------|------|
| `typescript` | `^5.3.3` | TS 编译器 |
| `ts-node` | `^10.9.2` | 直接运行 TS 源码（dev 脚本） |
| `jest` | `^29.7.0` | 测试框架 |
| `ts-jest` | `^29.1.1` | Jest 的 TS 支持 |
| `supertest` | `^6.3.3` | HTTP 断言测试 |
| `@types/express` | `^4.17.21` | Express 类型定义 |
| `@types/cors` | `^2.8.17` | cors 类型定义 |
| `@types/node` | `^20.10.5` | Node.js 类型定义 |
| `@types/uuid` | `^9.0.7` | uuid 类型定义 |
| `@types/jest` | `^29.5.11` | Jest 类型定义 |
| `@types/supertest` | `^2.0.16` | supertest 类型定义 |

### 外部服务依赖
- **豆包大模型（火山方舟 ARK）**：`https://ark.cn-beijing.volces.com/api/v3/chat/completions`，由后端 `fetch` 调用，需 `DOUBAO_API_KEY`。

---

## 6.3 前端模块依赖图

```
app.js
  ├─ config.js
  └─ utils/eventBus.js ──► eventBus（全局）
                              ▲
                              │ on/off/emit
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   custom-tab-bar        pages/login           pages/message
   (unread-num-change)   (emit auth:login)     (on auth:login)

config.js ◄── api/request.js ◄──┐
          ◄── api/ai.js ────────┤
          ◄── custom-tab-bar     │
          ◄── pages/chat-room    │
                                 │
api/request.js ◄── pages/home, message, chat-room, login, loginCode,
                   my, my/info-edit, search, dataCenter

api/ai.js (chatWithAI) ◄── pages/chat, pages/chat-room

services/doubao.js ◄── store/testStore.js ◄── pages/home/home,
                                              pages/test/test,
                                              pages/result/result

utils/placeholders.js (DATA_URI_LOADING) ◄── components/nav, custom-tab-bar,
                                              pages/my, setting, dataCenter,
                                              search, chat, chat-room

behaviors/useToast.js ◄── pages/my, pages/setting

components/card ◄── pages/home
components/nav  ◄── pages/home, pages/message, pages/my
```

---

## 6.4 后端模块依赖图

```
mbtiserver/src/index.ts
  ├─ express（Web 框架）
  ├─ cors（跨域）
  ├─ uuid（v4 生成 userId）
  ├─ dotenv（加载 .env）
  └─ Node 原生 fetch ──► 豆包 ARK API
                          (https://ark.cn-beijing.volces.com/api/v3/chat/completions)

内存数据：users: Map<string, User>
内置数据：defaultQuestions: TestQuestion[]（5 题）

测试依赖：
  src/api.test.ts ──► supertest + jest（独立 app 实例）
  src/__tests__/doubao.test.ts ──► jest + global.fetch mock（真实 app）
```

---

## 6.5 前后端联调依赖

### 前端 → wx-mbti-server（Python，:8000，HTTPS/WSS）

| 前端模块 | 协议 | 目标 | 用途 |
|----------|------|------|------|
| `api/request.js` | HTTPS | `https://localhost:8000` | 业务 API（首页卡片、聊天室、用户、搜索、数据中心、登录） |
| `api/ai.js` | WSS | `wss://localhost:8000/service/ws` | AI 流式对话 |

### 前端 → mbtiserver（Node，:8080，HTTP）

| 前端模块 | 协议 | 目标 | 用途 |
|----------|------|------|------|
| `services/doubao.js` | HTTP | `http://localhost:8080/api/ai/doubao` | MBTI 题目生成与结果分析（豆包代理） |

### 后端 → 豆包

| 后端模块 | 协议 | 目标 | 用途 |
|----------|------|------|------|
| `mbtiserver/src/index.ts` | HTTPS | `https://ark.cn-beijing.volces.com/api/v3/chat/completions` | 调用豆包大模型 |

> **重要**：前端 `services/doubao.js` 走 HTTP（:8080），违反 `AGENTS.md` 的 HTTPS-only 约束。在微信小程序生产环境（非"不校验合法域名"模式）下会被拦截。开发时需在开发者工具勾选"不校验合法域名"。

---

## 6.6 事件依赖

| 事件 | 触发 | 订阅 | 数据 |
|------|------|------|------|
| `auth:login` | `pages/login/login.js`（登录成功后） | `pages/message/index.js` | `{token}` |
| `unread-num-change` | `app.setUnreadNum(n)` | `custom-tab-bar/index.js` | `unreadNum: number` |
| `maxReconnectAttemptsReached` | `AIWebSocketManager.handleReconnect`（重连超限） | （当前无订阅方） | - |

### 页面间数据传递（非 eventBus）
- `pages/message` → `pages/chat`：通过 `wx.navigateTo` 的 `eventChannel.emit('update', user)` 传递 AI 角色对象。
- `pages/home` → `pages/home`（reLaunch）：通过 URL `?oper=release|save` 传递操作结果提示。

---

## 6.7 本地存储依赖

| 存储键 | 结构 | 写入方 | 读取方 |
|--------|------|--------|--------|
| `access_token` | `string`（JWT） | login、loginCode | `api/request.js`（自动注入请求头）、my（登录态判断） |
| `ai_chat_history` | `{[characterId]: Message[]}` | chat（`saveAIHistory`）、message（`setMessagesRead`） | message（`getMessageList`） |
| `chat_room_${roomId}` | `Message[]` | chat-room（`saveChatHistory`） | chat-room（`loadChatHistory`） |
| `chat_rooms_history` | `{[roomId]: {lastMessage,lastTime,visitTime,unreadCount}}` | chat-room（`saveChatRoomHistory`）、message（`updateRoomVisitHistory`） | message（`updateChatRoomsHistory`） |

---

## 6.8 依赖版本约束总结

- 前端 Node.js `>= 14.0.0`（见 [README.md](../../README.md)）。
- 后端 Docker 使用 `node:20-alpine`（原生 `fetch` 需 Node 18+）。
- TypeScript 编译目标 `ES2020`（原生 `fetch` 类型支持）。
- `tdesign-miniprogram ^1.8.6`（SemVer 兼容 1.x 更新）。
