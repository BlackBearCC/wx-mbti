const app = getApp();
const { default: cfg } = require('~/config');
const assetBase = (cfg && (cfg.assetBaseUrl || cfg.baseUrl) || '');
const iconMap = (cfg && cfg.tabIcons) || {};

function fullUrl(p) {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p; // 已是绝对 URL
  return `${assetBase}${p.startsWith('/') ? '' : '/'}${p}`;
}

Component({
  data: {
    value: '', // 初始值设置为空，避免第一次加载时闪烁
    unreadNum: 0, // 未读消息数量
    homeIcon: fullUrl(iconMap.home || '/static/ui/icons/tabs/home.svg'),
    chatIcon: fullUrl(iconMap.chat || '/static/ui/icons/tabs/chat.svg'),
    userIcon: fullUrl(iconMap.user || '/static/ui/icons/tabs/user.svg'),
    list: [
      {
        icon: 'home',
        value: 'index',
        label: '首页',
      },
      {
        icon: 'chat',
        value: 'notice',
        label: '消息',
      },
      {
        icon: 'user',
        value: 'my',
        label: '我的',
      },
    ],
  },
  lifetimes: {
    ready() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (curPage) {
        const nameRe = /pages\/(\w+)\/index/.exec(curPage.route);
        if (nameRe === null) return;
        if (nameRe[1] && nameRe) {
          this.setData({
            value: nameRe[1],
          });
        }
      }

      // 同步全局未读消息数量
      this.setUnreadNum(app.globalData.unreadNum);
      app.eventBus.on('unread-num-change', (unreadNum) => {
        this.setUnreadNum(unreadNum);
      });
    },
  },
  methods: {
    handleChange(e) {
      const { value } = e.detail;
      wx.switchTab({ url: `/pages/${value}/index` });
    },

    /** 设置未读消息数量 */
    setUnreadNum(unreadNum) {
      this.setData({ unreadNum });
    },

  },
});
