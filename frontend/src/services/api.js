import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export default {
  getQuestions: async (module) => {
    return axios.get(`${API_BASE_URL}/surveys/talent-portrait/questions/${module}`);
  },
  
  saveAnswer: async (sessionToken, module, questionCode, answer) => {
    return axios.post(`${API_BASE_URL}/surveys/talent-portrait/sessions/${sessionToken}/answers`, [
      {
        module,
        question_code: questionCode,
        answer
      }
    ]);
  },
  
  completeModule: async (sessionToken, module) => {
    return axios.post(
      `${API_BASE_URL}/surveys/talent-portrait/sessions/${sessionToken}/complete-module/${module}`
    );
  }
};