import request from 'supertest'
import express, { Express } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

// 创建测试应用
function createTestApp(): Express {
  const app = express()
  app.use(cors())
  app.use(express.json())
  
  // 内存数据库
  const users: Map<string, any> = new Map()
  const defaultQuestions = [
    {
      id: 1,
      text: '在社交场合中，你通常会：',
      options: [
        { id: 'A', text: '主动与陌生人交谈', scores: { E: 1, I: 0 } },
        { id: 'B', text: '更喜欢在小范围内交流', scores: { E: 0, I: 1 } },
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
  ]
  
  // 健康检查
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })
  
  // 获取题目
  app.get('/api/questions', (_req, res) => {
    res.json({ success: true, data: defaultQuestions, total: defaultQuestions.length })
  })
  
  // 开始测试
  app.post('/api/test/start', (_req, res) => {
    const userId = uuidv4()
    users.set(userId, { id: userId, createdAt: new Date().toISOString(), answers: [], result: null })
    res.json({ success: true, data: { userId, questionCount: defaultQuestions.length } })
  })
  
  // 提交答案
  app.post('/api/test/answer', (req, res) => {
    const { userId, questionId, optionId } = req.body
    if (!userId || !questionId || !optionId) {
      return res.status(400).json({ success: false, error: '缺少必要参数' })
    }
    const user = users.get(userId)
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' })
    }
    const existingIndex = user.answers.findIndex((a: any) => a.questionId === questionId)
    if (existingIndex >= 0) {
      user.answers[existingIndex] = { questionId, optionId }
    } else {
      user.answers.push({ questionId, optionId })
    }
    users.set(userId, user)
    res.json({ success: true, data: { questionId, optionId, answeredCount: user.answers.length, totalQuestions: defaultQuestions.length } })
  })
  
  // 计算 MBTI
  function calculateMBTI(answers: any[]) {
    const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
    answers.forEach((answer) => {
      const question = defaultQuestions.find((q) => q.id === answer.questionId)
      if (question) {
        const option = question.options.find((o) => o.id === answer.optionId)
        if (option) {
          Object.entries(option.scores).forEach(([dim, val]) => {
            if (dim in scores) scores[dim as keyof typeof scores] += val
          })
        }
      }
    })
    const type = (scores.E >= scores.I ? 'E' : 'I') + (scores.S >= scores.N ? 'S' : 'N') + (scores.T >= scores.F ? 'T' : 'F') + (scores.J >= scores.P ? 'J' : 'P')
    return { type, name: type, description: `你是 ${type} 类型。`, scores }
  }
  
  // 提交测试
  app.post('/api/test/submit', (req, res) => {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ success: false, error: '缺少用户ID' })
    const user = users.get(userId)
    if (!user) return res.status(404).json({ success: false, error: '用户不存在' })
    if (user.answers.length === 0) return res.status(400).json({ success: false, error: '还没有回答任何问题' })
    const result = calculateMBTI(user.answers)
    user.result = result
    users.set(userId, user)
    res.json({ success: true, data: result })
  })
  
  // 获取结果
  app.get('/api/test/result/:userId', (req, res) => {
    const user = users.get(req.params.userId)
    if (!user) return res.status(404).json({ success: false, error: '用户不存在' })
    if (!user.result) return res.status(400).json({ success: false, error: '测试结果尚未生成' })
    res.json({ success: true, data: user.result })
  })
  
  // 获取状态
  app.get('/api/test/status/:userId', (req, res) => {
    const user = users.get(req.params.userId)
    if (!user) return res.status(404).json({ success: false, error: '用户不存在' })
    res.json({ success: true, data: { userId: user.id, answeredCount: user.answers.length, totalQuestions: defaultQuestions.length, hasResult: user.result !== null } })
  })
  
  return app
}

