import React from 'react';

const LikertScaleQuestion = ({ question, onAnswer }) => {
  const options = [
    { value: -3, label: 'Полностью не согласен' },
    { value: -2, label: 'В основном не согласен' },
    { value: -1, label: 'Отчасти не согласен' },
    { value: 1, label: 'Отчасти согласен' },
    { value: 2, label: 'В основном согласен' },
    { value: 3, label: 'Полностью согласен' }
  ];

  return (
    <div className="question">
      <h3>{question.text}</h3>
      <div className="options">
        {options.map(option => (
          <label key={option.value}>
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option.value}
              onChange={() => onAnswer(question.id, option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
};

export default LikertScaleQuestion;