# Repository Guidelines

## Project Structure & Module Organization
- Core folders: `pages/` (Mini Program pages), `components/` (reusable UI), `api/` (HTTP/WebSocket), `utils/` (helpers), `custom-tab-bar/` (bottom tabs). Config is in `config.js`.
- No local mock or static assets. All icons/images come from backend absolute HTTPS URLs. Temporary placeholders use the single inline SVG in `utils/placeholders.js` (`DATA_URI_LOADING`).

## Build, Test, and Development Commands
- `npm i` — 安装依赖；在微信开发者工具中打开本项目并“构建 npm”。
- 编辑 `config.js`（仅 HTTPS/WSS）：
  - `baseUrl`: `https://localhost:8000`
  - `aiWebSocketUrl`: `wss://localhost:8000/service/ws`
  - `assetBaseUrl`: `https://localhost:8000`
  - `enforceHttpsAssets: true`
  - `tabIcons`: 明确底部 Tab 图标真实路径（绝对 HTTPS 或以 `/` 开头的相对路径），例如：
    - `home: '/static/ui/icons/tabs/home.svg'`
    - `chat: '/static/ui/icons/tabs/chat.svg'`
    - `user: '/static/ui/icons/tabs/user.svg'`
- 运行与预览：使用微信开发者工具“预览/真机调试”。

## Coding Style & Naming Conventions
- JavaScript + Less; 2-space indent, single quotes, semicolons.
- Always use `api/request.js` for HTTP; add `Authorization: Bearer <token>` automatically via storage.
- Naming: page folders like `pages/<name>/index.{js,json,wxml,less}`; components follow `components/<name>/`.
- Assets: never embed local files; consume backend URLs (e.g., `/static/ui/icons/*.svg`). Keep only `DATA_URI_LOADING` as the universal placeholder.

## Testing Guidelines
- DevTools 验证要点（均走 HTTPS/WSS）：
  - `/home/cards`、`/home/swipers` 图像均为 HTTPS 并可 200 返回。
  - `/api/characters/`、`/api/user/profile` 登录后返回 200。
  - WebSocket 仅连 `wss://<host>/service/ws`。
  - 任何 HTTP 资源均视为错误（不允许）。

## Commit & Pull Request Guidelines
- Conventional Commits: `feat(message): use backend avatars`, `fix(tabbar): load HTTPS icons`, `refactor(api): remove mock`, `docs: update config`.
- PRs include: summary, linked issues, screenshots (home/cards, tabbar), and verification steps.
- Do not reintroduce `mock/**` or local assets; keep only backend-driven resources.

## Backend Setup & Integration
- 后端仓库路径（本地）：`C:\\Users\\TYZS\\PycharmProjects\\wx-mbti-server`。
- 仅允许 HTTPS/WSS：本地必须启用 TLS。
  - 生成证书（Windows，推荐 mkcert）：`mkcert -install && mkcert localhost 127.0.0.1`。
  - 启动（示例）：
    - `uvicorn app.main:app --host 0.0.0.0 --port 8000 --ssl-keyfile .\\localhost+2-key.pem --ssl-certfile .\\localhost+2.pem`
  - 或使用 Nginx/Caddy 反代提供 HTTPS，确保 `/static/...` 与 API 皆可通过 `https://localhost:8000` 访问。
- 前端配置：`config.js` 中 `baseUrl/assetBaseUrl` 使用 `https://...`，`aiWebSocketUrl` 使用 `wss://...`，`enforceHttpsAssets: true`。
- 开发者工具域名：只添加 HTTPS/WSS 域名；HTTP/WS 禁止使用。
