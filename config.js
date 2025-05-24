export default {
  isMock: true,
  baseUrl: '',
  // AI大模型WebSocket服务地址
  aiWebSocketUrl: 'wss://your-ai-domain.com/ws/ai',
  // 开发环境下的配置
  development: {
    isMock: true,
    baseUrl: 'http://localhost:3000',
    aiWebSocketUrl: 'ws://localhost:8080/ws/ai'
  },
  // 生产环境配置
  production: {
    isMock: false,
    baseUrl: 'https://your-api-domain.com',
    aiWebSocketUrl: 'wss://your-ai-domain.com/ws/ai'
  }
};
