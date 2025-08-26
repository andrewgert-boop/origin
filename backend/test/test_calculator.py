# tests/test_calculator.py
import pytest
from surveys.talent_portrait.calculator import TalentPortraitCalculator

def test_business_archetypes_calculation():
    """Тест корректности расчета бизнес-архетипов"""
    answers = {
        "1_P1": 4, "1_P2": 3, "1_P3": 4, "1_P4": 3,
        "1_P5": 4, "1_P6": 3, "1_P7": 4, "1_P8": 3,
        "1_P9": 4, "1_P10": 3, "1_P11": 4, "1_P12": 3,
        
        "1_A1": 2, "1_A2": 1, "1_A3": 2, "1_A4": 1,
        "1_A5": 2, "1_A6": 1, "1_A7": 2, "1_A8": 1,
        "1_A9": 2, "1_A10": 1, "1_A11": 2, "1_A12": 1,
    }
    
    calculator = TalentPortraitCalculator(answers)
    results = calculator.calculate_business_archetypes()
    
    assert results["P"]["score"] == 42
    assert 85 < results["P"]["percentage"] < 95
    assert results["P"]["level"] == "высокий"
    
    assert results["A"]["score"] == 18
    assert 30 < results["A"]["percentage"] < 40
    assert results["A"]["level"] == "низкий"

def test_emotional_intelligence_calculation():
    """Тест расчета эмоционального интеллекта"""
    answers = {}
    # Добавляем ответы для всех вопросов EQ
    for q in range(13, 43):
        answers[f"1_Q{q}"] = 4  # Среднее значение
    
    calculator = TalentPortraitCalculator(answers)
    results = calculator.calculate_emotional_intelligence()
    
    assert "awareness" in results
    assert "overall" in results
    assert results["overall"]["score"] > 100
    assert results["overall"]["level"] == "высокий"

# Дополнительные тесты для других модулей...