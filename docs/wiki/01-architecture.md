# 01 · 架构总览

## 1.1 系统全景

wx-mbti 是一个前后端分离的项目，由「微信小程序前端」与「Node.js 后端（mbtiserver）」组成，并对外部「豆包大模型」与「Python 业务后端（wx-mbti-server，独立仓库）」存在依赖关系。

```
┌──────────────────────────────────────────────────────────────┐
│                      微信小程序前端 (本仓库根目录)               │
│                                                              │
│  pages/  components/  custom-tab-bar/  behaviors/            │
│       │        │           │               │                 │
│       └────────┴─────┬─────┴───────────────┘                 │
│                      ▼                                       │
│              api/request.js ──(HTTPS)──► wx-mbti-server :8000 │
│              api/ai.js      ──(WSS)───► wx-mbti-server :8000  │
│                                                              │
│              services/doubao.js ──(HTTP)──► mbtiserver :8080  │
└──────────────────────────────┬───────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
   ┌────────────────────────┐    ┌──────────────────────────┐
   │  mbtiserver (本仓库内)   │    │  wx-mbti-server (独立仓库) │
   │  Node + TS + Express    │    │  Python, HTTPS/WSS :8000  │
   │  :8080 HTTP             │    │  聊天室/角色/用户/支付     │
   │  MBTI 测试 + Doubao 代理 │    └──────────────────────────┘
   └───────────┬────────────┘
               │ (服务端 fetch, 持有 API Key)
               ▼
   ┌────────────────────────────┐
   │  豆包大模型 (火山方舟 ARK)    │
   │  https://ark.cn-beijing.    │
   │  volces.com/api/v3          │
   └────────────────────────────┘
```

## 1.2 技术栈

### 前端
| 类别 | 选型 |
|------|------|
| 框架 | 微信小程序原生框架（WXML + WXSS/Less + JS） |
| UI 组件库 | TDesign Miniprogram `^1.8.6` |
| 样式预处理 | Less |
| AI 通信 | WebSocket（流式 `ai.stream` 协议） |
| HTTP | `wx.request` 封装（`api/request.js`） |
| 状态管理 | 自研极简 store（`store/testStore.js`，发布订阅模式） |
| 事件总线 | 自研 `utils/eventBus.js`（on/off/emit） |
| 代码规范 | ESLint + Prettier + Husky + lint-staged |
| 包管理 | npm（需在开发者工具中"构建 npm"） |

### 后端（mbtiserver）
| 类别 | 选型 |
|------|------|
| 语言 | TypeScript 5.3（编译目标 ES2020，CommonJS） |
| Web 框架 | Express 4.18 |
| 跨域 | cors 2.8 |
| ID 生成 | uuid v9 |
| 环境变量 | dotenv 16 |
| HTTP 客户端 | Node 原生 `fetch`（调用豆包） |
| 数据存储 | 内存 `Map`（非持久化，生产需替换） |
| 测试 | Jest 29 + ts-jest + supertest |
| 容器化 | Docker（node:20-alpine）+ docker-compose |

## 1.3 目录结构

```
wx-mbti/
├── app.js                    # 小程序入口（全局 App 实例、事件总线、未读数）
├── app.json                  # 小程序配置（页面路由、分包、tabBar、window）
├── app.less                  # 全局样式
├── config.js                 # 项目配置（baseUrl / aiWebSocketUrl / tabIcons）
├── package.json              # 前端依赖与脚本（tdesign-miniprogram 等）
├── variable.less             # 全局样式变量（主色、字号）
├── backend-api-spec.md       # Python 后端业务 API 设计规格（聊天室/角色/支付）
│
├── api/                      # 网络通信封装
│   ├── request.js            #   HTTP 请求工具（自动注入 Bearer Token）
│   └── ai.js                 #   AI WebSocket 管理器 + chatWithAI API
│
├── behaviors/
│   └── useToast.js           # Toast 行为（封装 tdesign toast）
│
├── components/               # 自定义组件
│   ├── card/                 #   卡片组件（聊天室入口）
│   └── nav/                  #   顶部导航 + 抽屉菜单
│
├── custom-tab-bar/           # 自定义底部 TabBar（3 个 tab + 未读角标）
│   └── index.js
│
├── pages/                    # 小程序页面
│   ├── home/                 #   首页（index）+ MBTI 测试入口（home）
│   ├── message/              #   消息中心（聊天室 + AI 助手列表）
│   ├── my/                   #   个人中心（index + info-edit 资料编辑）
│   ├── chat/                 #   单人 AI 对话（流式）
│   ├── chat-room/            #   聊天室（多 AI 群聊）
│   ├── login/                #   微信授权登录
│   ├── loginCode/            #   短信验证码登录
│   ├── search/               #   搜索（历史词/热门词）
│   ├── release/              #   内容发布
│   ├── setting/              #   设置中心
│   ├── dataCenter/           #   数据中心图表
│   ├── test/                 #   MBTI 答题页
│   └── result/               #   MBTI 结果页
│
├── store/
│   └── testStore.js          # MBTI 测试全局状态（发布订阅 store）
│
├── services/
│   └── doubao.js             # 豆包 API 调用服务（生成题目/分析结果）
│
├── utils/
│   ├── eventBus.js           # 事件总线工厂
│   ├── logger.js             # 结构化日志（info/warn/error/debug）
│   ├── util.js               # formatTime / getLocalUrl
│   └── placeholders.js       # 通用 loading 占位 SVG（DATA_URI_LOADING）
│
├── miniprogram_npm/          # 构建后的 npm 产物（tdesign-miniprogram、dayjs）
│
└── mbtiserver/               # Node.js + TypeScript 后端服务
    ├── src/
    │   ├── index.ts          #   主入口（Express 应用、路由、MBTI 计算）
    │   ├── api.test.ts       #   API 集成测试（独立 app 实例）
    │   └── __tests__/
    │       └── doubao.test.ts#   Doubao 代理测试（mock fetch）
    ├── API.md                #   后端 API 文档
    ├── Dockerfile            #   容器构建（node:20-alpine）
    ├── docker-compose.yml    #   编排（mbtiserver + doubao-app）
    ├── .env.example          #   环境变量示例
    ├── package.json
    └── tsconfig.json
```

