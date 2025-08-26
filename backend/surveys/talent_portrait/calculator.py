import math
from .schemas import TestResult

class TalentPortraitCalculator:
    def __init__(self, answers: dict):
        self.answers = answers
    
    def calculate_full_results(self) -> dict:
        return {
            "business_archetypes": self.calculate_business_archetypes(),
            "emotional_intelligence": self.calculate_emotional_intelligence(),
            "team_roles": self.calculate_team_roles(),
            "motivation": self.calculate_motivation(),
            "iq": self.calculate_iq()
        }
    
    def calculate_business_archetypes(self) -> dict:
        """Расчет результатов для первого теста (бизнес-архетипы)"""
        p_score = self._sum_scores("P", 1, 12)
        a_score = self._sum_scores("A", 1, 12)
        e_score = self._sum_scores("E", 1, 12)
        i_score = self._sum_scores("I", 1, 12)
        
        percent_map = self._create_percent_map()
        
        return {
            "P": self._create_test_result(p_score, percent_map.get(p_score, 0), self._get_archetype_level(p_score)),
            "A": self._create_test_result(a_score, percent_map.get(a_score, 0), self._get_archetype_level(a_score)),
            "E": self._create_test_result(e_score, percent_map.get(e_score, 0), self._get_archetype_level(e_score)),
            "I": self._create_test_result(i_score, percent_map.get(i_score, 0), self._get_archetype_level(i_score))
        }
    
    def _sum_scores(self, prefix: str, start: int, end: int) -> int:
        total = 0
        for i in range(start, end + 1):
            key = f"1_{prefix}{i}"
            total += self.answers.get(key, 0)
        return total
    
    def _create_percent_map(self) -> dict:
        percent_map = {}
        for score in range(0, 25):
            percent_map[score] = score * 100 / 48
        
        custom_percents = {
            25: 40.0, 26: 46.7, 27: 53.3, 28: 60.0, 29: 66.7,
            30: 68.41, 31: 70.17, 32: 71.92, 33: 73.68, 34: 75.43,
            35: 77.19, 36: 78.94, 37: 80.69, 38: 82.45, 39: 84.20,
            40: 85.96, 41: 87.71, 42: 89.46, 43: 91.22, 44: 92.97,
            45: 94.73, 46: 96.48, 47: 98.24, 48: 100.0
        }
        percent_map.update(custom_percents)
        return percent_map
    
    def _get_archetype_level(self, score: int) -> str:
        if score <= 19:
            return "низкий"
        elif score <= 24:
            return "потенциал"
        elif score <= 29:
            return "средний"
        else:
            return "высокий"
    
    def calculate_emotional_intelligence(self) -> dict:
        """Расчет эмоционального интеллекта"""
        scales = {
            "awareness": [13, 14, 16, 19, 25, 32],
            "management": [15, 18, 21, 24, 30, 33],
            "self_motivation": [17, 20, 22, 26, 28, 35],
            "empathy": [23, 27, 29, 31, 34, 36],
            "managing_others": [37, 38, 39, 40, 41, 42]
        }
        
        results = {}
        for scale, questions in scales.items():
            score = sum(self.answers.get(f"1_Q{q}", 0) for q in questions)
            percentage = min(100, score * 100 / 18)
            level = self._get_ei_level(score)
            results[scale] = self._create_test_result(score, percentage, level)
        
        # Общий уровень EQ
        total_score = sum(results[scale]["score"] for scale in results)
        total_percentage = min(100, total_score * 100 / 90)
        total_level = self._get_overall_eq_level(total_score)
        results["overall"] = self._create_test_result(total_score, total_percentage, total_level)
        
        return results
    
    def _get_ei_level(self, score: int) -> str:
        if score <= 7:
            return "низкий"
        elif score <= 13:
            return "средний"
        else:
            return "высокий"
    
    def _get_overall_eq_level(self, score: int) -> str:
        if score <= 39:
            return "низкий"
        elif score <= 69:
            return "средний"
        else:
            return "высокий"
    
    def calculate_team_roles(self) -> dict:
        """Расчет командных ролей"""
        roles = {
            "Im": ["B7", "D1", "F8", "H4", "J2", "L6", "N5"],
            "CO": ["B4", "D2", "F1", "H8", "J6", "L3", "N7"],
            "Sh": ["B6", "D5", "F3", "H2", "J4", "L7", "N1"],
            "Pl": ["B3", "D7", "F4", "H5", "J8", "L1", "N6"],
            "RI": ["B1", "D3", "F6", "H7", "J5", "L8", "N4"],
            "ME": ["B8", "D4", "F7", "H3", "J1", "L5", "N2"],
            "TW": ["B2", "D6", "F5", "H1", "J3", "L2", "N8"],
            "CF": ["B5", "D8", "F2", "H6", "J7", "L4", "N3"]
        }
        
        # Максимальные баллы для каждой роли
        max_scores = {
            "Im": 23, "CO": 18, "Sh": 36, "Pl": 29, 
            "RI": 21, "ME": 19, "TW": 25, "CF": 17
        }
        
        # Пороги уровней для каждой роли (низкий, средний, высокий, очень высокий)
        thresholds = {
            "Im": (6, 12, 17, 23),
            "CO": (6, 10, 14, 18),
            "Sh": (8, 14, 18, 36),
            "Pl": (4, 8, 13, 29),
            "RI": (6, 10, 12, 21),
            "ME": (5, 9, 13, 19),
            "TW": (8, 13, 17, 25),
            "CF": (3, 6, 10, 17)
        }
        
        results = {}
        for role, codes in roles.items():
            score = sum(self.answers.get(f"1_{code}", 0) for code in codes)
            percentage = min(100, score * 100 / max_scores.get(role, 100))
            level = self._get_team_role_level(role, score, thresholds)
            results[role] = self._create_test_result(score, percentage, level)
        
        return results
    
    def _get_team_role_level(self, role: str, score: int, thresholds: dict) -> str:
        low, medium, high, very_high = thresholds.get(role, (0, 0, 0, 0))
        
        if score <= low:
            return "низкий"
        elif score <= medium:
            return "средний"
        elif score <= high:
            return "высокий"
        else:
            return "очень высокий"
    
    def calculate_motivation(self) -> dict:
        """Расчет факторов мотивации"""
        hygiene_factors = {
            "financial": ["B1", "B8", "B14", "B15", "B22", "B23", "B46"],
            "recognition": ["B2", "B9", "B18", "B19", "B30", "B36", "B49"],
            "management": ["B3", "B16", "B32", "B35", "B40", "B41", "B5"],
            "collaboration": ["B11", "B20", "B25", "B31", "B45", "B51", "B55"]
        }
        
        motivation_factors = {
            "responsibility": ["B4", "B13", "B17", "B26", "B27", "B33", "B47"],
            "career": ["B7", "B28", "B37", "B42", "B44", "B50", "B52"],
            "achievement": ["B24", "B29", "B38", "B39", "B48", "B53", "B56"],
            "content": ["B10", "B12", "B21", "B34", "B43", "B54", "B6"]
        }
        
        results = {
            "hygiene_factors": {},
            "motivation_factors": {}
        }
        
        # Расчет гигиенических факторов
        for factor, codes in hygiene_factors.items():
            score = sum(self.answers.get(f"1_{code}", {}).get("left", 0) for code in codes)
            percentage = min(100, score * 100 / 35)
            level = self._get_motivation_level(percentage, is_hygiene=True)
            results["hygiene_factors"][factor] = self._create_test_result(score, percentage, level)
        
        # Расчет факторов мотивации
        for factor, codes in motivation_factors.items():
            score = sum(self.answers.get(f"1_{code}", {}).get("left", 0) for code in codes)
            percentage = min(100, score * 100 / 35)
            level = self._get_motivation_level(percentage, is_hygiene=False)
            results["motivation_factors"][factor] = self._create_test_result(score, percentage, level)
        
        # Определение топ-факторов
        results["top_hygiene"] = self._get_top_factors(results["hygiene_factors"])
        results["top_motivation"] = self._get_top_factors(results["motivation_factors"])
        
        return results
    
    def _get_motivation_level(self, percentage: float, is_hygiene: bool) -> str:
        if percentage <= 25:
            return "низкий" if is_hygiene else "высокий"
        elif percentage <= 50:
            return "средний"
        elif percentage <= 75:
            return "высокий" if is_hygiene else "низкий"
        else:
            return "очень высокий"
    
    def _get_top_factors(self, factors: dict, top_n: int = 2) -> list:
        """Возвращает топ-N факторов по баллам"""
        sorted_factors = sorted(
            factors.items(), 
            key=lambda x: x[1]["score"], 
            reverse=True
        )
        return [{"factor": factor, "result": result} 
                for factor, result in sorted_factors[:top_n]]
    
    def calculate_iq(self) -> dict:
        """Расчет результатов IQ теста"""
        # Правильные ответы для 50 вопросов
        correct_answers = {
            "q1": "ноябрь", "q2": "мягкий", "q3": "доверие", "q4": "ДА",
            "q5": "слушать", "q6": "непристойный", "q7": "зубы", "q8": 1,
            "q9": "тусклый", "q10": 40, "q11": "ни сходное, ни противоположное",
            "q12": 270, "q13": 4, "q14": "чужой", "q15": 0.31, "q16": "НИ",
            "q17": 4, "q18": 4, "q19": "ни сходное, ни противоположное",
            "q20": "Неправильно", "q21": ["2", "4"], "q22": 31, "q23": "марте",
            "q24": "верно", "q25": 1500, "q26": "верно", "q27": 1,
            "q28": "ни схожи, ни противоположны", "q29": "2-13", "q30": "неопределенно",
            "q31": 1600, "q32": ["1", "2", "4"], "q33": 18, "q34": "ни сходны, ни противоположны",
            "q35": "сходны", "q36": "схож", "q37": 4.8, "q38": "схожи", "q39": 20,
            "q40": 1/8, "q41": "ни сходными, ни противоположными", "q42": 14,
            "q43": "сходны", "q44": 800, "q45": 1/10, "q46": 280, "q47": ["3", "4"],
            "q48": "сходно", "q49": 3, "q50": 17
        }
        
        # Группировка по субшкалам
        subscales = {
            "knowledge": ["q1", "q4", "q23"],
            "attention": ["q8", "q13"],
            "spatial": ["q17", "q29", "q32", "q49"],
            "logical": ["q3", "q7", "q9", "q16"],
            "verbal": ["q2", "q5", "q6", "q11", "q14", "q19", "q20", "q21", 
                      "q24", "q26", "q28", "q30", "q34", "q35", "q36", "q38", 
                      "q41", "q43", "q47", "q48"],
            "math": ["q10", "q12", "q15", "q18", "q22", "q25", "q27", "q31", 
                    "q33", "q37", "q39", "q40", "q42", "q44", "q45", "q46", "q50"]
        }
        
        # Подсчет правильных ответов
        score = 0
        details = {}
        subscale_results = {scale: {"total": 0, "correct": 0, "incorrect": 0, "skipped": 0}
                           for scale in subscales}
        
        for q, correct in correct_answers.items():
            user_answer = self.answers.get(f"2_{q}")
            is_correct = False
            q_type = "text"
            
            # Определение типа вопроса
            if isinstance(correct, list):
                q_type = "multiple"
                if isinstance(user_answer, list) and set(user_answer) == set(correct):
                    is_correct = True
            elif isinstance(correct, (int, float)):
                q_type = "numeric"
                try:
                    if abs(float(user_answer) - float(correct)) < 0.01:
                        is_correct = True
                except (TypeError, ValueError):
                    pass
            else:
                q_type = "text"
                if str(user_answer).strip().lower() == str(correct).strip().lower():
                    is_correct = True
            
            # Обновление деталей
            details[q] = {
                "user_answer": user_answer,
                "correct_answer": correct,
                "is_correct": is_correct,
                "type": q_type
            }
            
            # Обновление общего счета
            if is_correct:
                score += 1
            
            # Обновление субшкал
            for scale, questions in subscales.items():
                if q in questions:
                    subscale_results[scale]["total"] += 1
                    if user_answer is None:
                        subscale_results[scale]["skipped"] += 1
                    elif is_correct:
                        subscale_results[scale]["correct"] += 1
                    else:
                        subscale_results[scale]["incorrect"] += 1
        
        # Расчет процента и уровня
        percentage = min(100, score * 2)  # Каждый вопрос дает 2%
        level = self._get_iq_level(score)
        
        return {
            "overall": self._create_test_result(score, percentage, level),
            "details": details,
            "subscales": subscale_results
        }
    
    def _get_iq_level(self, score: int) -> str:
        if score <= 13:
            return "низкий"
        elif score <= 18:
            return "ниже среднего"
        elif score <= 24:
            return "средний"
        elif score <= 29:
            return "выше среднего"
        else:
            return "высокий"
    
    def _create_test_result(self, score: float, percentage: float, level: str) -> dict:
        """Создает структуру результата теста"""
        return {
            "score": score,
            "percentage": percentage,
            "level": level,
            "description": self._get_description(level)
        }
    
    def _get_description(self, level: str) -> str:
        """Возвращает описание для уровня"""
        descriptions = {
            "низкий": "Низкий уровень развития компетенции",
            "потенциал": "Потенциал для развития компетенции",
            "средний": "Средний уровень развития компетенции",
            "высокий": "Высокий уровень развития компетенции",
            "очень высокий": "Очень высокий уровень развития компетенции",
            "ниже среднего": "Уровень ниже среднего",
            "выше среднего": "Уровень выше среднего"
        }
        return descriptions.get(level, "Уровень не определен")