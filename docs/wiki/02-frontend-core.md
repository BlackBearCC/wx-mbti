# 02 · 前端核心模块

本文档解析小程序前端的入口配置、网络层、工具层、行为、自定义组件与 TabBar。

---

## 2.1 应用入口 `app.js`

文件：[app.js](../../app.js)

注册全局 `App` 实例，负责版本更新、全局数据与事件总线。

| 成员 | 类型 | 说明 |
|------|------|------|
| `onLaunch()` | 生命周期 | 注册 `wx.getUpdateManager()`，检测到新版本时弹窗询问是否重启 |
| `globalData.userInfo` | `null` | 用户信息（预留） |
| `globalData.unreadNum` | `number` | 未读消息数量，初始 0，由后端事件/接口更新 |
| `globalData.socket` | `null` | SocketTask 对象（预留，对接真实后端时启用） |
| `eventBus` | `object` | `createBus()` 实例，全局发布订阅 |
| `connect()` | 方法 | 预留钩子（空实现） |
| `getUnreadNum()` | 方法 | 预留钩子（空实现） |
| `setUnreadNum(n)` | 方法 | 写 `globalData.unreadNum` 并 `emit('unread-num-change', n)` |

> 注释明确：默认不从本地 mock 拉取未读数或建立本地 socket。

---

## 2.2 应用配置 `app.json`

文件：[app.json](../../app.json)

### 主包页面（3 个 Tab 入口）
- `pages/home/index` — 首页
- `pages/message/index` — 消息
- `pages/my/index` — 我的

### 分包（subpackages）
| root | name | 页面 |
|------|------|------|
| `pages/search` | search | index |
| `pages/my/info-edit` | edit | index |
| `pages/chat` | chat | index |
| `pages/chat-room` | chat-room | index |
| `pages/login` | login | login |
| `pages/loginCode` | loginCode | loginCode |
| `pages/dataCenter` | dataCenter | index |
| `pages/setting` | setting | index |
| `pages/release` | release | index |

> 注意：MBTI 测试相关页面 `pages/test/test`、`pages/result/result`、`pages/home/home` 未在 `app.json` 的 `pages`/`subpackages` 中显式注册（见 [03-前端页面详解](./03-frontend-pages.md) 的注意事项）。

### 全局配置
- `usingComponents`：全局注册 `t-toast`。
- `window`：导航栏背景 `#1c1f24`，标题 `MBTI`，白色文字。
- `tabBar.custom: true`：使用自定义 TabBar（`custom-tab-bar/`）。
- `resolveAlias`：`~/*` → `/*`（允许 `~/api/request` 这类别名导入）。
- `sitemapLocation`：`sitemap.json`。

---

## 2.3 项目配置 `config.js`

文件：[config.js](../../config.js)

```javascript
export default {
  baseUrl: 'https://localhost:8000',           // 后端 API 根地址（HTTPS）
  aiWebSocketUrl: 'wss://localhost:8000/service/ws', // AI WebSocket（WSS）
  assetBaseUrl: 'https://localhost:8000',      // 资源基地址（HTTPS）
  enforceHttpsAssets: true,                    // 强制 http→https
  tabIcons: {                                  // 底部 Tab 图标相对路径
    home: '/static/ui/icons/tabs/home.svg',
    chat: '/static/ui/icons/tabs/chat.svg',
    user: '/static/ui/icons/tabs/user.svg',
  },
};
```

被以下模块引用：`api/request.js`、`api/ai.js`、`custom-tab-bar/index.js`、`pages/chat-room/index.js`。

---

## 2.4 网络通信层 `api/`

### 2.4.1 HTTP 请求 `api/request.js`

文件：[api/request.js](../../api/request.js)

默认导出 `request(url, method='GET', data={})`，返回 `Promise`。

