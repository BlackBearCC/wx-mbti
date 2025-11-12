import Message from 'tdesign-miniprogram/message/index';
import request from '~/api/request';
import config from '~/config';

// 获取应用实例
// const app = getApp()

Page({
  data: {
    enable: false,
    swiperList: [],
    cardInfo: [],
    // 发布
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    canIUseGetUserProfile: false,
    canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName'), // 如需尝试获取用户信息可改为false
  },
  // 生命周期
  async onReady() {
    const { enforceHttpsAssets } = config;
    const ensureHttps = (u) => (enforceHttpsAssets && u ? u.replace(/^http:\/\//i, 'https://') : u);
    const fixBg = (bg) => (enforceHttpsAssets && bg ? bg.replace(/url\(http:\/\//i, 'url(https://') : bg);
    const [cardRes, swiperRes] = await Promise.all([
      request('/home/cards'),
      request('/home/swipers'),
    ]);

    const rawCards = cardRes?.data?.cards || [];
    const rawSwipers = swiperRes?.data?.swipers || [];

    const cards = rawCards.map((c) => ({
      ...c,
      icon: ensureHttps(c.icon),
      background: fixBg(c.background),
    }));
    const swipers = rawSwipers.map((s) => ({
      ...s,
      imageUrl: ensureHttps(s.imageUrl),
    }));

    this.setData({
      cardInfo: cards,
      focusCardInfo: cards.slice(0, 3),
      swiperList: swipers,
    });
  },
  onLoad(option) {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true,
      });
    }
    if (option.oper) {
      let content = '';
      if (option.oper === 'release') {
        content = '发布成功';
      } else if (option.oper === 'save') {
        content = '保存成功';
      }
      this.showOperMsg(content);
    }
  },
  onRefresh() {
    this.refresh();
  },
  async refresh() {
    const { enforceHttpsAssets } = config;
    const ensureHttps = (u) => (enforceHttpsAssets && u ? u.replace(/^http:\/\//i, 'https://') : u);
    const fixBg = (bg) => (enforceHttpsAssets && bg ? bg.replace(/url\(http:\/\//i, 'url(https://') : bg);
    this.setData({
      enable: true,
    });
    const [cardRes, swiperRes] = await Promise.all([
      request('/home/cards'),
      request('/home/swipers'),
    ]);

    const rawCards = cardRes?.data?.cards || [];
    const rawSwipers = swiperRes?.data?.swipers || [];
    const cards = rawCards.map((c) => ({ ...c, icon: ensureHttps(c.icon), background: fixBg(c.background) }));
    const swipers = rawSwipers.map((s) => ({ ...s, imageUrl: ensureHttps(s.imageUrl) }));

    setTimeout(() => {
      this.setData({
        enable: false,
        cardInfo: cards,
        swiperList: swipers,
      });
    }, 1500);
  },
  showOperMsg(content) {
    Message.success({
      context: this,
      offset: [120, 32],
      duration: 4000,
      content,
    });
  },
  goRelease() {
    wx.navigateTo({
      url: '/pages/release/index',
    });
  },
});
