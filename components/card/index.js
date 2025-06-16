Component({
  properties: {
    // 图标（可以是 Emoji 或图片 URL）
    icon: String,
    // 标题
    title: String,
    // 描述
    description: String,
    // 背景渐变
    background: String,
    // 跳转聊天室 ID
    roomId: String,
    // 外部链接
    targetUrl: String,
  },
  data: {},
  methods: {
    /** 点击卡片跳转 */
    handleTap() {
      const { roomId, targetUrl } = this.properties;
      if (roomId) {
        wx.navigateTo({
          url: `/pages/chat-room/index?roomId=${roomId}`,
        });
      } else if (targetUrl) {
        wx.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(targetUrl)}` });
      }
    },
  },
});
