import request from '~/api/request';
import { DATA_URI_LOADING } from '~/utils/placeholders';

function getUserProfileSafe() {
  return new Promise((resolve) => {
    if (wx.getUserProfile) {
      wx.getUserProfile({ desc: '用于完善会员资料' })
        .then((res) => {
          const userInfo = res.userInfo || {};
          resolve({
            nickName: userInfo.nickName || 'WeChat User',
            avatarUrl: userInfo.avatarUrl || DATA_URI_LOADING,
            gender: userInfo.gender || 0,
            country: userInfo.country || '',
            province: userInfo.province || '',
            city: userInfo.city || '',
          });
        })
        .catch(() => resolve({
          nickName: 'WeChat User',
          avatarUrl: DATA_URI_LOADING,
          gender: 0, country: '', province: '', city: ''
        }));
    } else {
      resolve({
        nickName: 'WeChat User',
        avatarUrl: DATA_URI_LOADING,
        gender: 0, country: '', province: '', city: ''
      });
    }
  });
}

Page({
  data: {
    isCheck: false,
  },

  // 用户协议选择变更
  onCheckChange(e) {
    const { value } = e.detail;
    this.setData({ isCheck: value === 'agree' });
  },

  async wechatLogin() {
    if (!this.data.isCheck) {
      wx.showToast({ title: '请先同意协议条款', icon: 'none' });
      return;
    }
    try {
      const loginRes = await wx.login();
      const code = loginRes.code;
      if (!code) throw new Error('未获取到登录 code');
      const profile = await getUserProfileSafe();
      const payload = { code, ...profile };
      const res = await request('/api/auth/wxlogin', 'POST', payload);
      const token = res && res.data && res.data.token;
      if (!token) throw new Error('登录失败');
      await wx.setStorageSync('access_token', token);
      try {
        const app = getApp();
        app && app.eventBus && app.eventBus.emit && app.eventBus.emit('auth:login', { token });
      } catch (_) {}
      wx.switchTab({ url: '/pages/my/index' });
    } catch (e) {
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      console.error('微信登录失败:', e);
    }
  },
});
