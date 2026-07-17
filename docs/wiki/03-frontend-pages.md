# 03 · 前端页面详解

本文档逐页解析 `pages/` 下所有页面的职责、生命周期、关键方法、API/WebSocket/eventBus 使用。页面间跨页事实汇总见末尾。

---

## 3.1 `pages/home/index.js` — 首页（TabBar 主入口）

文件：[pages/home/index.js](../../pages/home/index.js)

底部 Tab 首页。展示轮播图 + 卡片入口网格 + 发布入口；支持下拉刷新。

**data：** `enable`(下拉刷新动画)、`swiperList`、`cardInfo`、`focusCardInfo`、模板遗留字段（`motto`/`userInfo`/`hasUserInfo`/`canIUse` 等）。

**生命周期：**
- `onReady()`(async)：并行 `request('/home/cards')` + `request('/home/swipers')`；对 `icon` 强制 HTTPS、对 `background` 中 `url(http://` 替换为 `url(https://`；写入 `cardInfo`/`focusCardInfo`/`swiperList`。
- `onLoad(option)`：检测 `wx.getUserProfile` 能力；按 `option.oper`（`release`→"发布成功"，`save`→"保存成功"）弹 `Message` 提示。

**方法：** `refresh()`(同 onReady 逻辑 + 下拉动画)、`onRefresh()`、`showOperMsg(content)`、`goRelease()`(跳发布页)。

**API：** `GET /home/cards`、`GET /home/swipers`。**组件：** `nav`、`card`、`t-swiper`/`t-tabs`/`t-pull-down-refresh`/`t-message` 等。

> 同目录另有 [pages/home/home.js](../../pages/home/home.js)：MBTI 测试「开始页」，路由 `/pages/home/home`。`onLoad` 订阅 store，`onShow` 调 `resetTest()`，`handleStart()` 调 `store.startTest().then(store.navigateToTest)`。支持分享。

---

## 3.2 `pages/message/index.js` — 消息中心（TabBar）

文件：[pages/message/index.js](../../pages/message/index.js)

整合「聊天室列表」与「AI 角色对话列表」；展示未读、最近消息、最近时间。

**data：** `chatRooms`、`messageList`、`loading`、`swiperCurrent`；模块级 `currentUser`（当前打开的 AI 对话）。

**生命周期：**
- `onLoad(options)`：调 `getChatRooms()`；若已登录调 `getMessageList()`；订阅 `app.eventBus.on('auth:login', getMessageList)`。
- `onShow()`：`currentUser=null`；已登录则 `getMessageList()`；调 `updateChatRoomsHistory()`。
- `onUnload()`：`app.eventBus.off('auth:login', this.__onAuthLogin)`。

**方法：**
- `getChatRooms()`：`GET /home/cards`，映射为 `{roomId,name,description,background(HTTPS),iconUrl}`，再 `updateChatRoomsHistory()`。
- `updateChatRoomsHistory()`：读 `chat_rooms_history` 本地缓存，合并 `lastMessage/lastTime/unreadCount`。
- `getMessageList()`：`GET /api/characters/`，读 `ai_chat_history` 缓存，映射为 `{userId,name,avatar(HTTPS),messages,lastMessage,unreadCount}`。
- `getUnreadCount(messages)`：统计 `from===1 && !read`。
- `enterChatRoom(e)`：跳 `chat-room?roomId=&roomName=`，`updateRoomVisitHistory(roomId)`。
- `toChat(event)`：跳 `chat?userId=&isAI=true&name=&avatar=`，通过 `eventChannel.emit('update', user)` 传 user；调 `setMessagesRead(userId)`。
- `setMessagesRead(userId)`：把该 AI 所有 `from===1` 消息 `read=true`、`unreadCount=0`，回写缓存。

**API：** `GET /home/cards`、`GET /api/characters/`。**eventBus：** `on/off('auth:login')`。

---

