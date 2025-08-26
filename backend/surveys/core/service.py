import uuid
from sqlalchemy.orm import Session
from . import models, utils

def create_base_session(db: Session, session_data, session_model):
    """Базовая функция создания сессии опроса"""
    token = utils.generate_unique_token()
    db_session = session_model(
        token=token,
        client_id=session_data.client_id,
        employee_id=session_data.employee_id,
        candidate_email=session_data.candidate_email
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_session_by_token(db: Session, token: str, session_model):
    """Получение сессии по токену"""
    return db.query(session_model).filter(
        session_model.token == token
    ).first()

def save_base_answers(db: Session, session_token: str, answers: list, 
                      session_model, answer_model):
    """Сохранение ответов на вопросы"""
    session = get_session_by_token(db, session_token, session_model)
    if not session:
        return None
    
    for answer in answers:
        db_answer = answer_model(
            session_id=session.id,
            module=answer.module,
            question_code=answer.question_code,
            answer=str(answer.answer)  # Сериализуем в строку
        db.add(db_answer)
    
    db.commit()
    return {"message": "Answers saved successfully"}