**职责：**
- 基于 `config.baseUrl` 拼接完整 URL（仅 HTTPS）。
- 设置 `Content-Type: application/json`。
- 自动从 `wx.getStorageSync('access_token')` 读取 token；存在则注入 `Authorization: Bearer <token>`（已带 `Bearer ` 前缀时不重复添加）。
- `wx.request` 的 `success` 回调中判断：`statusCode===200` → `resolve(responseData)`；否则 `reject(responseData || res)`。
- `fail` 回调（断网/服务器宕机）→ `reject(err)`。
- 内置 `delay=0`（可用于模拟延迟，当前为 0）。

**业务错误约定**：只要 HTTP 200 即视为请求成功，具体业务错误由后端返回的 `code` 字段判断（见 [backend-api-spec.md](../../backend-api-spec.md)）。

### 2.4.2 AI WebSocket `api/ai.js`

文件：[api/ai.js](../../api/ai.js)

包含两个核心导出：`AIWebSocketManager` 类（内部）与 `chatWithAI` API（命名导出）。

#### `AIWebSocketManager` 类（详见 [05-关键类与函数](./05-key-functions.md)）
单例 `aiWebSocket` 管理到 `config.aiWebSocketUrl` 的 WebSocket 连接。

| 方法 | 说明 |
|------|------|
| `connect()` | `wx.connectSocket({url, header?})`，token 存在时注入 `Authorization`；返回 Promise，`onOpen` 时 resolve 并处理消息队列 |
| `handleReconnect()` | 关闭后自动重连，上限 `maxReconnectAttempts=3`，间隔 `reconnectInterval=2000ms`；超限 `emit('maxReconnectAttemptsReached')` |
| `send(message)` | `readyState===1` 直接发送；否则入队 `messageQueue` 并在断开时触发 `connect()` |
| `processMessageQueue()` | 连接就绪后依次发送队列消息 |
| `handleMessage(data)` | JSON 解析后 `emit('message', message)`；若含 `op`+`event` 则额外 `emit('${op}:${event}', message)` |
| `on/off/emit(event, data)` | 事件监听器管理（`listeners` 对象） |
| `close()` | 关闭 socket、清空队列与监听器 |

#### `chatWithAI` API

| 方法 | 说明 |
|------|------|
| `sendMessage(message, conversationId, onMessage, onComplete, onError, options={})` | 核心方法。连接未就绪时先 `connect()` 再递归调用；注册 `message` 监听按 `reqId===conversationId` 过滤，处理 `ai.stream` 的 `chunk`/`final`/`error` 事件；发送协议负载 `{reqId, op:'ai.stream', data:{modelAlias, temperature, maxTokens, metadata, characterName, characterId, roomId, userId, systemPrompt, messages:[{role:'user',content}]}}`；返回取消函数（解绑监听） |
| `startConversation()` | 生成会话 ID：`conv_<Date.now()>_<random36>` |
| `connect()` | 代理 `aiWebSocket.connect()` |
| `disconnect()` | 代理 `aiWebSocket.close()` |

**流式协议（与 wx-mbti-server 对齐）：**

```jsonc
// 发送
{ "reqId": "conv_xxx", "op": "ai.stream", "data": { "messages": [...], "characterId": "...", "roomId": "..." } }

// 接收 chunk
{ "reqId": "conv_xxx", "op": "ai.stream", "event": "chunk", "text": "部分文本" }
// 接收 final
{ "reqId": "conv_xxx", "op": "ai.stream", "event": "final", "text": "完整文本" }
// 接收 error
{ "reqId": "conv_xxx", "op": "ai.stream", "event": "error", "detail": "错误信息" }
```

---

## 2.5 工具层 `utils/`

### 2.5.1 `utils/eventBus.js`

文件：[utils/eventBus.js](../../utils/eventBus.js)

`createBus()` 返回一个极简发布订阅对象：

| 方法 | 说明 |
|------|------|
| `on(event, callback)` | 订阅；首次自动建数组 |
| `off(event, callback)` | 取消订阅；`callback` 为空时清空该事件全部 |
| `emit(event, ...args)` | 触发，遍历调用所有回调 |