describe('API 测试', () => {
  let app: Express
  
  beforeAll(() => {
    app = createTestApp()
  })
  
  describe('GET /api/health', () => {
    it('应该返回健康状态', async () => {
      const res = await request(app).get('/api/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
      expect(res.body.timestamp).toBeDefined()
    })
  })
  
  describe('GET /api/questions', () => {
    it('应该返回题目列表', async () => {
      const res = await request(app).get('/api/questions')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.total).toBe(2)
    })
  })
  
  describe('POST /api/test/start', () => {
    it('应该创建新测试并返回用户ID', async () => {
      const res = await request(app).post('/api/test/start')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.userId).toBeDefined()
      expect(res.body.data.questionCount).toBe(2)
    })
  })
  
  describe('POST /api/test/answer', () => {
    let userId: string
    
    beforeEach(async () => {
      const res = await request(app).post('/api/test/start')
      userId = res.body.data.userId
    })
    
    it('应该提交答案成功', async () => {
      const res = await request(app)
        .post('/api/test/answer')
        .send({ userId, questionId: 1, optionId: 'A' })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.answeredCount).toBe(1)
    })
    
    it('缺少参数应该返回400', async () => {
      const res = await request(app)
        .post('/api/test/answer')
        .send({ userId })
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
    
    it('用户不存在应该返回404', async () => {
      const res = await request(app)
        .post('/api/test/answer')
        .send({ userId: 'invalid-id', questionId: 1, optionId: 'A' })
      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
    
    it('应该支持更新已有答案', async () => {
      await request(app)
        .post('/api/test/answer')
        .send({ userId, questionId: 1, optionId: 'A' })
      
      const res = await request(app)
        .post('/api/test/answer')
        .send({ userId, questionId: 1, optionId: 'B' })
      
      expect(res.status).toBe(200)
      expect(res.body.data.answeredCount).toBe(1)
    })
  })
  
  describe('POST /api/test/submit', () => {
    it('应该计算并返回MBTI结果', async () => {
      const startRes = await request(app).post('/api/test/start')
      const userId = startRes.body.data.userId
      
      await request(app)
        .post('/api/test/answer')
        .send({ userId, questionId: 1, optionId: 'A' })
      await request(app)
        .post('/api/test/answer')
        .send({ userId, questionId: 2, optionId: 'A' })
      
      const res = await request(app)
        .post('/api/test/submit')
        .send({ userId })
      
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.type).toBe('ESTJ') // E+S+T+J
      expect(res.body.data.scores).toBeDefined()
    })
    
    it('没有答案应该返回400', async () => {
      const startRes = await request(app).post('/api/test/start')
      const userId = startRes.body.data.userId
      
      const res = await request(app)
        .post('/api/test/submit')
        .send({ userId })
      
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
    
    it('用户不存在应该返回404', async () => {
      const res = await request(app)
        .post('/api/test/submit')
        .send({ userId: 'invalid-id' })
      
      expect(res.status).toBe(404)
    })
  })
  
  describe('GET /api/test/result/:userId', () => {
    it('应该返回测试结果', async () => {
      const startRes = await request(app).post('/api/test/start')
      const userId = startRes.body.data.userId
      
      await request(app)
        .post('/api/test/answer')
        .send({ userId, questionId: 1, optionId: 'A' })
      await request(app)
        .post('/api/test/answer')
        .send({ userId, questionId: 2, optionId: 'A' })
      
      await request(app)
        .post('/api/test/submit')
        .send({ userId })
      
      const res = await request(app).get(`/api/test/result/${userId}`)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.type).toBeDefined()
    })
    
    it('结果未生成应该返回400', async () => {
      const startRes = await request(app).post('/api/test/start')
      const userId = startRes.body.data.userId
      
      const res = await request(app).get(`/api/test/result/${userId}`)
      expect(res.status).toBe(400)
    })
  })
  
  describe('GET /api/test/status/:userId', () => {
    it('应该返回测试状态', async () => {
      const startRes = await request(app).post('/api/test/start')
      const userId = startRes.body.data.userId
      
      await request(app)
        .post('/api/test/answer')
        .send({ userId, questionId: 1, optionId: 'A' })
      
      const res = await request(app).get(`/api/test/status/${userId}`)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.answeredCount).toBe(1)
      expect(res.body.data.totalQuestions).toBe(2)
      expect(res.body.data.hasResult).toBe(false)
    })
  })
})