## 3.3 `pages/chat/index.js` — 单人 AI 对话页

文件：[pages/chat/index.js](../../pages/chat/index.js)

与单个 AI 角色 1 对 1 流式对话（由 message `toChat` 跳入，URL 带 `userId/isAI/name/avatar`）。

**data：** `bgUrl`/`myAvatar`(默认 `DATA_URI_LOADING`)、`userId`、`avatar`、`name`、`messages`、`input`、`anchor`、`keyboardHeight`、`isTyping`、`conversationId`、`currentAIMessage`。

**生命周期：**
- `onLoad(options)`：取 URL 参数；`conversationId = chatWithAI.startConversation()`；调 `connectAI()` + `addWelcomeMessage()`；`getOpenerEventChannel().on('update', this.update)` 接收 message 页传来的 user。
- `onUnload()`：`chatWithAI.disconnect()` 断开 WS。

**方法：**
- `connectAI()`：`chatWithAI.connect()`，失败 toast。
- `addWelcomeMessage()`：按 `userId`（`ai_mbti_expert`/`ai_career_advisor`/`ai_relationship_coach`/`ai_study_assistant`/`ai_life_coach`）设置欢迎语，push `from:1` 消息，`saveAIHistory()`。
- `update({userId,avatar,name,messages})`：eventChannel 回写，setData 后滚动到底。
- `sendMessage()`：push 用户消息（`from:0`），清空 input，调 `sendAIMessage`。
- `sendAIMessage(message, conversationId)`：插入 `typing_` 占位消息（`isTyping:true`），调 `chatWithAI.sendMessage(message, conversationId, onChunk, onComplete, onError)`。
- `handleAIMessageChunk(chunk, isComplete)`：累加 chunk 到 `currentAIMessage.content`，更新消息，`isTyping=!isComplete`。
- `handleAIMessageComplete(fullContent)`：用最终文本覆盖，`isTyping=false`，`saveAIHistory()`。
- `handleAIError(error)`：移除 typing 占位，push `isError:true` 错误消息。
- `saveAIHistory()`：过滤 `isTyping` 后写 `ai_chat_history[userId]`。
- `scrollToBottom()`：`setData({anchor:'bottom'})`。

**WebSocket：** 是（`chatWithAI.connect/sendMessage/disconnect`）。**组件：** `t-navbar`/`t-avatar`/`t-loading`/`t-button`，`navigationStyle: custom`。

---

## 3.4 `pages/chat-room/index.js` — 聊天室（多 AI 群聊）

文件：[pages/chat-room/index.js](../../pages/chat-room/index.js)

多 AI 角色聊天室，支持 `@角色名` 指定回复，否则随机选 AI。携带房间上下文发送后端。

**data：** `bgUrl`/`myAvatar`/`iconUser`(默认占位)、`roomId`、`roomName`、`aiCharacters`、`messages`、`input`、`anchor`、`keyboardHeight`、`isTyping`、`conversationId`、`currentAIMessage`、`showCharacterList`。

**生命周期：**
- `onLoad(options)`：取 `roomId`；`GET /api/rooms/${roomId}` 取房间详情，从 `roomInfo.characterInfo` 取默认 AI 角色，写 `roomName/aiCharacters/conversationId/bgUrl`；依次 `connectAI()`、`loadChatHistory()`、`addWelcomeMessage()`。失败 toast "聊天室不存在或需登录"。
- `onUnload()`：`chatWithAI.disconnect()`、`saveChatRoomHistory()`。

