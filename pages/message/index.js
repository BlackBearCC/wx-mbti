// pages/message/message.js
import request from '~/api/request';
const app = getApp();
let currentUser = null; // 当前打开的聊天用户 { userId, eventChannel }

// 禁止使用本地 AI 角色配置，统一从后端获取
import config from '~/config';
import { DATA_URI_LOADING } from '~/utils/placeholders';
function toAbsUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${config.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

function withDefaultAvatar(url) {
  const abs = toAbsUrl(url);
  return abs || DATA_URI_LOADING;
}

// 统一强制转为 HTTPS（小程序 image 禁止 http）
function ensureHttps(u) {
  if (!u) return u;
  const { enforceHttpsAssets } = config;
  return enforceHttpsAssets ? u.replace(/^http:\/\//i, 'https://') : u;
}

// 图标策略：统一使用内联 Loading 图占位，彻底移除本地静态资源依赖

// 禁止使用本地房间配置，统一从后端获取

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
    if (wx.getStorageSync('access_token')) {
      this.getMessageList();
    }
    // 监听登录成功事件，刷新 AI 列表
    try {
      const app = getApp();
      this.__onAuthLogin = () => this.getMessageList();
      app && app.eventBus && app.eventBus.on && app.eventBus.on('auth:login', this.__onAuthLogin);
    } catch (_) {}
  },

  /** 生命周期函数--监听页面初次渲染完成 */
  onReady() {},

  /** 生命周期函数--监听页面显示 */
  onShow() {
    currentUser = null;
    // 刷新消息列表以更新未读状态
    if (wx.getStorageSync('access_token')) {
      this.getMessageList();
    }
    this.updateChatRoomsHistory();
  },

  /** 生命周期函数--监听页面隐藏 */
  onHide() {},

  /** 生命周期函数--监听页面卸载 */
  onUnload() {
    try {
      const app = getApp();
      app && app.eventBus && app.eventBus.off && this.__onAuthLogin && app.eventBus.off('auth:login', this.__onAuthLogin);
    } catch (_) {}
  },

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
          background: (c.background || '').replace(/url\(http:\/\//i, 'url(https://'),
          iconUrl: ensureHttps(c.icon || ''),
        }));
        this.setData({ chatRooms: rooms });
        this.updateChatRoomsHistory();
      })
      .catch((err) => {
        console.error('获取聊天室列表失败:', err);
        this.setData({ chatRooms: [] });
        wx.showToast({ title: '获取聊天室失败', icon: 'none' });
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
    // 对齐后端：从 /api/characters/ 获取列表（需要登录）
    request('/api/characters/')
      .then((res) => {
        const list = (res && res.data && (res.data.characters || res.data)) || [];
        const aiChatHistory = wx.getStorageSync('ai_chat_history') || {};
        const mapped = list.map((c) => {
          const history = aiChatHistory[c.characterId] || [];
          const lastMessage = history.length > 0 ? history[history.length - 1] : null;
          return {
            userId: c.characterId,
            name: c.name,
            // 使用后端提供的头像绝对 URL，强制 https
            avatar: ensureHttps(c.avatar || ''),
            description: c.dimension || '',
            messages: history,
            lastMessage: lastMessage ? lastMessage.content : (c.tags && c.tags.join('、')) || '',
            unreadCount: this.getUnreadCount(history),
          };
        });
        this.setData({ messageList: mapped, loading: false });
      })
      .catch((err) => {
        console.error('获取AI角色列表失败:', err);
        this.setData({ messageList: [], loading: false });
        wx.showToast({ title: '请登录后查看AI助手', icon: 'none' });
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
