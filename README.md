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

### 💬 消息系统
- 消息列表
- 聊天界面
- 实时通讯

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
│   └── request.js         # 请求工具函数
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
│   ├── chat/            # 聊天页面
│   ├── dataCenter/      # 数据中心
│   ├── home/            # 首页
│   ├── login/           # 登录页面
│   ├── loginCode/       # 验证码登录
│   ├── message/         # 消息页面
│   ├── my/              # 个人中心
│   │   └── info-edit/   # 资料编辑
│   ├── release/         # 发布页面
│   ├── search/          # 搜索页面
│   └── setting/         # 设置页面
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

3. **开发者工具配置**
- 打开微信开发者工具
- 导入项目文件夹
- 构建npm包
- 开始开发

### 项目配置

1. **修改项目配置**
编辑 `project.config.json` 中的 `appid` 字段为你的小程序AppID

2. **配置接口地址**
修改 `config.js` 文件：
```javascript
export default {
  isMock: false,        // 是否使用Mock数据
  baseUrl: 'your-api-url', // 你的后端API地址
};
```

## 📋 开发指南

### 页面路由配置

主要页面已在 `app.json` 中配置：
- 主包页面：首页、消息、个人中心
- 分包页面：搜索、聊天、登录、设置等

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

## 📞 反馈与支持

如果在使用过程中遇到问题或有改进建议，欢迎：
- 提交 [Issue](../../issues)
- 发起 [Pull Request](../../pulls)
- 在项目中留言讨论

---

⭐ 如果这个项目对你有帮助，欢迎 Star 支持！
