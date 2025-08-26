const SurveyPage = () => {
    const { currentQuestion, questions } = useSurveyContext();
    
    return (
      <div>
        <Header />
        <Timer />
        <ProgressBar 
          current={currentQuestion + 1} 
          total={questions.length} 
        />
        
        {questions.length > 0 && (
          <QuestionRenderer question={questions[currentQuestion]} />
        )}
        
        <NavigationControls />
      </div>
    );
  };