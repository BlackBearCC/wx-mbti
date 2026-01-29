import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8080

// Doubao API 配置
const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || ''
const DOUBAO_MODEL = process.env.DOUBAO_MODEL || 'doubao-seed-1.8-high'
const DOUBAO_BASE_URL = process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'

// 中间件
app.use(cors())
app.use(express.json())

// 类型定义
interface User {
  id: string
  createdAt: string
  answers: Answer[]
  result: TestResult | null
}

interface Answer {
  questionId: number
  optionId: string
}

interface TestResult {
  type: string
  name: string
  description: string
  scores: {
    E: number
    I: number
    S: number
    N: number
    T: number
    F: number
    J: number
    P: number
  }
}

interface TestQuestion {
  id: number
  text: string
  options: {
    id: string
    text: string
    scores: Record<string, number>
  }[]
}

// 内存数据库（生产环境应使用真实数据库）
const users: Map<string, User> = new Map()

// MBTI 题目库（备用，本项目主要使用 Doubao API 生成）
const defaultQuestions: TestQuestion[] = [
  {
    id: 1,
    text: '在社交场合中，你通常会：',
    options: [
      { id: 'A', text: '主动与陌生人交谈，享受社交互动', scores: { E: 1, I: 0 } },
      { id: 'B', text: '更喜欢在小范围内交流，需要时间适应新环境', scores: { E: 0, I: 1 } },
    ],
  },
  {
    id: 2,
    text: '做决定时，你更倾向于：',
    options: [
      { id: 'A', text: '基于逻辑和客观分析', scores: { T: 1, F: 0 } },
      { id: 'B', text: '考虑个人价值观和情感', scores: { T: 0, F: 1 } },
    ],
  },
  {
    id: 3,
    text: '你更喜欢：',
    options: [
      { id: 'A', text: '具体、实际的信息', scores: { S: 1, N: 0 } },
      { id: 'B', text: '抽象、概念化的想法', scores: { S: 0, N: 1 } },
    ],
  },
  {
    id: 4,
    text: '在生活中，你更喜欢：',
    options: [
      { id: 'A', text: '有计划、有条理的生活方式', scores: { J: 1, P: 0 } },
      { id: 'B', text: '灵活、随性的生活方式', scores: { J: 0, P: 1 } },
    ],
  },
  {
    id: 5,
    text: '与他人交流时，你更注重：',
    options: [
      { id: 'A', text: '事实和具体细节', scores: { S: 1, N: 0 } },
      { id: 'B', text: '整体含义和可能性', scores: { S: 0, N: 1 } },
    ],
  },
]

// API 路由