**方法：**
- `loadChatHistory()`：读 `chat_room_${roomId}` 缓存。
- `addWelcomeMessage()`：messages 为空时插 `isSystem:true` 欢迎消息。
- `toggleCharacterList()`：切换角色列表显隐。
- `selectCharacter(e)`：选角色后在 input 追加 `@角色名 `。
- `sendMessage()`：push 用户消息，`detectTargetAI(content)` 选定目标，`sendAIMessage(content, conversationId, targetAI)`。
- `detectTargetAI(content)`：检查 `@角色名`，否则随机选 `aiCharacters` 中一个。
- `sendAIMessage(message, conversationId, targetAI)`：插入 typing 消息（`fromUser: targetAI`），调 `chatWithAI.sendMessage(..., options={modelAlias:'default', characterName, characterId, roomId})`。
- `handleAIMessageChunk/Complete/Error`：同 chat 页，但 `fromUser` 设为 `targetAI`。
- `saveChatHistory()`：写 `chat_room_${roomId}`。
- `saveChatRoomHistory()`：将最后一条非 typing/非 system 消息写 `chat_rooms_history[roomId]`（含 `visitTime`、`unreadCount:0`）。

**API：** `GET /api/rooms/${roomId}`。**WebSocket：** 是（额外传 `{characterName, characterId, roomId, modelAlias:'default'}`）。

> 注意：`chat-room/` 目录缺失 `index.json`，回退到 app 默认配置。

---

## 3.5 `pages/login/login.js` — 微信授权登录

文件：[pages/login/login.js](../../pages/login/login.js)

用户协议勾选 + 一键微信登录；成功后写 token、发 `auth:login` 事件、跳我的页。

**data：** `isCheck: false`。

**方法：**
- `onCheckChange(e)`：`agree` 时 `isCheck=true`。
- `wechatLogin()`(async)：未勾选 toast 拦截；`wx.login()` 取 `code`；`getUserProfileSafe()` 取用户资料；`POST /api/auth/wxlogin` 带 `{code,nickName,avatarUrl,gender,country,province,city}`；取 `res.data.token` 写 `access_token`；`app.eventBus.emit('auth:login', {token})`；`wx.switchTab('/pages/my/index')`。
- 模块级 `getUserProfileSafe()`：封装 `wx.getUserProfile`，失败回退默认值（`WeChat User` + `DATA_URI_LOADING`）。

**API：** `POST /api/auth/wxlogin`。**eventBus：** `emit('auth:login')`。

---

## 3.6 `pages/loginCode/loginCode.js` — 短信验证码登录

文件：[pages/loginCode/loginCode.js](../../pages/loginCode/loginCode.js)

短信验证码倒计时输入页（URL 携带 `phoneNumber`）。

**data：** `phoneNumber`、`sendCodeCount:60`、`verifyCode`；模块级 `timer`。

**生命周期：** `onLoad(options)` 取 `phoneNumber`，启动 `countDown()`。

**方法：**
- `countDown()`：`sendCodeCount=60`，`setInterval` 每秒 -1，到 0 清除。
- `sendCode()`：`sendCodeCount===0` 时重启倒计时。
- `login()`(async)：`GET /login/postCodeVerify?code=`，`res.success` 则写 `access_token` 并 `wx.switchTab('/pages/my/index')`。

**API：** `GET /login/postCodeVerify`。

---

## 3.7 `pages/my/index.js` — 个人中心（TabBar）

文件：[pages/my/index.js](../../pages/my/index.js)

未登录跳 login；展示用户资料 + 内容管理网格 + 设置入口。

**data：** `isLoad`、`service`、`personalInfo`、`avatarIcon/editIcon/loadingIcon`(占位)、`gridList`(全部发布/审核中/已发布/草稿箱)、`settingList`(联系客服/设置)。

**behaviors：** `useToastBehavior`。

**生命周期：**
- `onShow()`(async)：取 `access_token`，无则跳 login；调 `getPersonalInfo()` 写 `personalInfo`，置 `isLoad:true`。
- `onTabItemTap()`：保险拦截 Tab 点击，未登录跳 login。

