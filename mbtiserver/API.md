# MBTI Server API 接口文档

## 基础信息

- **Base URL**: `http://localhost:8080/api`
- **Content-Type**: `application/json`

## 接口列表

### 1. Doubao AI 代理接口

**POST** `/api/ai/doubao`

通过后端代理调用 Doubao AI 模型，所有 AI 请求都通过此接口，后端负责安全地管理 API Key。

**请求体**:
```json
{
  "messages": [
    {
      "role": "system",
      "content": "你是一个专业的MBTI性格分析专家..."
    },
    {
      "role": "user",
      "content": "请分析我的性格类型..."
    }
  ],
  "model": "doubao-seed-1.8-high",
  "max_tokens": 2000,
  "temperature": 0.7
}
```

**请求参数说明**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| messages | Array | 是 | - | 消息数组 |
| model | String | 否 | doubao-seed-1.8-high | 模型名称 |
| max_tokens | Number | 否 | 2000 | 最大输出 tokens |
| temperature | Number | 否 | 0.7 | 温度参数 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "chatcmpl-abc123",
    "object": "chat.completion",
    "created": 1699000000,
    "model": "doubao-seed-1.8-high",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "根据您的回答..."
        },
        "finish_reason": "stop"
      }
    ],
    "usage": {
      "prompt_tokens": 150,
      "completion_tokens": 200,
      "total_tokens": 350
    }
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "缺少必要参数: messages"
}
```

**环境变量**:
| 变量 | 说明 | 默认值 |
|------|------|--------|
| DOUBAO_API_KEY | Doubao API 密钥 | - |
| DOUBAO_MODEL | 默认模型名称 | doubao-seed-1.8-high |
| DOUBAO_BASE_URL | Doubao API 基础URL | https://ark.cn-beijing.volces.com/api/v3 |

---

### 2. 健康检查

**GET** `/api/health`

检查服务是否正常运行。

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 3. 获取题目列表

**GET** `/api/questions`

获取 MBTI 测试题目列表。

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "text": "在社交场合中，你通常会：",
      "options": [
        {
          "id": "A",
          "text": "主动与陌生人交谈",
          "scores": { "E": 1, "I": 0 }
        },
        {
          "id": "B",
          "text": "更喜欢在小范围内交流",
          "scores": { "E": 0, "I": 1 }
        }
      ]
    }
  ],
  "total": 20
}
```

---

### 4. 开始测试

**POST** `/api/test/start`

创建新的测试会话。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "questionCount": 20
  }
}
```

---

### 5. 提交答案

**POST** `/api/test/answer`

提交单道题的答案。

**请求体**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "questionId": 1,
  "optionId": "A"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "questionId": 1,
    "optionId": "A",
    "answeredCount": 1,
    "totalQuestions": 20
  }
}
```

**错误响应**:
- `400`: 缺少必要参数
- `404`: 用户不存在

---

### 6. 提交测试

**POST** `/api/test/submit`

完成测试并计算结果。

**请求体**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "type": "INTJ",
    "name": "建筑师",
    "description": "你是 INTJ 类型...",
    "scores": {
      "E": -2,
      "I": 2,
      "S": -1,
      "N": 1,
      "T": 3,
      "F": -3,
      "J": 2,
      "P": -2
    }
  }
}
```

**错误响应**:
- `400`: 还没有回答任何问题
- `404`: 用户不存在

---

### 7. 获取测试结果

**GET** `/api/test/result/:userId`

获取指定用户的测试结果。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "type": "INTJ",
    "name": "建筑师",
    "description": "你是 INTJ 类型...",
    "scores": {
      "E": -2,
      "I": 2,
      "S": -1,
      "N": 1,
      "T": 3,
      "F": -3,
      "J": 2,
      "P": -2
    }
  }
}
```

**错误响应**:
- `400`: 测试结果尚未生成
- `404`: 用户不存在

---

### 8. 获取测试状态

**GET** `/api/test/status/:userId`

获取用户的测试进度。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "answeredCount": 5,
    "totalQuestions": 20,
    "hasResult": false
  }
}
```

**错误响应**:
- `404`: 用户不存在

---

## MBTI 类型对照表

| 类型 | 中文名 | 描述 |
|------|--------|------|
| ISTJ | 物流师 | 务实、可靠、注重细节 |
| ISFJ | 守护者 | 忠诚、温暖、注重他人需求 |
| ESTJ | 总经理 | 果断、务实、善于组织 |
| ESFJ | 执政官 | 热情、社交、注重和谐 |
| ISTP | 鉴赏家 | 灵活、务实、善于动手 |
| ISFP | 探险家 | 温和、敏感、追求美 |
| ESTP | 企业家 | 活力充沛、善于应变 |
| ESFP | 表演者 | 热情、开朗、享受当下 |
| INTJ | 建筑师 | 独立、战略、追求效率 |
| INFJ | 提倡者 | 理想主义、善于洞察 |
| ENTJ | 指挥官 | 果断、善于领导 |
| ENFJ | 主人公 | 热情、善于激励 |
| INTP | 逻辑学家 | 理性、好奇、追求真理 |
| INFP | 调停者 | 理想主义、注重价值观 |
| ENTP | 辩论家 | 创新、善于思考可能性 |
| ENFP | 竞选者 | 热情、创意、充满活力 |

---

## 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
