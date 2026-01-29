# MBTI 性格测试 - 微信小程序

基于豆包大模型的 MBTI 性格测试应用。

## 项目结构

```
wx-mbti/
├── app.js              # 应用入口
├── app.json            # 应用配置
├── app.wxss            # 全局样式
├── pages/
│   ├── home/           # 首页（MBTI 测试入口）
│   ├── test/           # 测试页面（答题）
│   └── result/         # 结果页面（性格分析）
├── services/
│   └── doubao.js       # 豆包 API 调用服务
└── store/
    └── testStore.js    # 全局状态管理
```

## 快速开始

### 1. 配置后端服务

确保 `mbtiserver` 已启动：

```bash
cd wx-mbti/mbtiserver
npm run build
npm start
```

默认端口：`8080`

### 2. 配置豆包 API Key

编辑 `mbtiserver/.env` 文件：

```bash
DOUBAO_API_KEY=你的豆包API密钥
DOUBAO_MODEL=doubao-seed-1.8-high
```

### 3. 微信开发者工具

1. 用微信开发者工具打开 `wx-mbti` 目录
2. 在本地设置中勾选"不校验合法域名"
3. 点击"编译"运行

## 功能

- **首页**：MBTI 测试介绍，点击"开始测试"
- **测试页**：20 道 AI 生成的 MBTI 测试题
- **结果页**：AI 分析性格类型，提供详细报告

## 技术栈

- **前端**：微信小程序原生开发（WXML, WXSS, JavaScript）
- **后端**：Node.js + Express（`mbtiserver`）
- **AI**：豆包大模型（doubao-seed-1.8-high）

## API 接口

后端提供 `/api/ai/doubao` 接口：

- **用途**：生成题目、分析结果
- **方法**：POST
- **参数**：
  ```json
  {
    "messages": [
      { "role": "system", "content": "..." },
      { "role": "user", "content": "..." }
    ],
    "model": "doubao-seed-1.8-high"
  }
  ```

## 注意事项

1. 确保后端服务已启动
2. 微信小程序中需要勾选"不校验合法域名"
3. 豆包 API Key 需要有效且有调用额度
