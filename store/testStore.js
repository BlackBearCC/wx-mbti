// store/testStore.js - 全局状态管理
const { generateQuestions, generateAnalysis } = require('../services/doubao');

const app = getApp();

const state = {
  questions: [],
  answers: [],
  currentIndex: 0,
  result: null,
  isLoading: false,
  isSubmitting: false,
  error: null
};

const listeners = [];

// 触发所有监听器
function notify() {
  listeners.forEach(listener => listener(state));
}

// 模拟 Vuex/Pinia 的响应式状态
function createStore() {
  return {
    getState() {
      return { ...state };
    },
    
    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    },
    
    startTest() {
      return new Promise((resolve, reject) => {
        state.isLoading = true;
        state.error = null;
        notify();
        
        generateQuestions(20)
          .then(questionsJson => {
            try {
              const questions = JSON.parse(questionsJson);
              state.questions = questions;
              state.answers = [];
              state.currentIndex = 0;
              state.isLoading = false;
              notify();
              resolve();
            } catch (err) {
              state.isLoading = false;
              state.error = '解析题目失败';
              notify();
              reject(new Error('解析题目失败'));
            }
          })
          .catch(err => {
            state.isLoading = false;
            state.error = err.message || '加载题目失败';
            notify();
            reject(err);
          });
      });
    },
    
    setAnswer(questionId, optionId) {
      const existingIndex = state.answers.findIndex(a => a.questionId === questionId);
      
      if (existingIndex >= 0) {
        state.answers[existingIndex] = { questionId, optionId };
      } else {
        state.answers.push({ questionId, optionId });
      }
      
      // 自动跳到下一题
      if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex = state.currentIndex + 1;
      }
      
      notify();
    },
    
    submitTest() {
      return new Promise((resolve, reject) => {
        if (state.answers.length === 0) {
          reject(new Error('没有答案'));
          return;
        }
        
        state.isSubmitting = true;
        state.error = null;
        notify();
        
        generateAnalysis(state.answers)
          .then(result => {
            state.result = result;
            state.isSubmitting = false;
            state.currentIndex = state.answers.length;
            notify();
            resolve(result);
          })
          .catch(err => {
            state.isSubmitting = false;
            state.error = err.message || '分析失败';
            notify();
            reject(err);
          });
      });
    },
    
    resetTest() {
      state.questions = [];
      state.answers = [];
      state.currentIndex = 0;
      state.result = null;
      state.error = null;
      state.isLoading = false;
      state.isSubmitting = false;
      notify();
    },
    
    // 跳转到测试页面
    navigateToTest() {
      wx.navigateTo({ url: '/pages/test/test' });
    },
    
    // 跳转到结果页面
    navigateToResult() {
      wx.redirectTo({ url: '/pages/result/result' });
    },
    
    // 返回首页
    navigateToHome() {
      wx.redirectTo({ url: '/pages/home/home' });
    }
  };
}

module.exports = {
  createStore
};