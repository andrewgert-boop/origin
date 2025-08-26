const DistributionQuestion = ({ question, onSubmit }) => {
    const [values, setValues] = useState({});
    const [availableOptions, setAvailableOptions] = useState([1,2,3,4]);
  
    const handleChange = (option, value) => {
      const newValues = {...values, [option]: Number(value)};
      setValues(newValues);
      
      // Проверка уникальности значений
      const usedValues = Object.values(newValues);
      setAvailableOptions([1,2,3,4].filter(v => !usedValues.includes(v)));
      
      // Автоматическое подтверждение при заполнении всех
      if (Object.keys(newValues).length === 4) {
        onSubmit(question.code, newValues);
      }
    };
  
    return (
      <div>
        <h3>{question.text}</h3>
        <p>{question.instruction}</p>
        {question.options.map((option, idx) => (
          <div key={idx}>
            <label>{option}</label>
            <select 
              value={values[option] || ''}
              onChange={(e) => handleChange(option, e.target.value)}
              disabled={!values[option] && availableOptions.length === 0}
            >
              <option value="">Select</option>
              {availableOptions.map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  };