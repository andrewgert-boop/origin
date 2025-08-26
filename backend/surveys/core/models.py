from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class BaseSessionModel(Base):
    """Базовая модель сессии опроса"""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    candidate_email = Column(String, nullable=True)
    status = Column(String, default="created")
    created_at = Column(DateTime, default=datetime.utcnow)
    token = Column(String, unique=True, index=True)

class BaseAnswerModel(Base):
    """Базовая модель ответа на вопрос"""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer)
    module = Column(Integer)
    question_code = Column(String)
    answer = Column(String)  # JSON данные храним как строку
    answered_at = Column(DateTime, default=datetime.utcnow)

class BaseResultModel(Base):
    """Базовая модель результатов опроса"""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer)
    report_data = Column(String)  # JSON данные храним как строку
    created_at = Column(DateTime, default=datetime.utcnow)
    report_token = Column(String, unique=True, index=True)