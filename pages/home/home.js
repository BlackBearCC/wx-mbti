// pages/home/home.js
const { createStore } = require('../../store/testStore');

const store = createStore();

Page({
  data: {
    isLoading: false,
    error: null
  },

  onLoad() {
    // 订阅状态变化
    store.subscribe(() => {
      const state = store.getState();
      this.setData({
        isLoading: state.isLoading,
        error: state.error
      });
    });
  },

  onShow() {
    // 页面显示时重置状态
    store.resetTest();
  },

  handleStart() {
    this.setData({ error: null });
    
    store.startTest()
      .then(() => {
        store.navigateToTest();
      })
      .catch(err => {
        this.setData({
          error: err.message || '启动测试失败'
        });
      });
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: 'MBTI 性格测试 - 基于 Doubao AI 的智能分析',
      path: '/pages/home/home'
    };
  },

  onShareTimeline() {
    return {
      title: 'MBTI 性格测试 - 基于 Doubao AI 的智能分析'
    };
  }
});
