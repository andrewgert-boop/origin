from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class TalentPortraitSession(Base):
    __tablename__ = "talent_portrait_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    candidate_email = Column(String, nullable=True)
    status = Column(String, default="created")
    created_at = Column(DateTime, default=datetime.utcnow)
    module1_start = Column(DateTime, nullable=True)
    module1_end = Column(DateTime, nullable=True)
    module2_start = Column(DateTime, nullable=True)
    module2_end = Column(DateTime, nullable=True)
    token = Column(String, unique=True, index=True)
    time_module1 = Column(Integer, nullable=True)
    time_module2 = Column(Integer, nullable=True)
    
    answers = relationship("TalentPortraitAnswer", back_populates="session")
    result = relationship("TalentPortraitResult", uselist=False, back_populates="session")

class TalentPortraitAnswer(Base):
    __tablename__ = "talent_portrait_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("talent_portrait_sessions.id"))
    module = Column(Integer)
    question_code = Column(String)
    answer = Column(JSON)
    answered_at = Column(DateTime, default=datetime.utcnow)
    
    session = relationship("TalentPortraitSession", back_populates="answers")

class TalentPortraitResult(Base):
    __tablename__ = "talent_portrait_results"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("talent_portrait_sessions.id"))
    report_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    report_token = Column(String, unique=True, index=True)
    
    session = relationship("TalentPortraitSession", back_populates="result")