// Doubao AI 代理接口
app.post('/api/ai/doubao', async (req: Request, res: Response) => {
  const { messages, model, max_tokens, temperature } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({
      success: false,
      error: '缺少必要参数: messages',
    })
  }

  if (!DOUBAO_API_KEY) {
    return res.status(500).json({
      success: false,
      error: '服务器未配置 Doubao API Key',
    })
  }

  try {
    const response = await fetch(`${DOUBAO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOUBAO_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || DOUBAO_MODEL,
        messages,
        max_tokens: max_tokens || 2000,
        temperature: temperature || 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Doubao API error:', errorText)
      return res.status(response.status).json({
        success: false,
        error: `Doubao API 错误: ${response.statusText}`,
      })
    }

    const data = await response.json() as {
      id: string
      object: string
      created: number
      model: string
      choices: unknown[]
      usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
      }
    }
    res.json({
      success: true,
      data: {
        id: data.id,
        object: data.object,
        created: data.created,
        model: data.model,
        choices: data.choices,
        usage: data.usage,
      },
    })
  } catch (error) {
    console.error('Doubao proxy error:', error)
    res.status(500).json({
      success: false,
      error: '调用 Doubao API 失败',
    })
  }
})

// 健康检查
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 获取 MBTI 题目（备用，从本地题库）
app.get('/api/questions', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: defaultQuestions,
    total: defaultQuestions.length,
  })
})

// 创建新测试（初始化用户）
app.post('/api/test/start', (_req: Request, res: Response) => {
  const userId = uuidv4()
  const user: User = {
    id: userId,
    createdAt: new Date().toISOString(),
    answers: [],
    result: null,
  }
  users.set(userId, user)
  
  res.json({
    success: true,
    data: {
      userId,
      questionCount: defaultQuestions.length,
    },
  })
})

// 提交答案
app.post('/api/test/answer', (req: Request, res: Response) => {
  const { userId, questionId, optionId } = req.body
  
  if (!userId || !questionId || !optionId) {
    return res.status(400).json({
      success: false,
      error: '缺少必要参数',
    })
  }
  
  const user = users.get(userId)
  if (!user) {
    return res.status(404).json({
      success: false,
      error: '用户不存在',
    })
  }
  
  const existingIndex = user.answers.findIndex((a) => a.questionId === questionId)
  if (existingIndex >= 0) {
    user.answers[existingIndex] = { questionId, optionId }
  } else {
    user.answers.push({ questionId, optionId })
  }
  
  users.set(userId, user)
  
  res.json({
    success: true,
    data: {
      questionId,
      optionId,
      answeredCount: user.answers.length,
      totalQuestions: defaultQuestions.length,
    },
  })
})

// 计算 MBTI 结果（本地计算作为备用）
function calculateMBTI(answers: Answer[]): TestResult {
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
  
  answers.forEach((answer) => {
    const question = defaultQuestions.find((q) => q.id === answer.questionId)
    if (question) {
      const option = question.options.find((o) => o.id === answer.optionId)
      if (option) {
        Object.entries(option.scores).forEach(([dimension, value]) => {
          if (dimension in scores) {
            scores[dimension as keyof typeof scores] += value
          }
        })
      }
    }
  })
  
  // 计算四个维度
  const type = 
    (scores.E >= scores.I ? 'E' : 'I') +
    (scores.S >= scores.N ? 'S' : 'N') +
    (scores.T >= scores.F ? 'T' : 'F') +
    (scores.J >= scores.P ? 'J' : 'P')
  
  const typeNames: Record<string, string> = {
    ISTJ: '物流师',
    ISFJ: '守护者',
    ESTJ: '总经理',
    ESFJ: '执政官',
    ISTP: '鉴赏家',
    ISFP: '探险家',
    ESTP: '企业家',
    ESFP: '表演者',
    INTJ: '建筑师',
    INFJ: '提倡者',
    ENTJ: '指挥官',
    ENFJ: '主人公',
    INTP: '逻辑学家',
    INFP: '调停者',
    ENFP: '竞选者',
    ENTP: '辩论家',
  }
  
  return {
    type,
    name: typeNames[type] || '未知类型',
    description: `你是 ${type} 类型。`,
    scores,
  }
}

// 提交测试并获取结果
app.post('/api/test/submit', (req: Request, res: Response) => {
  const { userId } = req.body
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: '缺少用户ID',
    })
  }
  
  const user = users.get(userId)
  if (!user) {
    return res.status(404).json({
      success: false,
      error: '用户不存在',
    })
  }
  
  if (user.answers.length === 0) {
    return res.status(400).json({
      success: false,
      error: '还没有回答任何问题',
    })
  }
  
  // 使用本地计算结果（备用方案）
  const result = calculateMBTI(user.answers)
  user.result = result
  users.set(userId, user)
  
  res.json({
    success: true,
    data: result,
  })
})

// 获取用户测试结果
app.get('/api/test/result/:userId', (req: Request, res: Response) => {
  const { userId } = req.params
  
  const user = users.get(userId)
  if (!user) {
    return res.status(404).json({
      success: false,
      error: '用户不存在',
    })
  }
  
  if (!user.result) {
    return res.status(400).json({
      success: false,
      error: '测试结果尚未生成',
    })
  }
  
  res.json({
    success: true,
    data: user.result,
  })
})

// 获取用户测试状态
app.get('/api/test/status/:userId', (req: Request, res: Response) => {
  const { userId } = req.params
  
  const user = users.get(userId)
  if (!user) {
    return res.status(404).json({
      success: false,
      error: '用户不存在',
    })
  }
  
  res.json({
    success: true,
    data: {
      userId,
      answeredCount: user.answers.length,
      totalQuestions: defaultQuestions.length,
      hasResult: user.result !== null,
    },
  })
})

// 错误处理中间件
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
  })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`MBTI Server 运行在端口 ${PORT}`)
  console.log(`健康检查: http://localhost:${PORT}/api/health`)
})

export default app
