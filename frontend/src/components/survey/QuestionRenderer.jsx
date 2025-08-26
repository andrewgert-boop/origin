const QuestionRenderer = ({ question }) => {
    const { saveAnswer } = useSurveyContext();
  
    switch(question.type) {
      case 'distribution':
        return <DistributionQuestion question={question} onSubmit={saveAnswer} />;
      case 'likert':
        return <LikertScaleQuestion question={question} onSubmit={saveAnswer} />;
      case 'allocation':
        return <AllocationQuestion question={question} onSubmit={saveAnswer} />;
      case 'paired_comparison':
        return <PairedComparisonQuestion question={question} onSubmit={saveAnswer} />;
      case 'single_choice':
      case 'multiple_choice':
      case 'text':
      case 'true_false':
        return <IQQuestion question={question} onSubmit={saveAnswer} />;
      default:
        return <p>Unsupported question type</p>;
    }
  };