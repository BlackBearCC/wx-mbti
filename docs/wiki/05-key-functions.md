# 05 · 关键类与函数说明

本文档聚焦项目中最核心的类、函数与数据结构。

---

## 5.1 `AIWebSocketManager` 类（前端）

文件：[api/ai.js](../../api/ai.js#L7-L169)

管理到 `wss://localhost:8000/service/ws` 的 WebSocket 连接，提供自动重连、消息队列、事件分发。

### 构造与实例化

```javascript
class AIWebSocketManager {
  constructor() {
    this.socket = null;              // wx.connectSocket 返回的 SocketTask
    this.reconnectAttempts = 0;      // 当前重连次数
    this.maxReconnectAttempts = 3;   // 最大重连次数
    this.reconnectInterval = 2000;   // 重连间隔（ms）
    this.messageQueue = [];          // 连接未就绪时的待发消息队列
    this.listeners = {};             // 事件监听器 {event: [callback]}
  }
}
const aiWebSocket = new AIWebSocketManager();  // 全局单例
```

### 方法详解

#### `connect()` → `Promise`
- 从 `wx.getStorageSync('access_token')` 取 token，存在则注入 `header.Authorization = 'Bearer ${token}'`。
- `wx.connectSocket({ url: config.aiWebSocketUrl, header? })` 建立连接。
- `onOpen`：日志记录、重置 `reconnectAttempts=0`、`processMessageQueue()`、`resolve()`。
- `onMessage`：`handleMessage(res.data)`。
- `onError`：日志 + `reject(error)`。
- `onClose`：日志 + `handleReconnect()`。

#### `handleReconnect()`
- `reconnectAttempts < maxReconnectAttempts` 时：自增、日志、`setTimeout(() => this.connect().catch(...), reconnectInterval)`。
- 超限：日志 "WebSocket重连次数超限"，`emit('maxReconnectAttemptsReached')`。

#### `send(message)`
- `socket && readyState===1`：`socket.send({data: JSON.stringify(message)})`。
- 否则：`messageQueue.push(message)`；`socket` 不存在或 `readyState===3` 时触发 `connect()`。

#### `processMessageQueue()`
- `while (messageQueue.length > 0)` 依次 `send(this.messageQueue.shift())`。

#### `handleMessage(data)`
- `JSON.parse`（字符串）或原样（对象）。
- `emit('message', message)`。
- 若含 `op` 和 `event`：额外 `emit('${op}:${event}', message)`（如 `ai.stream:chunk`）。
- 解析失败：日志 "解析消息失败"。

#### `on(event, callback)` / `off(event, callback)` / `emit(event, data)`
- 标准发布订阅。`emit` 中每个回调 `try/catch`，失败仅日志，不影响其他回调。

#### `close()`
- `socket.close()`、`socket=null`、清空 `messageQueue` 与 `listeners`。

---

## 5.2 `chatWithAI` API 对象（前端）

文件：[api/ai.js](../../api/ai.js#L177-L273)

对外暴露的 AI 聊天 API，封装 `aiWebSocket` 单例。

### `sendMessage(message, conversationId, onMessage, onComplete, onError, options={})`

**核心流式对话方法。**

1. **连接保障**：若 `aiWebSocket.socket` 不存在或 `readyState!==1`，先 `aiWebSocket.connect().then(() => this.sendMessage(...))` 递归调用；失败走 `onError`。
2. **注册监听** `messageHandler`：
   - 过滤 `data.reqId === conversationId`（按会话 ID 路由）。
   - `op === 'ai.stream'` 时按 `event` 分发：
     - `chunk` → `onMessage(String(data.text||''), false)`
     - `final` → `onComplete(String(data.text||''))`
     - `error` → `onError(String(data.detail||'未知错误'))`
3. **发送协议负载**：

```javascript
{
  reqId: conversationId,
  op: 'ai.stream',
  data: {
    modelAlias: options.modelAlias || 'default',
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    metadata: options.metadata,
    characterName: options.characterName,
    characterId: options.characterId,
    roomId: options.roomId,
    userId: options.userId,
    systemPrompt: options.systemPrompt,
    messages: [{ role: 'user', content: String(message||'') }]
  }
}
```

4. **返回取消函数**：`() => aiWebSocket.off('message', messageHandler)`，供调用方在页面卸载时解绑。

### `startConversation()` → `string`
生成 `conv_<Date.now()>_<Math.random().toString(36).substr(2,9)>`。

### `connect()` / `disconnect()`
代理 `aiWebSocket.connect()` / `aiWebSocket.close()`。

---

## 5.3 `createStore` 与 MBTI 测试状态机（前端）

文件：[store/testStore.js](../../store/testStore.js)

自研极简发布订阅 store，模块级 `state` 与 `listeners` 共享（单例语义）。

### state 结构

```javascript
const state = {
  questions: [],      // TestQuestion[]
  answers: [],        // {questionId, optionId}[]
  currentIndex: 0,    // 当前题目索引
  result: null,       // {type, name, description}
  isLoading: false,   // 题目加载中
  isSubmitting: false,// 结果分析中
  error: null         // 错误信息
};
```

### 状态流转

```
resetTest() ──► [初始]
                   │ startTest()
                   ▼
              [isLoading=true] ──generateQuestions(20)──► [questions 加载成功]
                                                            │ setAnswer() * N
                                                            ▼
                                                      [answers 满] ──navigateToResult()──►
                                                            │ submitTest()
                                                            ▼
                                                      [isSubmitting=true] ──generateAnalysis()──► [result]
                                                                                                      │ resetTest()
                                                                                                      ▼
                                                                                                   [初始]
```

### 关键方法

- `notify()`：遍历 `listeners` 调用，通知所有订阅者。
- `startTest()`：返回 Promise。置 `isLoading=true` → `generateQuestions(20)` → `JSON.parse(questionsJson)` 写 `questions` → 失败置 `error`。
- `setAnswer(questionId, optionId)`：覆盖或追加答案；`currentIndex < questions.length-1` 时自增。
- `submitTest()`：返回 Promise。`answers.length===0` 时 reject；否则 `isSubmitting=true` → `generateAnalysis(answers)` → 写 `result`，`currentIndex=answers.length`。

---

## 5.4 豆包服务函数（前端）

文件：[services/doubao.js](../../services/doubao.js)

### `callDoubaoProxy(messages, model='doubao-seed-1.8-high')` → `Promise<string>`

直连 `http://localhost:8080/api/ai/doubao`（HTTP，绕过 `api/request.js`）。

- `wx.request POST`，body：`{messages, model, max_tokens:2000, temperature:0.7}`。
- 成功（`statusCode===200 && data.success`）：取 `data.data.choices[0].message.content` resolve。
- 失败：reject `Error(data.error || 'API 调用失败')`。

### `generateQuestions(count=20)` → `Promise<string>`

构造系统提示词（要求生成 JSON 数组题目，每题含 id/text/options/scores，覆盖 E/I、S/N、T/F、J/P），调 `callDoubaoProxy`，正则 `response.match(/\[[\s\S]*\]/)` 提取 JSON 数组字符串返回。

### `generateAnalysis(answers)` → `Promise<{type,name,description}>`

构造系统提示词（含 16 种 MBTI 类型说明），调 `callDoubaoProxy`，正则 `response.match(/\{[\s\S]*\}/)` 提取 JSON 对象并 `JSON.parse`。

---

## 5.5 `calculateMBTI` 函数（后端）

文件：[mbtiserver/src/index.ts](../../mbtiserver/src/index.ts#L256-L305)

```typescript
function calculateMBTI(answers: Answer[]): TestResult
```

本地 MBTI 计算备用方案：

1. 初始化 8 维度计分 `{E:0,I:0,S:0,N:0,T:0,F:0,J:0,P:0}`。
2. 遍历答案，从 `defaultQuestions` 查 `questionId` + `optionId`，累加 `option.scores`。
3. 4 对维度比较：`E>=I?E:I`、`S>=N?S:N`、`T>=F?T:F`、`J>=P?J:P` 拼成 4 字母类型。
4. 查 16 类型中文名映射表（如 `INTJ→建筑师`、`ENFP→竞选者`）。
5. 返回 `{type, name, description: '你是 ${type} 类型。', scores}`。

---

## 5.6 豆包代理路由处理（后端）

文件：[mbtiserver/src/index.ts](../../mbtiserver/src/index.ts#L109-L180)

`POST /api/ai/doubao` 的处理逻辑（详见 [04-后端服务 §4.7](./04-backend.md#47-豆包-ai-代理post-apiaidoubao)）。核心是「后端持有 API Key，前端不暴露」的安全代理模式，使用 Node 原生 `fetch` 调用火山方舟 ARK `/chat/completions`。

---

## 5.7 事件总线 `createBus`（前端）

文件：[utils/eventBus.js](../../utils/eventBus.js)

```javascript
export default function createBus() {
  return {
    events: {},
    on(event, callback) { ... },
    off(event, callback) { ... },  // callback 为空时清空该事件全部
    emit(event, ...args) { ... },  // 遍历调用，无 try/catch 保护
  };
}
```

在 [app.js](../../app.js) 中 `eventBus: createBus()` 挂为全局，供 `custom-tab-bar`、`pages/login`、`pages/message` 等跨页通信。

**已知事件：**
- `auth:login`：login 页 emit，message 页 on（重新拉 AI 列表）。
- `unread-num-change`：`app.setUnreadNum` emit，custom-tab-bar on（更新角标）。

---

## 5.8 关键数据结构速查

### 前端消息对象（chat / chat-room）

```javascript
{
  messageId: 'typing_xxx' | 'srv_xxx',  // typing_ 前缀为流式占位
  from: 0 | 1,                          // 0=用户, 1=AI（chat 页）
  fromUser: { userId, name, avatar },   // chat-room 页的 AI 角色信息
  content: '消息文本',
  time: 'HH:mm',
  isTyping: boolean,                    // 是否流式输出中
  isError: boolean,                     // 是否错误消息
  isSystem: boolean,                    // 是否系统消息（chat-room 欢迎语）
  read: boolean                         // 是否已读（仅 AI 消息）
}
```

### 后端 User 对象

```typescript
{
  id: string;            // uuid v4
  createdAt: string;     // ISO 时间
  answers: { questionId: number; optionId: string }[];
  result: { type: string; name: string; description: string; scores: {...} } | null;
}
```

### WebSocket 流式协议

见 [02-前端核心模块 §2.4.2](./02-frontend-core.md#242-ai-websocket-apiaijs)。
