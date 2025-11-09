/**
 * AI WebSocket服务器示例（对齐后端 /service/ws 网关协议）
 * 协议：客户端发送 {reqId, op, data}
 * - op: 'ai.chat' | 'ai.stream' | 'ping' | 'room.join' | 'room.leave' | 'room.typing'
 * 服务端响应 JSON 帧，带有 event 字段：
 * - ai.chat: {reqId, op, event: 'result', text, model, usage}
 * - ai.stream: 'start' -> 多个 'chunk' -> 'final' -> 'done'
 */

const WebSocket = require('ws');
const http = require('http');

// 创建HTTP服务器
const server = http.createServer();

// 创建WebSocket服务器（新路径：/service/ws）
const wss = new WebSocket.Server({
  server,
  path: '/service/ws',
});

// 简单的房间/连接注册（演示用）
const ROOMS = new Map(); // roomId -> Set<ws>

wss.on('connection', (ws) => {
  console.log('WS connected');

  ws.on('message', async (raw) => {
    let envelope;
    try {
      envelope = JSON.parse(raw.toString());
    } catch (e) {
      // 无 reqId 的错误帧
      safeSend(ws, { op: 'unknown', event: 'error', detail: 'invalid json' });
      return;
    }

    const reqId = envelope.reqId || null;
    const op = envelope.op || 'unknown';
    const data = envelope.data || {};

    try {
      switch (op) {
        case 'ping': {
          safeSend(ws, { reqId, op, event: 'pong', t: Date.now() });
          break;
        }
        case 'room.join': {
          const roomId = String(data.roomId || 'default');
          const set = ROOMS.get(roomId) || new Set();
          set.add(ws);
          ROOMS.set(roomId, set);
          safeSend(ws, { reqId, op, event: 'result', roomId });
          break;
        }
        case 'room.leave': {
          const roomId = String(data.roomId || 'default');
          const set = ROOMS.get(roomId);
          if (set) {
            set.delete(ws);
            if (set.size === 0) ROOMS.delete(roomId);
          }
          safeSend(ws, { reqId, op, event: 'result', roomId });
          break;
        }
        case 'room.typing': {
          const roomId = String(data.roomId || 'default');
          const userId = data.userId || null;
          broadcast(roomId, { op: 'room.typing', event: 'update', roomId, userId }, ws);
          safeSend(ws, { reqId, op, event: 'ack', roomId });
          break;
        }
        case 'ai.chat': {
          const text = await handleAIChatOnce(data);
          safeSend(ws, { reqId, op, event: 'result', text, model: 'demo-model', usage: { prompt_tokens: 10, completion_tokens: text.length, total_tokens: text.length + 10 } });
          break;
        }
        case 'ai.stream': {
          const full = await buildAIResponseText(data);
          // start
          safeSend(ws, { reqId, op, event: 'start' });
          for await (const chunk of streamChunks(full, 12)) {
            safeSend(ws, { reqId, op, event: 'chunk', text: chunk });
          }
          // final + done
          safeSend(ws, { reqId, op, event: 'final', text: full });
          safeSend(ws, { reqId, op, event: 'done', model: 'demo-model', usage: { completion_tokens: full.length } });
          break;
        }
        default: {
          safeSend(ws, { reqId, op, event: 'error', detail: 'unsupported op' });
        }
      }
    } catch (e) {
      safeSend(ws, { reqId, op, event: 'error', detail: String(e && e.message || e) });
    }
  });

  ws.on('close', () => {
    // 从所有房间移除
    for (const [roomId, set] of ROOMS) {
      if (set.has(ws)) {
        set.delete(ws);
        if (set.size === 0) ROOMS.delete(roomId);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WS error:', err);
  });
});

// --- Helpers ---
function safeSend(ws, payload) {
  try {
    ws.send(JSON.stringify(payload));
  } catch (_) {}
}

function broadcast(roomId, payload, exclude) {
  const set = ROOMS.get(roomId);
  if (!set) return;
  for (const peer of set) {
    if (peer !== exclude) safeSend(peer, payload);
  }
}

async function handleAIChatOnce(data) {
  const text = await buildAIResponseText(data);
  return text;
}

async function buildAIResponseText(data) {
  // 从 messages 中提取最后一条用户消息
  const msgs = Array.isArray(data.messages) ? data.messages : [];
  const lastUser = [...msgs].reverse().find((m) => (m.role || '').toLowerCase() === 'user');
  const userContent = (lastUser && lastUser.content) ? String(lastUser.content) : '';
  // 这里可以接入真实 LLM；演示返回固定模板 + 用户问题片段
  const parts = [
    '我理解你的问题。以下是基于MBTI视角的要点：',
    '1) 明确你的性格偏好  2) 用优势对齐目标  3) 针对短板制定改进计划。',
    userContent ? `你的提问: ${userContent}` : ''
  ];
  return parts.filter(Boolean).join(' ');
}

async function* streamChunks(text, chunkSize = 12) {
  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
    await sleep(80);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 启动服务器
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`AI WebSocket服务器启动，端口: ${PORT}`);
  console.log(`WebSocket地址: ws://localhost:${PORT}/service/ws`);
});

module.exports = { server, wss };
