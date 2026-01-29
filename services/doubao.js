// services/doubao.js - 调用后端 API 服务
const API_BASE = 'http://localhost:8080';

/**
 * 调用豆包 API 代理接口
 * @param {Array} messages - 消息数组 [{role: 'user'|'assistant'|'system', content: string}]
 * @param {string} model - 模型名称
 * @returns {Promise<string>} - API 返回的内容
 */
function callDoubaoProxy(messages, model = 'doubao-seed-1.8-high') {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}/api/ai/doubao`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        messages,
        model,
        max_tokens: 2000,
        temperature: 0.7
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success) {
          const content = res.data.data?.choices?.[0]?.message?.content;
          if (content) {
            resolve(content);
          } else {
            reject(new Error('未能获取回答'));
          }
        } else {
          const errorMsg = res.data?.error || 'API 调用失败';
          console.error('Doubao API Error:', errorMsg);
          reject(new Error(errorMsg));
        }
      },
      fail: (err) => {
        console.error('Network Error:', err);
        reject(new Error('网络请求失败: ' + (err.errMsg || '未知错误')));
      }
    });
  });
}

/**
 * 生成 MBTI 测试题目
 * @param {number} count - 题目数量
 * @returns {Promise<string>} - JSON 字符串
 */
function generateQuestions(count = 20) {
  const systemPrompt = `你是一个专业的MBTI性格测试题库生成器。请生成${count}道高质量的MBTI性格测试题。
  
要求：
1. 每道题包含2个选项，分别代表两种相反的性格倾向
2. 题目应该涵盖E/I, S/N, T/F, J/P四个维度的各种情境
3. 题目描述要清晰易懂，适合中文用户
4. 以JSON数组格式输出，每道题包含id, text, 两个options（每个option包含id和scores对象）

返回格式示例：
[
  {
    "id": 1,
    "text": "在社交场合中，你通常会：",
    "options": [
      {
        "id": "A",
        "text": "主动与陌生人交谈，享受社交互动",
        "scores": {"E":1,"I":0,"S":0,"N":0,"T":0,"F":0,"J":0,"P":0}
      },
      {
        "id": "B",
        "text": "更喜欢在小范围内交流，需要时间适应新环境",
        "scores": {"E":0,"I":1,"S":0,"N":0,"T":0,"F":0,"J":0,"P":0}
      }
    ]
  }
]`;

  return callDoubaoProxy([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请生成${count}道MBTI性格测试题，题目要多样且能准确区分性格类型。` }
  ]).then(response => {
    try {
      // 提取 JSON 数组
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return jsonMatch[0];
      }
      throw new Error('无法解析题目JSON');
    } catch (error) {
      console.error('解析题目失败:', error);
      throw error;
    }
  });
}

/**
 * 根据用户答案生成 MBTI 分析结果
 * @param {Array} answers - 答案数组 [{questionId: number, optionId: string}]
 * @returns {Promise<Object>} - {type, name, description}
 */
function generateAnalysis(answers) {
  const systemPrompt = `你是一个专业的MBTI性格分析专家。请根据用户的答案生成详细的性格分析报告。

要求：
1. 根据16种MBTI类型中的一种给出精准分析
2. 输出JSON格式，包含type（4字母类型如INTJ），name（类型名称如"建筑师"），description（详细描述300字左右）
3. 描述要温暖、专业、有帮助

16种MBTI类型：
- INTJ - 建筑师
- INFP - 调停者
- ENTJ - 指挥官
- ENFP - 竞选者
- ISTJ - 物流师
- ISFJ - 守护者
- ESTJ - 总经理
- ESFJ - 执政官
- ISTP - 鉴赏家
- ISFP - 探险家
- ESTP - 企业家
- ESFP - 表演者
- INFJ - 提倡者
- ENFJ - 主人公
- INTP - 逻辑学家
- ENTP - 辩论家

返回格式：
{"type": "INTJ", "name": "建筑师", "description": "详细描述..."}`;

  return callDoubaoProxy([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `我的MBTI测试答案：${JSON.stringify(answers)}。请分析我的性格类型并给出详细报告。` }
  ]).then(response => {
    try {
      // 提取 JSON 对象
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('无法解析分析结果JSON');
    } catch (error) {
      console.error('解析分析结果失败:', error);
      throw error;
    }
  });
}

module.exports = {
  generateQuestions,
  generateAnalysis,
  callDoubaoProxy
};