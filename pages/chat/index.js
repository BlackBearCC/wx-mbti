// pages/chat/index.js
import { chatWithAI, mbtiAnalysis } from '~/api/ai';

const app = getApp();

Page({
  /** 页面的初始数据 */
  data: {
    myAvatar: '/static/chat/avatar.png', // 自己的头像
    userId: null, // 对方userId
    avatar: '', // 对方头像
    name: '', // 对方昵称
    messages: [], // 消息列表 { messageId, from, content, time, read }
    input: '', // 输入框内容
    anchor: '', // 消息列表滚动到 id 与之相同的元素的位置
    keyboardHeight: 0, // 键盘当前高度(px)
    isTyping: false, // AI是否正在输入
    conversationId: null, // AI会话ID
    currentAIMessage: null, // 当前AI正在发送的消息
  },

  /** 生命周期函数--监听页面加载 */
  onLoad(options) {
    // 从URL参数获取信息
    const { userId, name, avatar } = options;
    this.setData({ 
      userId: userId,
      name: decodeURIComponent(name || ''),
      avatar: decodeURIComponent(avatar || ''),
      conversationId: chatWithAI.startConversation()
    });
    
    // 连接AI服务
    this.connectAI();
    
    // 添加欢迎消息
    this.addWelcomeMessage();
    
    this.getOpenerEventChannel().on('update', this.update);
  },

  /** 生命周期函数--监听页面初次渲染完成 */
  onReady() {},

  /** 生命周期函数--监听页面显示 */
  onShow() {},

  /** 生命周期函数--监听页面隐藏 */
  onHide() {},

  /** 生命周期函数--监听页面卸载 */
  onUnload() {
    app.eventBus.off('update', this.update);
    // 断开AI连接
    chatWithAI.disconnect();
  },

  /** 页面相关事件处理函数--监听用户下拉动作 */
  onPullDownRefresh() {},

  /** 页面上拉触底事件的处理函数 */
  onReachBottom() {},

  /** 用户点击右上角分享 */
  onShareAppMessage() {},

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

  /** 添加欢迎消息 */
  addWelcomeMessage() {
    const { userId } = this.data;
    let welcomeText = '您好！我是您的AI助手，很高兴为您服务！';
    
    // 根据不同AI角色设置不同的欢迎语
    switch (userId) {
      case 'ai_mbti_expert':
        welcomeText = '您好！我是MBTI专家，可以帮您进行性格分析和测试。您可以问我关于MBTI的任何问题，或者直接开始一个性格测试。';
        break;
      case 'ai_career_advisor':
        welcomeText = '您好！我是职业规划师，可以根据您的性格特点为您提供职业建议。请告诉我您的MBTI类型或者想了解的职业方向。';
        break;
      case 'ai_relationship_coach':
        welcomeText = '您好！我是情感导师，可以帮您分析人际关系问题，提供沟通建议。有什么困扰可以和我聊聊。';
        break;
      case 'ai_study_assistant':
        welcomeText = '您好！我是学习助手，可以根据您的学习风格制定学习计划。告诉我您在学习中遇到的问题吧！';
        break;
      case 'ai_life_coach':
        welcomeText = '您好！我是生活顾问，可以帮您发挥性格优势，改善生活品质。有什么想聊的话题吗？';
        break;
    }

    const welcomeMessage = {
      messageId: Date.now(),
      from: 1,
      content: welcomeText,
      time: Date.now(),
      read: true
    };

    const messages = [welcomeMessage];
    this.setData({ messages });
    this.saveAIHistory();
  },

  /** 更新数据 */
  update({ userId, avatar, name, messages }) {
    this.setData({ userId, avatar, name, messages: [...messages] });
    wx.nextTick(this.scrollToBottom);
  },

  /** 处理唤起键盘事件 */
  handleKeyboardHeightChange(event) {
    const { height } = event.detail;
    if (!height) return;
    this.setData({ keyboardHeight: height });
    wx.nextTick(this.scrollToBottom);
  },

  /** 处理收起键盘事件 */
  handleBlur() {
    this.setData({ keyboardHeight: 0 });
  },

  /** 处理输入事件 */
  handleInput(event) {
    this.setData({ input: event.detail.value });
  },

  /** 发送消息 */
  sendMessage() {
    const { userId, messages, input: content, conversationId } = this.data;
    if (!content.trim()) return;

    // 添加用户消息
    const userMessage = { 
      messageId: Date.now(), 
      from: 0, 
      content: content.trim(), 
      time: Date.now(), 
      read: true 
    };
    messages.push(userMessage);
    this.setData({ input: '', messages });

    // 发送AI消息
    this.sendAIMessage(content.trim(), conversationId);

    wx.nextTick(this.scrollToBottom);
  },

  /** 发送AI消息 */
  sendAIMessage(message, conversationId) {
    // 添加AI正在输入的提示消息
    const typingMessage = {
      messageId: 'typing_' + Date.now(),
      from: 1,
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
        this.handleAIMessageComplete(fullContent);
      },
      // 错误回调
      (error) => {
        this.handleAIError(error);
      }
    );
  },

  /** 处理AI流式响应 */
  handleAIMessageChunk(chunk, isComplete) {
    const { messages, currentAIMessage } = this.data;
    
    if (currentAIMessage) {
      // 更新当前AI消息内容
      currentAIMessage.content += chunk;
      currentAIMessage.isTyping = !isComplete;
      
      // 找到并更新消息
      const messageIndex = messages.findIndex(msg => msg.messageId === currentAIMessage.messageId);
      if (messageIndex !== -1) {
        messages[messageIndex] = { ...currentAIMessage };
        this.setData({ messages });
        wx.nextTick(this.scrollToBottom);
      }
    }
  },

  /** 处理AI消息完成 */
  handleAIMessageComplete(fullContent) {
    const { messages, currentAIMessage } = this.data;
    
    if (currentAIMessage) {
      // 更新最终消息
      currentAIMessage.content = fullContent;
      currentAIMessage.isTyping = false;
      currentAIMessage.messageId = Date.now();
      
      const messageIndex = messages.findIndex(msg => msg.messageId.toString().startsWith('typing_'));
      if (messageIndex !== -1) {
        messages[messageIndex] = { ...currentAIMessage };
      }
      
      this.setData({ 
        messages,
        isTyping: false,
        currentAIMessage: null
      });
      
      // 保存聊天记录
      this.saveAIHistory();
      wx.nextTick(this.scrollToBottom);
    }
  },

  /** 处理AI错误 */
  handleAIError(error) {
    console.error('AI聊天错误:', error);
    
    // 移除输入提示消息
    const messages = this.data.messages.filter(msg => !msg.messageId.toString().startsWith('typing_'));
    
    // 添加错误消息
    const errorMessage = {
      messageId: Date.now(),
      from: 1,
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

  /** 保存AI聊天历史 */
  saveAIHistory() {
    const { userId, messages } = this.data;
    const aiChatHistory = wx.getStorageSync('ai_chat_history') || {};
    
    // 过滤掉正在输入的消息
    const validMessages = messages.filter(msg => !msg.isTyping);
    aiChatHistory[userId] = validMessages;
    
    wx.setStorageSync('ai_chat_history', aiChatHistory);
  },

  /** 消息列表滚动到底部 */
  scrollToBottom() {
    this.setData({ anchor: 'bottom' });
  },
});
