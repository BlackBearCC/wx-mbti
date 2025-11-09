# 微信小程序 MBTI 模板

基于 TDesign 开发的微信小程序通用模板，提供完整的用户系统、社交动态、消息系统等功能模块。

## 📱 项目简介

这是一个功能完整的微信小程序模板，采用TDesign组件库构建，包含了现代化小程序开发所需的核心功能模块。项目结构清晰，代码规范，适合作为新项目的起始模板或学习参考。

## ✨ 主要功能

### 🏠 首页模块
- 轮播图展示
- 卡片信息流
- 下拉刷新
- 发布入口

### 👤 用户系统
- 用户登录/注册
- 个人信息管理
- 头像上传
- 用户资料编辑

### 🤖 AI智能聊天系统
- **主题聊天室**：金融投资、娱乐休闲、每日记事等多个主题聊天室
- **多AI角色群聊**：每个聊天室配置多个专业AI助手，支持群聊模式
- **智能角色分配**：用户可@特定AI角色或让系统智能分配回复
- **个人AI助手**：MBTI专家、职业规划师、情感导师、学习助手、生活顾问
- **流式对话**：支持WebSocket实时通信，打字机效果
- **智能分析**：基于MBTI理论的性格分析和建议
- **聊天记录管理**：自动保存聊天历史，支持多会话切换

### 💬 消息系统
- 轮播图聊天室入口
- AI助手列表
- 实时通讯
- 未读消息提醒

### 📝 动态发布
- 图片上传
- 文本编辑
- 标签添加
- 位置定位
- 草稿保存

### 🔍 搜索功能
- 内容搜索
- 搜索历史
- 热门搜索

### ⚙️ 设置中心
- 个人设置
- 系统配置
- 隐私设置

### 📊 数据中心
- 数据统计
- 用户分析

## 🏗️ 项目结构

```
wx-mbti/
├── api/                    # API接口封装
│   ├── request.js         # 请求工具函数
│   └── ai.js              # AI聊天API
├── behaviors/             # 小程序行为
├── components/            # 自定义组件
│   ├── card/             # 卡片组件
│   └── nav/              # 导航组件
├── config/               # 配置文件
├── custom-tab-bar/       # 自定义标签栏
├── mock/                 # Mock数据
│   ├── chat.js          # 聊天数据
│   ├── index.js         # Mock入口
│   ├── mock.js          # 主要Mock数据
│   └── request.js       # Mock请求
├── pages/                # 页面文件
│   ├── chat/            # 单人AI聊天页面
│   ├── chat-room/       # 聊天室页面（多AI群聊）
│   ├── dataCenter/      # 数据中心
│   ├── home/            # 首页
│   ├── login/           # 登录页面
│   ├── loginCode/       # 验证码登录
│   ├── message/         # 消息页面（聊天室+AI助手）
│   ├── my/              # 个人中心
│   │   └── info-edit/   # 资料编辑
│   ├── release/         # 发布页面
│   ├── search/          # 搜索页面
│   └── setting/         # 设置页面
├── server-example/       # 后端服务器示例
│   └── ai-websocket-server.js  # AI WebSocket服务器
├── static/               # 静态资源
├── utils/                # 工具函数
├── app.js               # 小程序入口文件
├── app.json             # 小程序配置
├── app.less             # 全局样式
├── config.js            # 项目配置
├── package.json         # 依赖管理
└── variable.less        # 样式变量
```

## 🛠️ 技术栈

- **框架**: 微信小程序原生框架
- **UI组件库**: TDesign Miniprogram
- **样式预处理**: Less
- **代码规范**: ESLint + Prettier
- **包管理**: npm
- **AI通信**: WebSocket (支持流式响应)

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- 微信开发者工具

### 安装步骤

1. **克隆项目**
```bash
git clone [项目地址]
cd wx-mbti
```

2. **安装依赖**
```bash
npm install
```

