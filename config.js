export default {
  // 是否使用本地模拟数据
  isMock: false,
  // 后端 API 根地址（本地 FastAPI/Swagger: http://localhost:8000）
  baseUrl: 'http://localhost:8000',
  // AI大模型WebSocket服务地址
  aiWebSocketUrl: 'ws://localhost:8000/service/ws',
  // 开发环境下的配置
  development: {
    isMock: false,
    baseUrl: 'http://localhost:8000',
    aiWebSocketUrl: 'ws://localhost:8000/service/ws'
  },
  // 生产环境配置
  production: {
    isMock: false,
    baseUrl: 'https://your-api-domain.com',
    aiWebSocketUrl: 'wss://your-ai-domain.com/service/ws'
  }
};