在 [app.js](../../app.js) 中 `eventBus: createBus()` 挂为全局。

### 2.5.2 `utils/logger.js`

文件：[utils/logger.js](../../utils/logger.js)

结构化日志，格式：`[<ISO时间>] <LEVEL> <msg> <ctxJSON>`。

| 方法 | 输出 |
|------|------|
| `debug(msg, ctx)` | `console.debug` |
| `info(msg, ctx)` | `console.log` |
| `warn(msg, ctx)` | `console.warn` |
| `error(msg, ctx)` | `console.error` |

`ctx` 为字符串则原样拼接，否则 `JSON.stringify`；序列化失败时回退 `[unserializable-context]`。所有方法 `try/catch` 包裹，避免日志本身抛错。主要被 `api/ai.js` 使用。

### 2.5.3 `utils/util.js`

文件：[utils/util.js](../../utils/util.js)

CommonJS 导出：

| 函数 | 说明 |
|------|------|
| `formatTime(date)` | 格式化为 `YYYY/MM/DD HH:mm:ss` |
| `getLocalUrl(path, name)` | 通过 `wx.getFileSystemManager().copyFileSync` 复制到 `USER_DATA_PATH`，返回本地临时路径以便预览 |

### 2.5.4 `utils/placeholders.js`

文件：[utils/placeholders.js](../../utils/placeholders.js)

导出 `DATA_URI_LOADING`：一个内联的 base64 SVG loading 动画（旋转圆环）。是项目**唯一允许的本地占位资源**，被 `components/nav`、`pages/my`、`pages/setting`、`pages/dataCenter`、`pages/search`、`pages/chat`、`pages/chat-room` 等用作默认头像/图标占位。

---

## 2.6 行为 `behaviors/useToast.js`

文件：[behaviors/useToast.js](../../behaviors/useToast.js)

基于 `tdesign-miniprogram/toast` 的 `Behavior`，供页面 `behaviors` 引入。

| 方法 | 说明 |
|------|------|
| `onShowToast(selector, message)` | `Toast({context: this, selector, message})` |
| `onHideToast(selector)` | `hideToast({context: this, selector})` |

被 `pages/my/index`、`pages/setting/index` 使用。

---

## 2.7 自定义组件 `components/`

### 2.7.1 `components/card` — 卡片组件

文件：[components/card/index.js](../../components/card/index.js)

聊天室/功能入口卡片，注册于 `pages/home/index.json`。

**properties：** `icon`(String)、`title`(String)、`description`(String)、`background`(String)、`roomId`(String)、`targetUrl`(String)。

**方法：**
- `handleTap()`：优先按 `roomId` 跳 `/pages/chat-room/index?roomId=`；否则按 `targetUrl` 跳 `/pages/webview/index?url=<encoded>`。

### 2.7.2 `components/nav` — 导航 + 抽屉

文件：[components/nav/index.js](../../components/nav/index.js)

顶部导航栏 + 侧边抽屉菜单，注册于 `pages/home`、`pages/message`、`pages/my` 的 `index.json`。

**options：** `styleIsolation: 'shared'`。

**properties：** `navType`(默认 `'title'`)、`titleText`(String)。

**data：**
- `visible`：抽屉显隐
- `menuIcon`：`DATA_URI_LOADING`
- `sidebar`：9 个菜单项 `{title, url, isSidebar}`，`isSidebar=true` 走 `switchTab`（首页/消息/我的），否则 `navigateTo`（搜索/发布/对话/资料编辑/设置/数据图表/登录）
- `statusHeight`：状态栏高度（`wx.getWindowInfo().statusBarHeight`）

**lifetimes.ready()：** 读取状态栏高度并 `setData`。

**方法：**
- `openDrawer()`：展开抽屉
- `itemClick(e)`：按 `isSidebar` 选择 `wx.switchTab` 或 `wx.navigateTo`，跳转后关闭抽屉
- `searchTurn()`：跳 `/pages/search/index`