## 1.4 核心数据流

### A. AI 流式对话（前端 → wx-mbti-server :8000）

```
用户输入消息
   │
   ▼
pages/chat 或 pages/chat-room
   │  调用 chatWithAI.sendMessage(message, conversationId, onChunk, onComplete, onError, options)
   ▼
api/ai.js (AIWebSocketManager)
   │  wx.connectSocket(wss://localhost:8000/service/ws)  [首次自动建立连接]
   │  发送 { reqId, op:'ai.stream', data:{ messages, characterName, characterId, roomId, ... } }
   ▼
wx-mbti-server (WebSocket /service/ws)
   │  按协议返回 { reqId, op:'ai.stream', event:'chunk'|'final'|'error', text }
   ▼
api/ai.js 按 reqId 过滤，触发 onMessage(chunk,false) / onComplete(fullText) / onError(detail)
   │
   ▼
页面更新 messages（打字机效果），onUnload 时 chatWithAI.disconnect()
```

### B. MBTI 性格测试（前端 → mbtiserver :8080 → 豆包）

```
pages/home/home  →  store.startTest()
   │  调用 services/doubao.generateQuestions(20)
   ▼
services/doubao.js  →  wx.request POST http://localhost:8080/api/ai/doubao
   │  body: { messages:[{system:题目生成prompt},{user}], model, max_tokens, temperature }
   ▼
mbtiserver /api/ai/doubao
   │  fetch POST https://ark.cn-beijing.volces.com/api/v3/chat/completions
   │  Headers: Authorization: Bearer ${DOUBAO_API_KEY}
   ▼
豆包返回 choices[0].message.content（JSON 数组题目）
   │
   ▼
store 解析 JSON → state.questions → notify() → pages/test 渲染
   │  用户答题 → store.setAnswer() → 全部答完 → store.navigateToResult()
   ▼
pages/result  →  store.submitTest()
   │  调用 services/doubao.generateAnalysis(answers)
   ▼
同上链路 → 豆包返回 { type, name, description }
   │
   ▼
store.result → notify() → pages/result 展示四维度得分与描述
```

### C. 普通业务请求（前端 → wx-mbti-server :8000）

```
页面  →  request(url, method, data)   [api/request.js]
   │  自动从 wx.getStorageSync('access_token') 取 token
   │  注入 Authorization: Bearer <token>
   ▼
wx.request HTTPS → https://localhost:8000<url>
   │
   ▼
statusCode===200 ? resolve(responseData) : reject(responseData)
```

## 1.5 关键设计约束

来自 [AGENTS.md](../../AGENTS.md)：

- **禁止本地 Mock 资源**：所有图标/图片走后端 HTTPS 绝对 URL；唯一例外是 `utils/placeholders.js` 的 `DATA_URI_LOADING`。
- **仅允许 HTTPS/WSS**：`config.js` 中 `baseUrl`/`assetBaseUrl` 必须 `https://`，`aiWebSocketUrl` 必须 `wss://`，`enforceHttpsAssets: true`。
- **统一请求层**：所有 HTTP 必须经 `api/request.js`，由其自动注入 `Authorization`。
- **后端独立仓库**：`wx-mbti-server` 位于 `C:\Users\TYZS\PycharmProjects\wx-mbti-server`，本地须启用 TLS（mkcert）。
