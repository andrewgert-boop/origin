# analyzer-portrait-of-talents/analyzer.py
# Минимальная рабочая реализация функции analyze(assignment_id, answers),
# которая на вход получает:
#   - assignment_id: int
#   - answers: List[{"question_id": str, "answer_value": Any}]
# Возвращает список метрик в формате из ТЗ:
#   [{ "parameter_name": str, "raw_score": float|int, "standardized_score": float|int,
#      "interpretation_text": str, "indicator": Optional[str] }...]

from typing import List, Dict, Any
from statistics import mean

def _to_number(v: Any) -> float:
    """Пытаемся интерпретировать ответ как число.
    - int/float -> число
    - [a,b,c] -> среднее, если все элементы числовые
    - {"a":1,"b":2} -> среднее по числовым значениям
    - прочее -> 0
    """
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, list) and v and all(isinstance(x, (int, float)) for x in v):
        return float(mean(v))
    if isinstance(v, dict):
        nums = [float(x) for x in v.values() if isinstance(x, (int, float))]
        return float(mean(nums)) if nums else 0.0
    return 0.0

def analyze(assignment_id: int, answers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Простейшая агрегирующая логика:
    - суммируем/усредняем “баллы” из ответов и
      раскладываем на условные параметры (пример для демо).
    - standardized_score считаем как min(max(raw*10, 0), 100) для наглядности.
    В проде замените на вашу полноценную модель из 5 тестов.
    """
    if not isinstance(answers, list):
        answers = []

    # Глупое разбиение по префиксам вопросов: m1_*, m2_* — просто для демонстрации.
    m1_values, m2_values = [], []
    for item in answers:
        qid = str(item.get("question_id", ""))
        val = _to_number(item.get("answer_value"))
        if qid.startswith("m1_"):
            m1_values.append(val)
        elif qid.startswith("m2_"):
            m2_values.append(val)
        else:
            # если без префикса, учитываем в m1
            m1_values.append(val)

    def std(x: float) -> float:
        return max(0.0, min(100.0, x * 10.0))

    # Простейшие метрики
    creativity_raw = mean(m1_values) if m1_values else 0.0
    leadership_raw = mean(m2_values) if m2_values else 0.0
    total_raw = (creativity_raw + leadership_raw) / 2.0

    results = [
        {
            "parameter_name": "Creativity",
            "raw_score": round(creativity_raw, 4),
            "standardized_score": round(std(creativity_raw), 2),
            "interpretation_text": "Базовая оценка креативности на основе ответов модуля M1.",
            "indicator": "M1"
        },
        {
            "parameter_name": "Leadership",
            "raw_score": round(leadership_raw, 4),
            "standardized_score": round(std(leadership_raw), 2),
            "interpretation_text": "Базовая оценка лидерского потенциала на основе ответов модуля M2.",
            "indicator": "M2"
        },
        {
            "parameter_name": "OverallTalentIndex",
            "raw_score": round(total_raw, 4),
            "standardized_score": round(std(total_raw), 2),
            "interpretation_text": "Итоговый интегральный индекс.",
            "indicator": "TOTAL"
        }
    ]
    return results
