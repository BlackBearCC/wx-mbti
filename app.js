// app.js
import config from './config.js';
import createBus from './utils/eventBus';

// 禁止使用本地 Mock 资源

App({
  onLaunch() {
    const updateManager = wx.getUpdateManager();

    updateManager.onCheckForUpdate((res) => {
      // console.log(res.hasUpdate)
    });

    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate();
          }
        },
      });
    });

    // 与后端对齐：默认不从本地 mock 拉取未读数或建立本地 socket
  },
  globalData: {
    userInfo: null,
    unreadNum: 0, // 未读消息数量，由真实后端事件/接口更新
    socket: null, // SocketTask 对象（如对接真实后端再启用）
  },

  /** 全局事件总线 */
  eventBus: createBus(),

  // 预留钩子：如需与后端对接未读数/通知，在此处实现
  connect() {},
  getUnreadNum() {},

  /** 设置未读消息数量 */
  setUnreadNum(unreadNum) {
    this.globalData.unreadNum = unreadNum;
    this.eventBus.emit('unread-num-change', unreadNum);
  },
});
