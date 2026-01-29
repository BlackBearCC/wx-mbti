// pages/test/test.js
const { createStore } = require('../../store/testStore');

const store = createStore();

Page({
  data: {
    questions: [],
    answers: [],
    currentIndex: 0,
    isLoading: false,
    error: null,
    selectedOptionId: null,
    progress: 0,
    progressPercent: 0,
    question: null
  },

  onLoad() {
    // 订阅状态变化
    store.subscribe(() => {
      const state = store.getState();
      const progress = state.questions.length > 0 
        ? ((state.currentIndex + 1) / state.questions.length) * 100 
        : 0;
      
      this.setData({
        questions: state.questions,
        answers: state.answers,
        currentIndex: state.currentIndex,
        isLoading: state.isLoading,
        error: state.error,
        progress: progress,
        progressPercent: Math.round(progress),
        question: state.questions[state.currentIndex] || null,
        selectedOptionId: this.getSelectedOptionId(state)
      });
    });

    // 检查是否有题目
    const state = store.getState();
    if (state.questions.length === 0 && !state.isLoading) {
      store.navigateToHome();
    }
  },

  getSelectedOptionId(state) {
    const question = state.questions[state.currentIndex];
    if (!question) return null;
    const answer = state.answers.find(a => a.questionId === question.id);
    return answer ? answer.optionId : null;
  },

  handleOptionSelect(e) {
    const { optionId } = e.currentTarget.dataset;
    const { question } = this.data;
    
    if (question) {
      store.setAnswer(question.id, optionId);
      
      // 检查是否所有题目都回答完毕
      const state = store.getState();
      if (state.answers.length === state.questions.length) {
        store.navigateToResult();
      }
    }
  },

  goBack() {
    store.navigateToHome();
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: 'MBTI 性格测试 - 基于 Doubao AI 的智能分析',
      path: '/pages/home/home'
    };
  },

  onShareTimeline() {
    return {
      title: 'MBTI 性格测试 - 基于 Doubao AI 的智能分析'
    };
  }
});
