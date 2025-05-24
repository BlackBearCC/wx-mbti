import config from '~/config';

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
        this.socket = wx.connectSocket({
          url: config.aiWebSocketUrl,
          protocols: ['websocket'],
          header: {
            'Authorization': wx.getStorageSync('access_token') || ''
          }
        });

        this.socket.onOpen(() => {
          console.log('AI WebSocket连接成功');
          this.reconnectAttempts = 0;
          // 发送队列中的消息
          this.processMessageQueue();
          resolve();
        });

        this.socket.onMessage((res) => {
          this.handleMessage(res.data);
        });

        this.socket.onError((error) => {
          console.error('AI WebSocket连接错误:', error);
          reject(error);
        });

        this.socket.onClose(() => {
          console.log('AI WebSocket连接关闭');
          this.handleReconnect();
        });

      } catch (error) {
        console.error('创建WebSocket连接失败:', error);
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
      console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('重连失败:', error);
        });
      }, this.reconnectInterval);
    } else {
      console.error('WebSocket重连次数超限');
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
      
      // 根据消息类型分发
      if (message.type) {
        this.emit(message.type, message);
      }
    } catch (error) {
      console.error('解析消息失败:', error);
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
          console.error('事件回调执行错误:', error);
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
  sendMessage(message, conversationId, onMessage, onComplete, onError) {
    // 确保连接已建立
    if (!aiWebSocket.socket || aiWebSocket.socket.readyState !== 1) {
      aiWebSocket.connect().then(() => {
        this.sendMessage(message, conversationId, onMessage, onComplete, onError);
      }).catch(onError);
      return;
    }

    // 添加事件监听
    const messageHandler = (data) => {
      if (data.conversationId === conversationId) {
        switch (data.type) {
          case 'message_chunk':
            onMessage && onMessage(data.content, data.isComplete);
            break;
          case 'message_complete':
            onComplete && onComplete(data.fullContent);
            break;
          case 'error':
            onError && onError(data.error);
            break;
        }
      }
    };

    aiWebSocket.on('message', messageHandler);

    // 发送消息
    aiWebSocket.send({
      type: 'chat',
      message: message,
      conversationId: conversationId,
      timestamp: Date.now()
    });

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

/**
 * MBTI分析API
 */
export const mbtiAnalysis = {
  /**
   * 开始MBTI测试
   * @param {function} onQuestion 接收问题的回调
   * @param {function} onComplete 测试完成回调
   * @param {function} onError 错误回调
   */
  startTest(onQuestion, onComplete, onError) {
    const testId = 'mbti_' + Date.now();
    
    const messageHandler = (data) => {
      if (data.testId === testId) {
        switch (data.type) {
          case 'question':
            onQuestion && onQuestion(data.question, data.questionIndex, data.totalQuestions);
            break;
          case 'test_complete':
            onComplete && onComplete(data.result);
            break;
          case 'error':
            onError && onError(data.error);
            break;
        }
      }
    };

    aiWebSocket.on('message', messageHandler);

    aiWebSocket.send({
      type: 'mbti_test',
      action: 'start',
      testId: testId
    });

    return testId;
  },

  /**
   * 提交答案
   * @param {string} testId 测试ID
   * @param {number} questionIndex 问题索引
   * @param {string} answer 答案
   */
  submitAnswer(testId, questionIndex, answer) {
    aiWebSocket.send({
      type: 'mbti_test',
      action: 'answer',
      testId: testId,
      questionIndex: questionIndex,
      answer: answer
    });
  },

  /**
   * 分析用户行为生成MBTI建议
   * @param {object} behaviorData 行为数据
   * @param {function} onResult 结果回调
   */
  analyzeBehavior(behaviorData, onResult, onError) {
    const analysisId = 'analysis_' + Date.now();
    
    const messageHandler = (data) => {
      if (data.analysisId === analysisId) {
        switch (data.type) {
          case 'analysis_result':
            onResult && onResult(data.result);
            break;
          case 'error':
            onError && onError(data.error);
            break;
        }
      }
    };

    aiWebSocket.on('message', messageHandler);

    aiWebSocket.send({
      type: 'behavior_analysis',
      analysisId: analysisId,
      behaviorData: behaviorData
    });
  }
};

export default { chatWithAI, mbtiAnalysis }; 