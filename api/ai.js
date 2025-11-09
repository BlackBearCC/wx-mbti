import config from '~/config';
import logger from '~/utils/logger';

/**
 * AI大模型WebSocket连接管理类
 */
class AIWebSocketManager {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectInterval = 2000;
    this.messageQueue = [];
    this.listeners = {};
  }

  /**
   * 连接WebSocket
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        const token = wx.getStorageSync('access_token');
        const wsOpts = {
          url: config.aiWebSocketUrl,
        };
        if (token) {
          wsOpts.header = { Authorization: token };
        }
        this.socket = wx.connectSocket(wsOpts);

        this.socket.onOpen(() => {
          logger.info('AI WebSocket连接成功');
          this.reconnectAttempts = 0;
          // 发送队列中的消息
          this.processMessageQueue();
          resolve();
        });

        this.socket.onMessage((res) => {
          this.handleMessage(res.data);
        });

        this.socket.onError((error) => {
          logger.error('AI WebSocket连接错误', { error: String(error) });
          reject(error);
        });

        this.socket.onClose(() => {
          logger.info('AI WebSocket连接关闭');
          this.handleReconnect();
        });

      } catch (error) {
        logger.error('创建WebSocket连接失败', { error: String(error) });
        reject(error);
      }
    });
  }

  /**
   * 处理重连
   */
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.info("尝试重连", { attempt: this.reconnectAttempts, max: this.maxReconnectAttempts });
      
      setTimeout(() => {
        this.connect().catch(error => {
          logger.error('重连失败', { error: String(error) });
        });
      }, this.reconnectInterval);
    } else {
      logger.error('WebSocket重连次数超限');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  /**
   * 发送消息
   */
  send(message) {
    if (this.socket && this.socket.readyState === 1) {
      this.socket.send({
        data: JSON.stringify(message)
      });
    } else {
      // 连接未就绪，加入队列
      this.messageQueue.push(message);
      if (!this.socket || this.socket.readyState === 3) {
        this.connect();
      }
    }
  }

  /**
   * 处理队列中的消息
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * 处理收到的消息
   */
  handleMessage(data) {
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : data;
      this.emit('message', message);
      // 新协议事件：按 op:event 触发（例如 'ai.stream:chunk'）
      if (message.op && message.event) this.emit(`${message.op}:${message.event}`, message);
    } catch (error) {
      logger.error('解析消息失败', { error: String(error) });
    }
  }

  /**
   * 添加事件监听
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * 移除事件监听
   */
  off(event, callback) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error('事件回调执行错误', { error: String(error) });
        }
      });
    }
  }

  /**
   * 关闭连接
   */
  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.messageQueue = [];
    this.listeners = {};
  }
}

// 创建全局实例
const aiWebSocket = new AIWebSocketManager();

/**
 * AI聊天API
 */
export const chatWithAI = {
  /**
   * 发送消息到AI
   * @param {string} message 用户消息
   * @param {string} conversationId 会话ID
   * @param {function} onMessage 接收流式响应的回调
   * @param {function} onComplete 完成回调
   * @param {function} onError 错误回调
   */
  sendMessage(message, conversationId, onMessage, onComplete, onError, options = {}) {
    // 确保连接已建立
    if (!aiWebSocket.socket || aiWebSocket.socket.readyState !== 1) {
      aiWebSocket.connect().then(() => {
        this.sendMessage(message, conversationId, onMessage, onComplete, onError);
      }).catch(onError);
      return;
    }

    // 添加事件监听
    const messageHandler = (data) => {
      // 适配后端 /service/ws 协议: {reqId, op, event, text}
      try {
        const reqId = data && data.reqId;
        const op = data && data.op;
        const event = data && data.event;
        if (reqId !== conversationId) return;
        if (op === 'ai.stream') {
          switch (event) {
            case 'chunk':
              onMessage && onMessage(String(data.text || ''), false);
              break;
            case 'final':
              // 直接在 final 事件回调完成文本
              onComplete && onComplete(String(data.text || ''));
              break;
            case 'error':
              onError && onError(String(data.detail || '未知错误'));
              break;
            default:
              break;
          }
        }
      } catch (e) {
        logger.error('处理AI流式消息失败', { error: String(e) });
      }
    };

    aiWebSocket.on('message', messageHandler);

    // 发送新协议消息
    const payload = {
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
        messages: [
          { role: 'user', content: String(message || '') }
        ]
      }
    };
    aiWebSocket.send(payload);

    // 返回取消函数
    return () => {
      aiWebSocket.off('message', messageHandler);
    };
  },

  /**
   * 开始新会话
   */
  startConversation() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * 连接AI服务
   */
  connect() {
    return aiWebSocket.connect();
  },

  /**
   * 断开连接
   */
  disconnect() {
    aiWebSocket.close();
  }
};
export default { chatWithAI };
