# Repository Guidelines

## Project Structure & Module Organization
- Source lives at project root; key folders: `pages/` (UI pages), `components/` (custom UI), `api/` (request wrappers, AI APIs), `utils/` (helpers), `config/` + `config.js` (runtime config), `mock/` (mock data), `static/` (assets), `server-example/` (AI WebSocket sample).
- Each page keeps `index.{js,json,wxml,less}`; update state via `setData`.
- Global app files: `app.js/json/less`; npm components under `miniprogram_npm/`.

## Build, Test, and Development Commands
- `npm install` — install deps; then open the folder in WeChat Developer Tools and Build npm.
- `npm run lint` — ESLint + Prettier check.
- `npm run lint:fix` — auto‑fix ESLint/Prettier issues.
- Example AI server: `cd server-example && node ai-websocket-server.js` (configure `config.js`).

## Coding Style & Naming Conventions
- JavaScript (ES modules) + Less; 2‑space indent, single quotes, semicolons.
- Keep small functions; prefer `async/await`; use `api/request.js` for HTTP.
- Page/component dirs may be kebab or camel (e.g., `chat-room/`, `dataCenter/`); follow nearby pattern; files use `index.*`.

## Testing Guidelines
- No automated tests yet. Validate locally in WeChat DevTools (iOS/Android simulators as needed).
- For backend‑free checks set `config.js` → `isMock: true`; include manual test steps in PRs.

## Commit & Pull Request Guidelines
- Conventional Commits; examples: `feat(chat): 新增聊天室功能`, `refactor(chat-room): 优化角色描述`, `docs(README): 更新文档`.
- PRs must include: summary, linked issues, screenshots/GIFs for UI, test steps, and any config changes (`config.js`, domain whitelists).
- Ensure `npm run lint` passes and pages build in DevTools before requesting review.

## Security & Configuration Tips
- Do not commit secrets or private AppIDs; keep credentials out of the repo.
- Update `project.config.json` `appid` locally; set HTTPS/WebSocket domains in the WeChat console.
- Runtime endpoints: edit `config.js` (`baseUrl`, `aiWebSocketUrl`, `isMock`).