**方法：**
- `getPersonalInfo()`(async)：`GET /api/user/profile`，返回 `res.data` 或 `{}`。
- `onLogin(e)`：跳 login。
- `onNavigateTo()`：跳 `info-edit`。
- `onEleClick(e)`：`url` 存在则 return，否则 `onShowToast('#t-toast', name)`。

**API：** `GET /api/user/profile`。**组件：** `nav` + `t-cell`/`t-grid`/`t-image` 等。

---

## 3.8 `pages/my/info-edit/index.js` — 个人信息编辑

文件：[pages/my/info-edit/index.js](../../pages/my/info-edit/index.js)

编辑个人资料（昵称、性别、生日、地区、简介、相册）。

**data：** `personInfo{name,gender,birth,address,introduction,photos}`、`genderOptions`、`birthVisible/birthStart/birthEnd/birthTime`、`addressText/addressVisible/provinces/cities`、`gridConfig`。

**生命周期：** `onLoad()`：`initAreaData()`；已登录则 `getPersonalInfo()`。

**方法：**
- `getPersonalInfo()`：`GET /api/user/profile`，映射为 `personInfo`，按 `address` 拼 `addressText`。
- `initAreaData()`：初始化 `provinces` 与首个省的 `cities`（数据来自本地 `./areaData.js`）。
- `onAreaPick(e)`：列变化时 `column===0` 更新 `cities`。
- `showPicker/hidePicker(e)`：按 `mode`(address/birth) 切换 `*Visible`。
- `onPickerChange(e)`：按 `mode` 写 `personInfo.${mode}`。
- `personInfoFieldChange/onNameChange/onGenderChange/onIntroductionChange`：字段写入。
- `onPhotosRemove/onPhotosSuccess/onPhotosDrop(e)`：相册增删。
- `onSaveInfo()`：空实现（注释掉的 console.log）。

**API：** `GET /api/user/profile`（仅拉取，无保存提交）。

---

## 3.9 `pages/search/index.js` — 搜索页

文件：[pages/search/index.js](../../pages/search/index.js)

搜索关键词、展示历史词与热门词、删除/清空历史词。

**data：** `deleteIcon`(占位)、`historyWords`、`popularWords`、`searchValue`、`dialog`、`dialogShow`；模块级 `deleteType`、`deleteIndex`。

**生命周期：** `onShow()`：`queryHistory()` + `queryPopular()`。

**方法：**
- `queryHistory()`(async)：`GET /api/searchHistory`，`code===200` 写 `historyWords`。
- `queryPopular()`(async)：`GET /api/searchPopular`，`code===200` 写 `popularWords`。
- `setHistoryWords(searchValue)`：本地 unshift（已存在先删后插）。
- `confirm()`：按 `deleteType`（0=删当前，非0=清空）操作。
- `handleClearHistory()` / `deleteCurr(e)`：弹确认窗。
- `handleHistoryTap/handlePopularTap/handleSubmit`：取词调 `setHistoryWords`。
- `actionHandle()`：清空 `searchValue`，`switchTab` 回首页。

**API：** `GET /api/searchHistory`、`GET /api/searchPopular`。

---

## 3.10 `pages/release/index.js` — 发布页

文件：[pages/release/index.js](../../pages/release/index.js)

发布内容（上传图片 + 选择标签）；保存草稿/发布后 `reLaunch` 回首页并带 `oper` 参数。

**data：** `originFiles`、`gridConfig{column:4}`、`config{count:1}`、`tags:['AI绘画','版权素材','原创','风格灵动']`。

**方法：** `handleSuccess(e)`(写 `originFiles`)、`handleRemove(e)`(按 index 删)、`gotoMap()`(占位 toast)、`saveDraft()`(`reLaunch?oper=save`)、`release()`(`reLaunch?oper=release`)。

**API：** 无。**生命周期：** 无。

---

## 3.11 `pages/setting/index.js` — 设置页

文件：[pages/setting/index.js](../../pages/setting/index.js)