3. **配置AI服务**
编辑 `config.js` 文件，配置您的AI WebSocket服务地址：
```javascript
export default {
  isMock: false,
  baseUrl: 'https://your-api-domain.com',
  aiWebSocketUrl: 'wss://your-ai-domain.com/service/ws'
};
```

4. **开发者工具配置**
- 打开微信开发者工具
- 导入项目文件夹
- 在小程序管理后台配置WebSocket域名
- 构建npm包
- 开始开发

### AI服务部署

项目提供了完整的AI WebSocket服务器示例 (`server-example/ai-websocket-server.js`)：

1. **安装服务器依赖**
```bash
cd server-example
npm install ws
```

2. **启动AI服务**
```bash
node ai-websocket-server.js
```

3. **集成大模型**
在 `generateAIResponse` 函数中集成您的大模型API：
```javascript
async function generateAIResponse(userMessage) {
  // 调用您的大模型API
  // 例如：OpenAI GPT、百度文心一言、阿里通义千问等
  const response = await callLLMAPI(userMessage);
  return response;
}
```

### 项目配置

1. **修改项目配置**
编辑 `project.config.json` 中的 `appid` 字段为你的小程序AppID

2. **配置通信域名**
在微信小程序管理后台配置以下域名：
- HTTPS 请求域名：你的API服务域名
- WebSocket 域名：你的AI WebSocket服务域名

## 📋 开发指南

### 聊天室功能

#### 聊天室配置
在 `pages/chat-room/index.js` 中可以自定义聊天室：
```javascript
const CHAT_ROOMS = {
  'custom_room': {
    roomId: 'custom_room',
    name: '自定义聊天室',
    aiCharacters: ['ai_mbti_expert', 'ai_career_advisor']
  }
};
```

#### 轮播图聊天室
在 `pages/message/index.js` 中配置轮播图展示的聊天室：
```javascript
const CHAT_ROOMS = [
  {
    roomId: 'finance_room',
    name: '金融投资',
    description: '专业金融分析，投资理财建议',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: '💰',
    aiCharacters: ['ai_mbti_expert', 'ai_career_advisor', 'ai_life_coach']
  }
];
```

### AI角色管理

#### 基本用法
```javascript
import { chatWithAI } from '~/api/ai';

// 发送消息到AI
const conversationId = chatWithAI.startConversation();
chatWithAI.sendMessage(
  '你好，我想了解MBTI',
  conversationId,
  (chunk, isComplete) => {
    // 处理流式响应
    this.updateMessage(chunk, isComplete);
  },
  (fullContent) => {
    // 消息完成
    this.messageComplete(fullContent);
  },
  (error) => {
    // 错误处理
    console.error('AI聊天错误:', error);
  },
  // 可选：携带新协议参数，便于后端进行角色/房间路由
  {
    modelAlias: 'default',
    characterName: 'MBTI专家',
    characterId: 'ai_mbti_expert',
    roomId: 'diary_room'
  }
);
```

#### AI角色配置
在 `pages/message/index.js` 或 `pages/chat-room/index.js` 中可以自定义AI角色：
```javascript
const AI_CHARACTERS = [
  {
    userId: 'ai_custom',
    name: '自定义AI',
    avatar: '/static/ai/custom.png',
    description: '您的专属AI助手',
    messages: []
  }
];
```

### 聊天室群聊模式

#### @特定AI角色
用户可以通过@功能与特定AI角色对话：
```javascript
// 用户输入：@MBTI专家 请帮我分析性格
// 系统会将消息发送给MBTI专家AI角色
```

#### 智能角色分配
如果用户没有@特定角色，系统会随机选择一个AI角色回复：
```javascript
detectTargetAI(content) {
  const { aiCharacters } = this.data;
  
  // 检查是否@了特定角色
  for (const character of aiCharacters) {
    if (content.includes(`@${character.name}`)) {
      return character;
    }
  }
  
  // 随机选择一个回复
  const randomIndex = Math.floor(Math.random() * aiCharacters.length);
  return aiCharacters[randomIndex];
}
```