---

## 2.8 自定义 TabBar `custom-tab-bar/`

文件：[custom-tab-bar/index.js](../../custom-tab-bar/index.js)

由 `app.json` 的 `tabBar.custom: true` 全局挂载。

**图标处理：** 模块级 `fullUrl(p)` 将 `config.tabIcons` 中的相对路径（如 `/static/ui/icons/tabs/home.svg`）拼成绝对 HTTPS URL（`assetBaseUrl + path`）；已是绝对 URL 则原样返回。

**data：**
- `value`：当前激活 tab（初始空，避免闪烁）
- `unreadNum`：未读消息数
- `homeIcon / chatIcon / userIcon`：经 `fullUrl` 处理的图标 URL
- `list`：3 项 `{icon, value, label}`（首页/消息/我的）

**lifetimes.ready()：**
- 通过 `getCurrentPages()` 取当前页路由，正则 `pages/(\w+)/index` 提取 tab 名高亮。
- 调 `setUnreadNum(app.globalData.unreadNum)` 同步初始未读数。
- 订阅 `app.eventBus.on('unread-num-change', ...)` 实时更新未读角标。

**方法：**
- `handleChange(e)`：`wx.switchTab({url: /pages/${value}/index})`
- `setUnreadNum(unreadNum)`：`setData({unreadNum})`

---

## 2.9 状态管理 `store/testStore.js`

文件：[store/testStore.js](../../store/testStore.js)

自研极简发布订阅 store，模拟 Vuex/Pinia。`createStore()` 返回单例（模块级 `state` 与 `listeners` 共享）。

**state：** `questions / answers / currentIndex / result / isLoading / isSubmitting / error`

| 方法 | 说明 |
|------|------|
| `getState()` | 返回 state 浅拷贝 |
| `subscribe(listener)` | 注册监听器，返回取消函数 |
| `startTest()` | Promise；`isLoading=true` → 调 `generateQuestions(20)` → `JSON.parse` 写 `questions` → `notify()` |
| `setAnswer(questionId, optionId)` | 覆盖或追加答案，自动推进 `currentIndex`，`notify()` |
| `submitTest()` | Promise；`isSubmitting=true` → 调 `generateAnalysis(answers)` → 写 `result`，`currentIndex=answers.length` |
| `resetTest()` | 清空全部状态，`notify()` |
| `navigateToTest()` | `wx.navigateTo('/pages/test/test')` |
| `navigateToResult()` | `wx.redirectTo('/pages/result/result')` |
| `navigateToHome()` | `wx.redirectTo('/pages/home/home')` |

被 `pages/home/home`、`pages/test/test`、`pages/result/result` 订阅使用。

---

## 2.10 豆包服务 `services/doubao.js`

文件：[services/doubao.js](../../services/doubao.js)

**注意：** 此文件硬编码 `API_BASE = 'http://localhost:8080'`，直连 `mbtiserver`（HTTP，非 HTTPS），与 `api/request.js` 走的 `:8000` HTTPS 是两条独立链路。

| 函数 | 说明 |
|------|------|
| `callDoubaoProxy(messages, model='doubao-seed-1.8-high')` | `wx.request POST ${API_BASE}/api/ai/doubao`，body 含 `messages/model/max_tokens:2000/temperature:0.7`；成功取 `data.choices[0].message.content` resolve |
| `generateQuestions(count=20)` | 构造系统提示词（要求生成 JSON 数组题目，含 id/text/options/scores），调用 `callDoubaoProxy`，正则提取 `[...]` JSON 返回字符串 |
| `generateAnalysis(answers)` | 构造系统提示词（16 种 MBTI 类型说明），调用 `callDoubaoProxy`，正则提取 `{...}` 并 `JSON.parse` 返回 `{type,name,description}` |

被 `store/testStore.js` 的 `startTest`/`submitTest` 调用。