纯静态设置列表（3 组菜单：通用/通知；深色/字体/播放；账号安全/隐私）；点击无跳转项弹 toast。

**data：** `menuIcon`(占位)、`menuData`(3 数组，每项 `{title,url:'',icon}`，url 全空)。

**behaviors：** `useToastBehavior`。

**方法：** `onEleClick(e)`：`url` 存在则 return，否则 `onShowToast('#t-toast', title)`。

**API：** 无。

---

## 3.12 `pages/dataCenter/index.js` — 数据中心图表

文件：[pages/dataCenter/index.js](../../pages/dataCenter/index.js)

拉取四块数据（整体情况/互动情况/完播率/区域统计），按数据条数动态计算元素宽度/高度。

**data：** `infoIcon`(占位)、`totalSituationDataList/totalSituationKeyList`、`interactionSituationDataList/interaction_situation_keyList`、`completeRateDataList/complete_rate_keyList`、`areaDataList/areaDataKeysList`、`memberitemWidth/smallitemWidth`。

**生命周期：** `onLoad()`：调 `init()`。

**方法：**
- `init()`：调用 `getMemberData/getInteractionData/getCompleteRateData/getAreaData`（顺序调用未 await）。
- `getMemberData()`：`GET /dataCenter/member`，取 `res.data.template.succ.data.list`，按 `(750-32*(n-1))/n` rpx 算 `memberitemWidth`。
- `getInteractionData()`：`GET /dataCenter/interaction`，算 `smallitemWidth`。
- `getCompleteRateData()`：`GET /dataCenter/complete-rate`。
- `getAreaData()`：`GET /dataCenter/area`。

**API：** `GET /dataCenter/member`、`/dataCenter/interaction`、`/dataCenter/complete-rate`、`/dataCenter/area`。

> 注意：data 中 keys 命名（如 `complete_rate_keyList`）与赋值时（`completeRateKeysList`）不一致，疑似 bug。

---

## 3.13 `pages/test/test.js` — MBTI 答题页

文件：[pages/test/test.js](../../pages/test/test.js)

MBTI 答题页，订阅 store 实时同步进度。

**data：** `questions`、`answers`、`currentIndex`、`isLoading`、`error`、`selectedOptionId`、`progress`、`progressPercent`、`question`。

**生命周期：** `onLoad()`：`store.subscribe` 回写所有字段（含根据 `(currentIndex+1)/questions.length*100` 计算的进度）；无题目且非 loading 则 `store.navigateToHome()`。

**方法：**
- `getSelectedOptionId(state)`：根据 `currentIndex` 找已选答案。
- `handleOptionSelect(e)`：取 `optionId`，`store.setAnswer(question.id, optionId)`；全部答完则 `store.navigateToResult()`。
- `goBack()`：`store.navigateToHome()`。
- `onShareAppMessage/onShareTimeline`：分享 path `/pages/home/home`。

**API：** 无直接调用（通过 store 间接调 `services/doubao`）。

---

## 3.14 `pages/result/result.js` — MBTI 结果页

文件：[pages/result/result.js](../../pages/result/result.js)

MBTI 测试结果展示页，订阅 store 的 `result`，计算 4 维度得分与百分比。

**data：** `result`、`isSubmitting`、`error`、`traits`。

**模块级常量：** `TRAIT_DESCRIPTIONS`（E/I/S/N/T/F/J/P 高低描述）、`calculateDisplayScores(scores)`（I/N/F/P 取负值，与 E/S/T/J 形成对立维度）。

**生命周期：** `onLoad()`：`store.subscribe`，调 `calculateTraits`；若 `answers.length>0 && !result` 则 `store.submitTest()`；若 `answers.length===0 && !isSubmitting` 则 `store.navigateToHome()`。

