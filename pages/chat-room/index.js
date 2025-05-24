import { chatWithAI } from '~/api/ai';

const app = getApp();

// AI角色配置
const AI_CHARACTERS = {
  'ai_mbti_expert': {
    userId: 'ai_mbti_expert',
    name: 'MBTI专家',
    avatar: '/static/ai/mbti-expert.svg',
    description: '专业的MBTI性格分析师'
  },
  'ai_career_advisor': {
    userId: 'ai_career_advisor',
    name: '职业规划师',
    avatar: '/static/ai/career-advisor.svg',
    description: '专业的职业规划建议'
  },
  'ai_relationship_coach': {
    userId: 'ai_relationship_coach',
    name: '情感导师',
    avatar: '/static/ai/relationship-coach.svg',
    description: '人际关系专家'
  },
  'ai_study_assistant': {
    userId: 'ai_study_assistant',
    name: '学习助手',
    avatar: '/static/ai/study-assistant.svg',
    description: '个性化学习指导'
  },
  'ai_life_coach': {
    userId: 'ai_life_coach',
    name: '生活顾问',
    avatar: '/static/ai/life-coach.svg',
    description: '生活建议专家'
  }
};

// 聊天室配置
const CHAT_ROOMS = {
  'finance_room': {
    roomId: 'finance_room',
    name: '金融投资',
    aiCharacters: ['ai_mbti_expert', 'ai_career_advisor', 'ai_life_coach']
  },
  'entertainment_room': {
    roomId: 'entertainment_room',
    name: '娱乐休闲',
    aiCharacters: ['ai_relationship_coach', 'ai_study_assistant', 'ai_life_coach']
  },
  'diary_room': {
    roomId: 'diary_room',
    name: '每日记事',
    aiCharacters: ['ai_mbti_expert', 'ai_relationship_coach', 'ai_study_assistant']
  }
};

