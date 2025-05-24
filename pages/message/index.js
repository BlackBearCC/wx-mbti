// pages/message/message.js
const app = getApp();
let currentUser = null; // 当前打开的聊天用户 { userId, eventChannel }

// AI角色配置
const AI_CHARACTERS = [
  {
    userId: 'ai_mbti_expert',
    name: 'MBTI专家',
    avatar: '/static/ai/mbti-expert.png',
    description: '专业的MBTI性格分析师，帮您深入了解自己的性格类型',
    messages: []
  },
  {
    userId: 'ai_career_advisor',
    name: '职业规划师',
    avatar: '/static/ai/career-advisor.png', 
    description: '根据您的MBTI类型，为您提供专业的职业建议',
    messages: []
  },
  {
    userId: 'ai_relationship_coach',
    name: '情感导师',
    avatar: '/static/ai/relationship-coach.png',
    description: '基于性格分析，帮您改善人际关系',
    messages: []
  },
  {
    userId: 'ai_study_assistant',
    name: '学习助手', 
    avatar: '/static/ai/study-assistant.png',
    description: '根据您的学习风格，制定个性化学习计划',
    messages: []
  },
  {
    userId: 'ai_life_coach',
    name: '生活顾问',
    avatar: '/static/ai/life-coach.png',
    description: '提供生活建议，帮您发挥性格优势',
    messages: []
  }
];

Page({
  /** 页面的初始数据 */
  data: {
    messageList: [], // AI角色列表
    loading: true, // 是否正在加载（用于下拉刷新）
  },

  /** 生命周期函数--监听页面加载 */
  onLoad(options) {
    this.getMessageList();
  },

  /** 生命周期函数--监听页面初次渲染完成 */
  onReady() {},

  /** 生命周期函数--监听页面显示 */
  onShow() {
    currentUser = null;
    // 刷新消息列表以更新未读状态
    this.getMessageList();
  },

  /** 生命周期函数--监听页面隐藏 */
  onHide() {},

  /** 生命周期函数--监听页面卸载 */
  onUnload() {},

  /** 页面相关事件处理函数--监听用户下拉动作 */
  onPullDownRefresh() {},

  /** 页面上拉触底事件的处理函数 */
  onReachBottom() {},

  /** 用户点击右上角分享 */
  onShareAppMessage() {},

  /** 获取AI角色列表 */
  getMessageList() {
    // 获取AI聊天历史记录
    const aiChatHistory = wx.getStorageSync('ai_chat_history') || {};
    
    // 为每个AI角色添加历史消息和最后一条消息
    const aiMessageList = AI_CHARACTERS.map(character => {
      const history = aiChatHistory[character.userId] || [];
      const lastMessage = history.length > 0 ? history[history.length - 1] : null;
      
      return {
        ...character,
        messages: history,
        lastMessage: lastMessage ? lastMessage.content : character.description,
        unreadCount: this.getUnreadCount(history)
      };
    });

    this.setData({ 
      messageList: aiMessageList, 
      loading: false 
    });
  },

  /** 计算未读消息数量 */
  getUnreadCount(messages) {
    return messages.filter(msg => !msg.read && msg.from === 1).length;
  },

  /** 通过 userId 获取 user 对象和下标 */
  getUserById(userId) {
    let index = 0;
    while (index < this.data.messageList.length) {
      const user = this.data.messageList[index];
      if (user.userId === userId) return { user, index };
      index += 1;
    }
    return null;
  },

  /** 打开AI对话页 */
  toChat(event) {
    const { userId } = event.currentTarget.dataset;
    const result = this.getUserById(userId);
    
    if (result) {
      const { user } = result;
      // 跳转到AI聊天页面
      wx.navigateTo({ 
        url: `/pages/chat/index?userId=${userId}&isAI=true&name=${encodeURIComponent(user.name)}&avatar=${encodeURIComponent(user.avatar)}` 
      }).then(({ eventChannel }) => {
        currentUser = { userId, eventChannel };
        eventChannel.emit('update', user);
      });
      
      // 标记消息为已读
      this.setMessagesRead(userId);
    }
  },

  /** 将AI的所有消息标记为已读 */
  setMessagesRead(userId) {
    const result = this.getUserById(userId);
    if (result) {
      const { user } = result;
      // 标记所有AI消息为已读
      user.messages.forEach((message) => {
        if (message.from === 1) { // AI消息
          message.read = true;
        }
      });
      
      // 更新未读数量
      user.unreadCount = 0;
      this.setData({ messageList: this.data.messageList });
      
      // 更新本地存储
      const aiChatHistory = wx.getStorageSync('ai_chat_history') || {};
      aiChatHistory[userId] = user.messages;
      wx.setStorageSync('ai_chat_history', aiChatHistory);
    }
  },
});
