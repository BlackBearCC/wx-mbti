# Code Wiki · wx-mbti 项目文档

> 本 Wiki 是对 **wx-mbti** 仓库代码的结构化解读文档，覆盖项目整体架构、主要模块职责、关键类与函数说明、依赖关系以及项目运行方式。

## 项目简介

wx-mbti 是一套基于 **微信小程序原生框架 + TDesign 组件库** 的 AI 聊天室与 MBTI 性格测试应用，配套一个 **Node.js + TypeScript + Express** 的后端服务（`mbtiserver`）。

核心能力：

- **AI 聊天室系统**：多主题聊天室、多 AI 角色群聊、@指定角色、流式 WebSocket 对话、打字机效果。
- **个人 AI 助手**：MBTI 专家、职业规划师、情感导师、学习助手、生活顾问。
- **MBTI 性格测试**：基于豆包大模型生成题目并分析结果。
- **用户系统**：微信登录、短信验证码登录、个人资料管理、设置中心。
- **内容/数据模块**：发布、搜索、数据中心可视化。

## 文档导航

| 文档 | 内容 |
|------|------|
| [01-架构总览](./01-architecture.md) | 整体架构、目录结构、技术栈、数据流 |
| [02-前端核心模块](./02-frontend-core.md) | app.js / config.js / app.json、api、utils、behaviors、custom-tab-bar、components |
| [03-前端页面详解](./03-frontend-pages.md) | 全部 pages 生命周期、数据、方法、API、WebSocket、事件总线使用 |
| [04-后端服务](./04-backend.md) | mbtiserver 架构、端点、Doubao 代理、MBTI 计算、Docker 部署 |
| [05-关键类与函数](./05-key-functions.md) | 核心类（AIWebSocketManager、testStore）与关键函数说明 |
| [06-依赖关系](./06-dependencies.md) | 前后端依赖、模块依赖、事件/存储依赖图 |
| [07-项目运行方式](./07-deployment.md) | 安装、配置、启动、预览、测试命令 |

## 快速索引

- 前端入口：[app.js](../../app.js)、[app.json](../../app.json)、[config.js](../../config.js)
- HTTP 请求层：[api/request.js](../../api/request.js)
- WebSocket 层：[api/ai.js](../../api/ai.js)
- 后端入口：[mbtiserver/src/index.ts](../../mbtiserver/src/index.ts)
- 后端 API 文档：[mbtiserver/API.md](../../mbtiserver/API.md)
- 后端 API 规格设计：[backend-api-spec.md](../../backend-api-spec.md)

## 重要说明

仓库中存在 **两套后端描述**，请勿混淆：

1. **`mbtiserver/`（本仓库内）**：Node.js + TypeScript + Express，端口 `8080`，HTTP，提供 MBTI 测试与豆包 AI 代理。本文档主要解析这一套。
2. **`wx-mbti-server`（独立仓库，见 `AGENTS.md`）**：Python 后端，端口 `8000`，强制 HTTPS/WSS，提供聊天室/角色/用户等完整业务接口。前端 `config.js` 中 `baseUrl=https://localhost:8000` 指向它。

前端 `api/request.js`（HTTPS → 8000）与 `services/doubao.js`（HTTP → 8080）分别对接上述两套后端。