Page({
  /** 页面的初始数据 */
  data: {
    myAvatar: '/static/chat/avatar.png',
    roomId: '',
    roomName: '',
    aiCharacters: [], // 聊天室内的AI角色
    messages: [], // 消息列表
    input: '',
    anchor: '',
    keyboardHeight: 0,
    isTyping: false,
    conversationId: null,
    currentAIMessage: null,
    showCharacterList: false, // 是否显示角色选择
  },

  /** 生命周期函数--监听页面加载 */
  onLoad(options) {
    const { roomId, roomName } = options;
    const room = CHAT_ROOMS[roomId];
    
    if (room) {
      // 获取聊天室内的AI角色
      const characters = room.aiCharacters.map(id => AI_CHARACTERS[id]).filter(Boolean);
      
      this.setData({
        roomId,
        roomName: decodeURIComponent(roomName || ''),
        aiCharacters: characters,
        conversationId: chatWithAI.startConversation()
      });
      
      // 连接AI服务
      this.connectAI();
      
      // 加载聊天记录
      this.loadChatHistory();
      
      // 添加欢迎消息
      this.addWelcomeMessage();
    }
  },

  /** 生命周期函数--监听页面卸载 */
  onUnload() {
    // 断开AI连接
    chatWithAI.disconnect();
    
    // 保存聊天记录到聊天室历史
    this.saveChatRoomHistory();
  },

  /** 连接AI服务 */
  connectAI() {
    chatWithAI.connect().catch(error => {
      console.error('AI连接失败:', error);
      wx.showToast({
        title: 'AI服务连接失败',
        icon: 'none'
      });
    });
  },

  /** 加载聊天记录 */
  loadChatHistory() {
    const { roomId } = this.data;
    const roomHistory = wx.getStorageSync(`chat_room_${roomId}`) || [];
    this.setData({ messages: roomHistory });
    wx.nextTick(this.scrollToBottom);
  },

  /** 添加欢迎消息 */
  addWelcomeMessage() {
    const { messages, roomName, aiCharacters } = this.data;
    
    if (messages.length === 0) {
      const welcomeMessage = {
        messageId: Date.now(),
        from: 1,
        fromUser: null,
        content: `欢迎来到${roomName}聊天室！这里有${aiCharacters.length}位AI助手为您服务。您可以直接发送消息，或者点击右上角选择特定的AI助手进行对话。`,
        time: Date.now(),
        read: true,
        isSystem: true
      };
      
      this.setData({ 
        messages: [welcomeMessage] 
      });
      this.saveChatHistory();
    }
  },

  /** 处理输入事件 */
  handleInput(event) {
    this.setData({ input: event.detail.value });
  },

  /** 处理键盘高度变化 */
  handleKeyboardHeightChange(event) {
    const { height } = event.detail;
    if (!height) return;
    this.setData({ keyboardHeight: height });
    wx.nextTick(this.scrollToBottom);
  },

  /** 处理键盘收起 */
  handleBlur() {
    this.setData({ keyboardHeight: 0 });
  },

  /** 显示/隐藏角色选择 */
  toggleCharacterList() {
    this.setData({
      showCharacterList: !this.data.showCharacterList
    });
  },

  /** 选择AI角色 */
  selectCharacter(e) {
    const { userId } = e.currentTarget.dataset;
    const character = this.data.aiCharacters.find(c => c.userId === userId);
    
    if (character) {
      // 添加@角色的提示
      const atMessage = `@${character.name} `;
      this.setData({
        input: this.data.input + atMessage,
        showCharacterList: false
      });
    }
  },

  /** 发送消息 */
  sendMessage() {
    const { messages, input: content, conversationId } = this.data;
    if (!content.trim()) return;

    // 添加用户消息
    const userMessage = {
      messageId: Date.now(),
      from: 0,
      fromUser: null,
      content: content.trim(),
      time: Date.now(),
      read: true
    };
    
    messages.push(userMessage);
    this.setData({ input: '', messages });

    // 检测是否@了特定AI角色
    const targetAI = this.detectTargetAI(content);
    
    // 发送AI消息
    this.sendAIMessage(content.trim(), conversationId, targetAI);

    wx.nextTick(this.scrollToBottom);
  },

  /** 检测目标AI角色 */
  detectTargetAI(content) {
    const { aiCharacters } = this.data;
    
    // 检查是否@了特定角色
    for (const character of aiCharacters) {
      if (content.includes(`@${character.name}`)) {
        return character;
      }
    }
    
    // 如果没有@特定角色，随机选择一个回复
    const randomIndex = Math.floor(Math.random() * aiCharacters.length);
    return aiCharacters[randomIndex];
  },

  /** 发送AI消息 */
  sendAIMessage(message, conversationId, targetAI) {
    if (!targetAI) return;
    
    // 添加AI正在输入的提示
    const typingMessage = {
      messageId: 'typing_' + Date.now(),
      from: 1,
      fromUser: targetAI,
      content: '',
      time: Date.now(),
      read: true,
      isTyping: true
    };

    const messages = [...this.data.messages, typingMessage];
    this.setData({
      messages,
      isTyping: true,
      currentAIMessage: typingMessage
    });
    wx.nextTick(this.scrollToBottom);

    // 发送消息到AI
    chatWithAI.sendMessage(
      message,
      conversationId,
      // 流式响应回调
      (chunk, isComplete) => {
        this.handleAIMessageChunk(chunk, isComplete);
      },
      // 完成回调
      (fullContent) => {
        this.handleAIMessageComplete(fullContent, targetAI);
      },
      // 错误回调
      (error) => {
        this.handleAIError(error, targetAI);
      }
    );
  },

  /** 处理AI流式响应 */
  handleAIMessageChunk(chunk, isComplete) {
    const { messages, currentAIMessage } = this.data;
    
    if (currentAIMessage) {
      currentAIMessage.content += chunk;
      currentAIMessage.isTyping = !isComplete;
      
      const messageIndex = messages.findIndex(msg => msg.messageId === currentAIMessage.messageId);
      if (messageIndex !== -1) {
        messages[messageIndex] = { ...currentAIMessage };
        this.setData({ messages });
        wx.nextTick(this.scrollToBottom);
      }
    }
  },

  /** 处理AI消息完成 */
  handleAIMessageComplete(fullContent, targetAI) {
    const { messages, currentAIMessage } = this.data;
    
    if (currentAIMessage) {
      currentAIMessage.content = fullContent;
      currentAIMessage.isTyping = false;
      currentAIMessage.messageId = Date.now();
      currentAIMessage.fromUser = targetAI;
      
      const messageIndex = messages.findIndex(msg => msg.messageId.toString().startsWith('typing_'));
      if (messageIndex !== -1) {
        messages[messageIndex] = { ...currentAIMessage };
      }
      
      this.setData({
        messages,
        isTyping: false,
        currentAIMessage: null
      });
      
      this.saveChatHistory();
      wx.nextTick(this.scrollToBottom);
    }
  },

  /** 处理AI错误 */
  handleAIError(error, targetAI) {
    console.error('AI聊天错误:', error);
    
    const messages = this.data.messages.filter(msg => !msg.messageId.toString().startsWith('typing_'));
    
    const errorMessage = {
      messageId: Date.now(),
      from: 1,
      fromUser: targetAI,
      content: '抱歉，我暂时无法回复您的消息，请稍后再试。',
      time: Date.now(),
      read: true,
      isError: true
    };
    
    messages.push(errorMessage);
    this.setData({
      messages,
      isTyping: false,
      currentAIMessage: null
    });
    
    wx.showToast({
      title: 'AI服务异常',
      icon: 'none'
    });
  },

  /** 保存聊天记录 */
  saveChatHistory() {
    const { roomId, messages } = this.data;
    const validMessages = messages.filter(msg => !msg.isTyping);
    wx.setStorageSync(`chat_room_${roomId}`, validMessages);
  },

  /** 保存聊天室历史记录 */
  saveChatRoomHistory() {
    const { roomId, messages } = this.data;
    const validMessages = messages.filter(msg => !msg.isTyping && !msg.isSystem);
    
    if (validMessages.length > 0) {
      const lastMessage = validMessages[validMessages.length - 1];
      const chatRoomsHistory = wx.getStorageSync('chat_rooms_history') || {};
      
      chatRoomsHistory[roomId] = {
        lastMessage: lastMessage.content,
        lastTime: lastMessage.time,
        visitTime: Date.now(),
        unreadCount: 0
      };
      
      wx.setStorageSync('chat_rooms_history', chatRoomsHistory);
    }
  },

  /** 消息列表滚动到底部 */
  scrollToBottom() {
    this.setData({ anchor: 'bottom' });
  },
}); 