**方法：**
- `calculateTraits(scores)`：遍历 4 对维度，按 `displayScores` 计算绝对值、百分比 `((abs+5)/10)*100`、颜色（正`#6366f1`紫，负`#10b981`绿）、描述，push 到 `traits`。
- `handleRetry()`：`store.resetTest()` + `store.navigateToHome()`。
- `onShareAppMessage/onShareTimeline`：分享 "我的 MBTI 类型是 ${result?.type} - ${result?.name}"。

---

## 3.15 跨页面事实汇总

### API 接口调用一览（均来自 `api/request.js` → HTTPS :8000）

| 接口路径 | 方法 | 调用页面 |
|----------|------|----------|
| `/home/cards` | GET | home/index、message |
| `/home/swipers` | GET | home/index |
| `/api/characters/` | GET | message |
| `/api/rooms/${roomId}` | GET | chat-room |
| `/api/auth/wxlogin` | POST | login |
| `/login/postCodeVerify` | GET | loginCode |
| `/api/user/profile` | GET | my、my/info-edit |
| `/api/searchHistory` | GET | search |
| `/api/searchPopular` | GET | search |
| `/dataCenter/member` | GET | dataCenter |
| `/dataCenter/interaction` | GET | dataCenter |
| `/dataCenter/complete-rate` | GET | dataCenter |
| `/dataCenter/area` | GET | dataCenter |

> 另有 `services/doubao.js` 直连 `http://localhost:8080/api/ai/doubao`（HTTP），由 store 间接调用。

### WebSocket 使用一览（`api/ai.js` → `wss://localhost:8000/service/ws`）

| 页面 | connect | sendMessage | disconnect |
|------|---------|-------------|------------|
| `pages/chat/index.js` | `onLoad` → `connectAI()` | `sendAIMessage` → `chatWithAI.sendMessage` | `onUnload` → `chatWithAI.disconnect()` |
| `pages/chat-room/index.js` | `onLoad` 房间详情回调 → `connectAI()` | `sendAIMessage` → `chatWithAI.sendMessage`（带 `characterName/characterId/roomId/modelAlias`） | `onUnload` → `chatWithAI.disconnect()` |

### eventBus 使用一览（`app.eventBus`）

| 事件名 | 触发方 | 订阅方 |
|--------|--------|--------|
| `auth:login` | `pages/login/login.js`（`emit({token})`） | `pages/message/index.js`（`on` → 重新拉 AI 列表） |
| `unread-num-change` | `app.js` 的 `setUnreadNum` | `custom-tab-bar/index.js` |

> `pages/chat/index.js` 在 `onUnload` 调 `app.eventBus.off('update', this.update)`，但实际订阅走 `getOpenerEventChannel()` 而非 eventBus，属历史遗留代码，逻辑上无实际效果。

### 本地存储键一览

| 键 | 写入方 | 读取方 |
|----|--------|--------|
| `access_token` | login、loginCode | 几乎所有页面（经 `request.js` 自动读取） |
| `ai_chat_history`（`{[characterId]: messages}`） | chat（`saveAIHistory`）、message（`setMessagesRead`） | message（`getMessageList`） |
| `chat_room_${roomId}` | chat-room（`saveChatHistory`） | chat-room（`loadChatHistory`） |
| `chat_rooms_history`（`{[roomId]: {lastMessage,lastTime,visitTime,unreadCount}}`） | chat-room（`saveChatRoomHistory`）、message（`updateRoomVisitHistory`） | message（`updateChatRoomsHistory`） |

### 注意事项

1. `pages/test/test`、`pages/result/result`、`pages/home/home` 三页路由不符合 `pages/<name>/index` 默认命名，且未在 `app.json` 的 `pages`/`subpackages` 中显式注册。若需启用 MBTI 测试功能，需在 `app.json` 中补齐注册。
2. `pages/chat-room/` 缺失 `index.json`，回退到 app 默认配置。
3. `pages/dataCenter/index.js` 中 keys 命名与赋值不一致（`complete_rate_keyList` vs `completeRateKeysList`），疑似 bug。