### 页面路由配置

主要页面已在 `app.json` 中配置：
- 主包页面：首页、消息、个人中心
- 分包页面：搜索、聊天、聊天室、登录、设置等

### 组件使用

项目使用TDesign组件库，已在 `app.json` 中全局注册常用组件：
```javascript
"usingComponents": {
  "t-toast": "tdesign-miniprogram/toast/toast"
}
```

### API接口

所有接口请求统一通过 `api/request.js` 处理：
```javascript
import request from '~/api/request';

// 使用示例
const result = await request('/api/endpoint', 'POST', { data });
```

### Mock数据

开发阶段可使用Mock数据：
1. 设置 `config.js` 中 `isMock: true`
2. 在 `mock/` 目录下添加对应的Mock数据

## 🎨 自定义主题

项目支持主题自定义，在 `variable.less` 中定义了全局样式变量：

```less
// 主色调
@primary-color: #0052d9;
@success-color: #00a870;
@warning-color: #ed7b2f;
@error-color: #e34d59;

// 字体大小
@font-size-base: 28rpx;
@font-size-s: 24rpx;
@font-size-m: 32rpx;
@font-size-l: 36rpx;
```

## 📱 页面截图

### 首页
- 轮播图展示
- 信息流卡片
- 快速发布

### 聊天室功能
- 美观的轮播图聊天室入口
- 多主题聊天室（金融、娱乐、记事）
- 群聊模式与多AI角色互动
- @特定AI角色功能
- 聊天室成员展示

### AI聊天
- 个人AI助手列表
- 流式对话界面
- 打字机效果
- 智能回复

### 个人中心
- 用户信息展示
- 功能入口
- 设置选项

### 发布页面
- 图片上传
- 内容编辑
- 标签选择

## 🔧 代码规范

项目使用ESLint和Prettier进行代码规范检查：

```bash
# 代码检查
npm run lint

# 自动修复
npm run lint:fix
```

## 📦 构建部署

1. **开发环境预览**
在微信开发者工具中直接预览

2. **生产环境发布**
- 在开发者工具中点击"上传"
- 在微信公众平台提交审核
- 审核通过后发布

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 开源协议

本项目基于 [MIT](LICENSE) 协议开源

## 🔗 相关链接

- [TDesign 小程序组件库](https://tdesign.tencent.com/miniprogram/overview)
- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- [WebSocket API 文档](https://developers.weixin.qq.com/miniprogram/dev/api/network/websocket/wx.connectSocket.html)

## 📞 反馈与支持

如果在使用过程中遇到问题或有改进建议，欢迎：
- 提交 [Issue](../../issues)
- 发起 [Pull Request](../../pulls)
- 在项目中留言讨论

## 🚀 AI功能特色

### 聊天室系统
- **主题聊天室**：针对不同场景设计的专业聊天室
- **群聊模式**：一个聊天室内配置多个AI角色，模拟真实群聊体验
- **智能分配**：用户消息自动分配给合适的AI角色回复
- **角色切换**：支持@特定AI角色进行精准对话

### 多角色AI助手
- **MBTI专家**：专业性格分析和测试指导
- **职业规划师**：基于性格类型的职业建议
- **情感导师**：人际关系和沟通技巧指导
- **学习助手**：个性化学习方法推荐
- **生活顾问**：生活习惯和目标设定建议

### 智能交互特性
- **流式对话**：实时打字效果，自然对话体验
- **上下文理解**：保持对话连贯性
- **个性化回复**：根据不同AI角色特点调整回复风格
- **群聊管理**：聊天室历史记录和状态管理
- **错误恢复**：网络异常时的优雅降级处理

---

⭐ 如果这个项目对你有帮助，欢迎 Star 支持！
