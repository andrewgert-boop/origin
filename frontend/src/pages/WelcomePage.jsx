const WelcomePage = () => {
    const { loadQuestions } = useSurveyContext();
    
    const handleStart = () => {
      loadQuestions(1);
      // Установка таймера на 45 минут
      setTimeLeft(45 * 60);
    };
  
    return (
      <div>
        <Header />
        <h1>Добро пожаловать на исследование "Портрет талантов"!</h1>
        <p>Тест состоит из двух модулей...</p>
        <button onClick={handleStart}>Приступить к исследованию</button>
      </div>
    );
  };