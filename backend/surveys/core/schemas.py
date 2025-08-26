from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Any

class SessionCreate(BaseModel):
    """Схема для создания сессии опроса"""
    client_id: int
    employee_id: Optional[int] = None
    candidate_email: Optional[str] = None

class SessionOut(BaseModel):
    """Схема для вывода информации о сессии"""
    id: int
    token: str
    status: str
    created_at: datetime
    employee_id: Optional[int] = None
    candidate_email: Optional[str] = None

class AnswerCreate(BaseModel):
    """Схема для создания ответа на вопрос"""
    module: int
    question_code: str
    answer: Any  # Может быть разным типом данных

class QuestionSchema(BaseModel):
    """Схема вопроса опроса"""
    code: str
    text: str
    type: str
    options: Optional[list] = None
    instruction: Optional[str] = None
    pairs: Optional[list] = None

class BaseReport(BaseModel):
    """Базовая схема отчета"""
    score: Optional[float] = None
    percentage: Optional[float] = None
    level: Optional[str] = None
    description: Optional[str] = None