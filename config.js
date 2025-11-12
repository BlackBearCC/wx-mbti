export default {
  // 后端 API 根地址（仅允许 HTTPS，本地需启用 TLS）
  baseUrl: 'https://localhost:8000',
  // AI 大模型 WebSocket 服务地址（仅允许 WSS）
  aiWebSocketUrl: 'wss://localhost:8000/service/ws',
  // 资源（图片/SVG）基地址（仅 HTTPS）
  assetBaseUrl: 'https://localhost:8000',
  // 强制把任何 http 资产 URL 转为 https（保持开启）
  enforceHttpsAssets: true,
  // Tab 图标路径（可配绝对 HTTPS URL，或以 / 开头的相对路径），用于对齐后端真实文件名
  tabIcons: {
    home: '/static/ui/icons/tabs/home.svg',
    chat: '/static/ui/icons/tabs/chat.svg',
    user: '/static/ui/icons/tabs/user.svg',
  },
};
