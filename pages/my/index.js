import request from '~/api/request';
import useToastBehavior from '~/behaviors/useToast';

Page({
  behaviors: [useToastBehavior],

  data: {
    isLoad: false,
    service: [],
    personalInfo: {},
    avatarIcon: require('~/utils/placeholders').DATA_URI_LOADING,
    editIcon: require('~/utils/placeholders').DATA_URI_LOADING,
    loadingIcon: require('~/utils/placeholders').DATA_URI_LOADING,
    gridList: [
      {
        name: '全部发布',
        icon: 'root-list',
        type: 'all',
        url: '',
      },
      {
        name: '审核中',
        icon: 'search',
        type: 'progress',
        url: '',
      },
      {
        name: '已发布',
        icon: 'upload',
        type: 'published',
        url: '',
      },
      {
        name: '草稿箱',
        icon: 'file-copy',
        type: 'draft',
        url: '',
      },
    ],

    settingList: [
      { name: '联系客服', icon: 'service', type: 'service' },
      { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
    ],
  },

  onLoad() {},

  async onShow() {
    const Token = wx.getStorageSync('access_token');
    // 未登录则直接进入微信登录授权页，不展示“我的”页面
    if (!Token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    const personalInfo = await this.getPersonalInfo();
    this.setData({
      isLoad: true,
      personalInfo,
    });
  },

  // 保险起见，拦截 Tab 点击行为（部分端上更早触发）
  onTabItemTap() {
    if (!wx.getStorageSync('access_token')) {
      wx.navigateTo({ url: '/pages/login/login' });
    }
  },

  getServiceList() {},

  async getPersonalInfo() {
    try {
      const res = await request('/api/user/profile');
      return res && res.data ? res.data : {};
    } catch (e) {
      return {};
    }
  },

  onLogin(e) {
    wx.navigateTo({
      url: '/pages/login/login',
    });
  },

  onNavigateTo() {
    wx.navigateTo({ url: `/pages/my/info-edit/index` });
  },

  onEleClick(e) {
    const { name, url } = e.currentTarget.dataset.data;
    if (url) return;
    this.onShowToast('#t-toast', name);
  },
});
