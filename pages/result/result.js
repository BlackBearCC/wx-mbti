// pages/result/result.js
const { createStore } = require('../../store/testStore');

const store = createStore();

// 维度描述映射
const TRAIT_DESCRIPTIONS = {
  E: { high: '外向', low: '内向' },
  I: { high: '内向', low: '外向' },
  S: { high: '感觉型', low: '直觉型' },
  N: { high: '直觉型', low: '感觉型' },
  T: { high: '思考型', low: '情感型' },
  F: { high: '情感型', low: '思考型' },
  J: { high: '判断型', low: '知觉型' },
  P: { high: '知觉型', low: '判断型' }
};

// 计算显示的值（合并对立维度）
function calculateDisplayScores(scores) {
  return {
    E: scores.E,
    S: scores.S,
    T: scores.T,
    J: scores.J,
    I: -scores.I,
    N: -scores.N,
    F: -scores.F,
    P: -scores.P
  };
}

Page({
  data: {
    result: null,
    isSubmitting: false,
    error: null,
    traits: []
  },

  onLoad() {
    // 订阅状态变化
    store.subscribe(() => {
      const state = store.getState();
      const traits = this.calculateTraits(state.result?.scores);
      
      this.setData({
        result: state.result,
        isSubmitting: state.isSubmitting,
        error: state.error,
        traits: traits
      });
    });

    // 如果没有答案，自动触发分析
    const state = store.getState();
    if (state.answers.length > 0 && !state.result) {
      store.submitTest().catch(() => {
        // 静默处理错误
      });
    }

    // 如果没有答案且不在提交中，返回首页
    if (state.answers.length === 0 && !state.isSubmitting) {
      store.navigateToHome();
    }
  },

  calculateTraits(scores) {
    if (!scores) return [];
    
    const displayScores = calculateDisplayScores(scores);
    const traits = [];
    const processedPairs = new Set();
    
    // 定义要显示的维度对
    const traitPairs = [
      ['E', 'I', '外向-内向'],
      ['S', 'N', '感觉-直觉'],
      ['T', 'F', '思考-情感'],
      ['J', 'P', '判断-知觉']
    ];
    
    traitPairs.forEach(([pos, neg, label]) => {
      const value = displayScores[pos] || 0;
      const absValue = Math.abs(value);
      const percent = ((absValue + 5) / 10) * 100;
      const color = value >= 0 ? '#6366f1' : '#10b981';
      
      // 显示正值维度的描述
      const desc = value >= 0 
        ? TRAIT_DESCRIPTIONS[pos].high 
        : TRAIT_DESCRIPTIONS[neg].high;
      
      traits.push({
        trait: pos,
        label: desc,
        value: absValue,
        percent: Math.min(100, Math.max(0, percent)),
        color: color
      });
    });
    
    return traits;
  },

  handleRetry() {
    store.resetTest();
    store.navigateToHome();
  },

  // 分享功能
  onShareAppMessage() {
    const { result } = this.data;
    return {
      title: `我的 MBTI 类型是 ${result?.type || '???'} - ${result?.name || ''}`,
      path: '/pages/home/home'
    };
  },

  onShareTimeline() {
    const { result } = this.data;
    return {
      title: `我的 MBTI 类型是 ${result?.type || '???'} - ${result?.name || ''}`
    };
  }
});
