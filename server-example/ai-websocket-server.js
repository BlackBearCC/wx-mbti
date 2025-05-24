/**
 * AI WebSocket服务器示例
 * 这是一个简单的示例，展示如何实现支持流式响应的AI聊天服务
 * 实际使用时，请替换为您的大模型API调用
 */

const WebSocket = require('ws');
const http = require('http');

// 创建HTTP服务器
const server = http.createServer();

// 创建WebSocket服务器
const wss = new WebSocket.Server({ 
  server,
  path: '/ws/ai' 
});

// 模拟AI角色配置
const AI_CHARACTERS = {
  'ai_mbti_expert': {
    name: 'MBTI专家',
    personality: '专业、耐心、善于分析',
    expertise: 'MBTI性格分析、心理测试'
  },
  'ai_career_advisor': {
    name: '职业规划师',
    personality: '专业、务实、目标导向',
    expertise: '职业规划、技能发展'
  },
  'ai_relationship_coach': {
    name: '情感导师',
    personality: '温暖、理解、善于倾听',
    expertise: '人际关系、情感沟通'
  },
  'ai_study_assistant': {
    name: '学习助手',
    personality: '耐心、系统、鼓励式',
    expertise: '学习方法、知识总结'
  },
  'ai_life_coach': {
    name: '生活顾问',
    personality: '积极、平衡、实用',
    expertise: '生活规划、习惯养成'
  }
};

// 存储活跃的连接
const connections = new Map();

wss.on('connection', (ws, request) => {
  console.log('新的WebSocket连接建立');
  
  const connectionId = generateId();
  connections.set(connectionId, ws);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('收到消息:', message);

      switch (message.type) {
        case 'chat':
          await handleChatMessage(ws, message);
          break;
        case 'mbti_test':
          await handleMBTITest(ws, message);
          break;
        case 'behavior_analysis':
          await handleBehaviorAnalysis(ws, message);
          break;
        default:
          console.log('未知消息类型:', message.type);
      }
    } catch (error) {
      console.error('处理消息错误:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: '消息处理失败'
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket连接关闭');
    connections.delete(connectionId);
  });

  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
    connections.delete(connectionId);
  });
});

/**
 * 处理聊天消息
 */
async function handleChatMessage(ws, message) {
  const { message: userMessage, conversationId } = message;
  
  // 模拟AI思考时间
  await sleep(500);
  
  // 这里应该调用实际的大模型API
  // 以下是模拟的流式响应
  const aiResponse = await generateAIResponse(userMessage);
  
  // 模拟流式发送
  await sendStreamingResponse(ws, aiResponse, conversationId);
}

/**
 * 处理MBTI测试
 */
async function handleMBTITest(ws, message) {
  const { action, testId, questionIndex, answer } = message;
  
  if (action === 'start') {
    // 开始测试，发送第一个问题
    const question = getMBTIQuestion(0);
    ws.send(JSON.stringify({
      type: 'question',
      testId,
      question: question.text,
      options: question.options,
      questionIndex: 0,
      totalQuestions: 10
    }));
  } else if (action === 'answer') {
    // 处理答案并发送下一个问题或结果
    if (questionIndex < 9) {
      const question = getMBTIQuestion(questionIndex + 1);
      ws.send(JSON.stringify({
        type: 'question',
        testId,
        question: question.text,
        options: question.options,
        questionIndex: questionIndex + 1,
        totalQuestions: 10
      }));
    } else {
      // 测试完成，返回结果
      const result = generateMBTIResult();
      ws.send(JSON.stringify({
        type: 'test_complete',
        testId,
        result
      }));
    }
  }
}

/**
 * 处理行为分析
 */
async function handleBehaviorAnalysis(ws, message) {
  const { analysisId, behaviorData } = message;
  
  // 模拟分析时间
  await sleep(1000);
  
  const result = {
    mbtiType: 'ENFP',
    confidence: 0.85,
    analysis: '根据您的行为模式分析，您倾向于外向、直觉、情感和知觉型人格...',
    suggestions: [
      '发挥您的创造力优势',
      '注意时间管理',
      '保持灵活性'
    ]
  };
  
  ws.send(JSON.stringify({
    type: 'analysis_result',
    analysisId,
    result
  }));
}

/**
 * 生成AI响应 (这里应该调用实际的大模型API)
 */
async function generateAIResponse(userMessage) {
  // 这是一个简单的模拟，实际使用时请替换为真实的AI API调用
  const responses = [
    "我理解您的问题。让我为您详细分析一下...",
    "基于MBTI理论，我们可以从以下几个方面来看待这个问题：",
    "首先，每个人都有独特的性格特征和优势。",
    "根据您提到的情况，我建议您可以考虑以下几点：",
    "1. 了解自己的性格偏好\n2. 发挥个人优势\n3. 改善弱项",
    "希望这些建议对您有帮助。如果您还有其他问题，随时可以问我！"
  ];
  
  return responses.join(' ');
}

/**
 * 模拟流式发送响应
 */
async function sendStreamingResponse(ws, fullResponse, conversationId) {
  const chunks = splitIntoChunks(fullResponse, 10); // 每次发送10个字符
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const isComplete = i === chunks.length - 1;
    
    ws.send(JSON.stringify({
      type: 'message_chunk',
      conversationId,
      content: chunk,
      isComplete
    }));
    
    // 模拟打字速度
    await sleep(100);
  }
  
  // 发送完成信号
  ws.send(JSON.stringify({
    type: 'message_complete',
    conversationId,
    fullContent: fullResponse
  }));
}

/**
 * 获取MBTI测试问题
 */
function getMBTIQuestion(index) {
  const questions = [
    {
      text: "在聚会中，您更倾向于：",
      options: ["A. 主动与很多人交谈", "B. 与少数几个人深入交流"]
    },
    {
      text: "在做决定时，您更重视：",
      options: ["A. 逻辑分析", "B. 个人价值观和感受"]
    },
    // ... 更多问题
  ];
  
  return questions[index % questions.length];
}

/**
 * 生成MBTI结果
 */
function generateMBTIResult() {
  return {
    type: 'ENFP',
    name: '活动家',
    description: '热情、创造性、积极向上的人，能够在几乎任何感兴趣的事情上取得成功。',
    strengths: ['创造力', '热情', '灵活性'],
    weaknesses: ['注意力分散', '压力敏感'],
    careers: ['教师', '心理咨询师', '艺术家'],
    relationships: '善于建立和谐的人际关系，但需要学会坚持自己的原则。'
  };
}

/**
 * 工具函数
 */
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function splitIntoChunks(text, chunkSize) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

// 启动服务器
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`AI WebSocket服务器启动，端口: ${PORT}`);
  console.log(`WebSocket地址: ws://localhost:${PORT}/ws/ai`);
});

module.exports = { server, wss }; 