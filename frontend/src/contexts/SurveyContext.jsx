import React, { createContext, useState, useEffect } from 'react';
import { saveProgress, loadProgress } from '../services/sessionStorage';

export const SurveyContext = createContext();

export const SurveyProvider = ({ children }) => {
  const [answers, setAnswers] = useState(loadProgress());
  const [currentModule, setCurrentModule] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    saveProgress({ answers, currentModule, currentQuestion });
  }, [answers, currentModule, currentQuestion]);

  const saveAnswer = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  return (
    <SurveyContext.Provider value={{
      answers,
      saveAnswer,
      currentModule,
      setCurrentModule,
      currentQuestion,
      setCurrentQuestion
    }}>
      {children}
    </SurveyContext.Provider>
  );
};