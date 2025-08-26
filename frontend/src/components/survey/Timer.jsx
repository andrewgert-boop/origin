const Timer = () => {
    const { timeLeft } = useSurveyContext();
    
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };
  
    return (
      <div className="timer">
        <span>Осталось времени: {formatTime(timeLeft)}</span>
      </div>
    );
  };