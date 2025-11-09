// pages/message/message.js
import request from '~/api/request';
const app = getApp();
let currentUser = null; // 当前打开的聊天用户 { userId, eventChannel }

// AI角色配置
const AI_CHARACTERS = [
  {
    userId: 'ai_mbti_expert',
    name: 'MBTI专家',
    avatar: '/static/ai/mbti-expert.svg',
    description: '专业的MBTI性格分析师，帮您深入了解自己的性格类型',
    messages: []
  },
  {
    userId: 'ai_career_advisor',
    name: '职业规划师',
    avatar: '/static/ai/career-advisor.svg', 
    description: '根据您的MBTI类型，为您提供专业的职业建议',
    messages: []
  },
  {
    userId: 'ai_relationship_coach',
    name: '情感导师',
    avatar: '/static/ai/relationship-coach.svg',
    description: '基于性格分析，帮您改善人际关系',
    messages: []
  },
  {
    userId: 'ai_study_assistant',
    name: '学习助手', 
    avatar: '/static/ai/study-assistant.svg',
    description: '根据您的学习风格，制定个性化学习计划',
    messages: []
  },
  {
    userId: 'ai_life_coach',
    name: '生活顾问',
    avatar: '/static/ai/life-coach.svg',
    description: '提供生活建议，帮您发挥性格优势',
    messages: []
  }
];

// 聊天室配置（模拟从服务端获取）
const CHAT_ROOMS = [
  {
    roomId: 'finance_room',
    name: '金融投资',
    description: '专业金融分析，投资理财建议',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: '💰',
    aiCharacters: ['ai_mbti_expert', 'ai_career_advisor', 'ai_life_coach']
  },
  {
    roomId: 'entertainment_room', 
    name: '娱乐休闲',
    description: '轻松聊天，娱乐互动',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    icon: '🎮',
    aiCharacters: ['ai_relationship_coach', 'ai_study_assistant', 'ai_life_coach']
  },
  {
    roomId: 'diary_room',
    name: '每日记事',
    description: '记录生活，分享心情',
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    icon: '📝',
    aiCharacters: ['ai_mbti_expert', 'ai_relationship_coach', 'ai_study_assistant']
  }
];

Page({
  /** 页面的初始数据 */
  data: {
    chatRooms: [], // 聊天室列表
    messageList: [], // AI角色列表
    loading: true, // 是否正在加载（用于下拉刷新）
    swiperCurrent: 0, // 轮播图当前索引
  },

  /** 生命周期函数--监听页面加载 */
  onLoad(options) {
    this.getChatRooms();
    this.getMessageList();
  },

  /** 生命周期函数--监听页面初次渲染完成 */
  onReady() {},

  /** 生命周期函数--监听页面显示 */
  onShow() {
    currentUser = null;
    // 刷新消息列表以更新未读状态
    this.getMessageList();
    this.updateChatRoomsHistory();
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

  /** 获取聊天室列表（对齐后端：使用 /home/cards 作为房间入口数据） */
  getChatRooms() {
    request('/home/cards')
      .then((res) => {
        const cards = (res && res.data && res.data.cards) || [];
        // 规范化为本页需要的房间字段
        const rooms = cards.map((c) => ({
          roomId: c.roomId || c.id,
          name: c.title || c.name,
          description: c.description || '',
          background: c.background || '',
          icon: c.icon || '',
        }));
        this.setData({ chatRooms: rooms });
        this.updateChatRoomsHistory();
      })
      .catch((err) => {
        console.error('获取聊天室列表失败:', err);
        // 回退到本地静态配置
        this.setData({ chatRooms: (Array.isArray(CHAT_ROOMS) ? CHAT_ROOMS : []) });
        this.updateChatRoomsHistory();
        wx.showToast({ title: '使用本地聊天室配置', icon: 'none' });
      });
  },

  /** 更新聊天室历史记录 */
  updateChatRoomsHistory() {
    const chatRoomsHistory = wx.getStorageSync('chat_rooms_history') || {};
    const updatedRooms = this.data.chatRooms.map(room => ({
      ...room,
      lastMessage: chatRoomsHistory[room.roomId]?.lastMessage || '',
      lastTime: chatRoomsHistory[room.roomId]?.lastTime || '',
      unreadCount: chatRoomsHistory[room.roomId]?.unreadCount || 0
    }));
    
    this.setData({ chatRooms: updatedRooms });
  },

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

  /** 轮播图切换事件 */
  onSwiperChange(e) {
    this.setData({
      swiperCurrent: e.detail.current
    });
  },

  /** 进入聊天室 */
  enterChatRoom(e) {
    const { roomId } = e.currentTarget.dataset;
    const room = this.data.chatRooms.find(r => r.roomId === roomId);
    
    if (room) {
      wx.navigateTo({
        url: `/pages/chat-room/index?roomId=${roomId}&roomName=${encodeURIComponent(room.name)}`
      });
      
      // 更新聊天室访问记录
      this.updateRoomVisitHistory(roomId);
    }
  },

  /** 更新聊天室访问记录 */
  updateRoomVisitHistory(roomId) {
    const chatRoomsHistory = wx.getStorageSync('chat_rooms_history') || {};
    if (!chatRoomsHistory[roomId]) {
      chatRoomsHistory[roomId] = {
        visitTime: Date.now(),
        lastMessage: '',
        lastTime: '',
        unreadCount: 0
      };
      wx.setStorageSync('chat_rooms_history', chatRoomsHistory);
    }
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
