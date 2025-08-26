import uuid
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, BackgroundTasks
from . import models, schemas, calculator, questions
from . import utils
from surveys.core.database import get_db
from email_service import send_talent_portrait_report
from .reports.report_generator import generate_html_report, generate_pdf_report
import logging

logger = logging.getLogger(__name__)

def create_session(db: Session, session_data: schemas.SessionCreate):
    token = utils.generate_unique_token()
    
    db_session = models.TalentPortraitSession(
        token=token,
        client_id=session_data.client_id,
        employee_id=session_data.employee_id,
        candidate_email=session_data.candidate_email,
        status="created"
    )
    
    db.add(db_session)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        token = utils.generate_unique_token()
        db_session.token = token
        db.commit()
    
    db.refresh(db_session)
    return db_session

def get_session_by_token(db: Session, session_token: str):
    return db.query(models.TalentPortraitSession).filter(
        models.TalentPortraitSession.token == session_token
    ).first()

def get_questions(module: int):
    if module == 1:
        return questions.get_module1_questions()
    elif module == 2:
        return questions.get_module2_questions()
    return []

def save_answers(db: Session, session_token: str, answers: list[schemas.AnswerCreate]):
    session = get_session_by_token(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.status in ["expired", "completed"]:
        raise HTTPException(status_code=400, detail="Session is completed or expired")
    
    current_time = datetime.utcnow()
    module1_started = False
    
    for answer in answers:
        # Для модуля 1
        if answer.module == 1:
            # Если модуль 1 еще не начат - начинаем
            if not session.module1_start:
                session.module1_start = current_time
                session.status = "in_progress"
                module1_started = True
            # Если время вышло
            elif current_time > session.module1_start + timedelta(minutes=45):
                session.status = "expired"
                db.commit()
                raise HTTPException(status_code=400, detail="Module 1 time expired")
        
        # Для модуля 2
        elif answer.module == 2:
            # Если модуль 2 еще не начат
            if not session.module2_start:
                # Проверяем, что модуль 1 завершен
                if session.status != "module1_completed":
                    raise HTTPException(status_code=400, detail="Module 1 not completed")
                session.module2_start = current_time
        
        # Создаем и сохраняем ответ
        db_answer = models.TalentPortraitAnswer(
            session_id=session.id,
            module=answer.module,
            question_code=answer.question_code,
            answer=json.dumps(answer.answer)  # Сериализуем ответ
        )
        db.add(db_answer)
    
    # Если начали модуль 1 - сохраняем изменения
    if module1_started:
        db.commit()
    
    db.commit()
    return {"message": "Answers saved successfully"}

def complete_module(
    db: Session, 
    session_token: str, 
    module: int, 
    background_tasks: BackgroundTasks
):
    session = get_session_by_token(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    current_time = datetime.utcnow()
    
    if module == 1:
        if session.status != "in_progress":
            raise HTTPException(status_code=400, detail="Module 1 is not in progress")
        
        if current_time > session.module1_start + timedelta(minutes=45):
            session.status = "expired"
            db.commit()
            raise HTTPException(status_code=400, detail="Module 1 time expired")
        
        session.module1_end = current_time
        session.time_module1 = (session.module1_end - session.module1_start).seconds
        session.status = "module1_completed"
        # Устанавливаем время начала модуля 2 при завершении модуля 1
        session.module2_start = current_time
        db.commit()
        return {"message": "Module 1 completed successfully"}
    
    elif module == 2:
        if session.status != "module1_completed":
            raise HTTPException(status_code=400, detail="Module 1 not completed or session expired")
        
        # Основное исправление: проверяем установлено ли время начала модуля 2
        if session.module2_start is None:
            # Если не установлено, используем время завершения модуля 1
            if session.module1_end:
                session.module2_start = session.module1_end
                logger.warning(f"module2_start was None for session {session_token}. Used module1_end time.")
            else:
                # Если время завершения модуля 1 недоступно - используем текущее время
                session.module2_start = current_time
                logger.error(f"Both module2_start and module1_end are missing for session {session_token}. Used current time.")
        
        # Проверяем, уложился ли участник в 15 минут для модуля 2
        time_limit = session.module2_start + timedelta(minutes=15)
        if current_time > time_limit:
            session.status = "expired"
            session.exceeded_time = True
            db.commit()
            raise HTTPException(status_code=400, detail="Module 2 time expired")
        
        session.module2_end = current_time
        session.time_module2 = (session.module2_end - session.module2_start).seconds
        session.status = "completed"
        
        answers = db.query(models.TalentPortraitAnswer).filter(
            models.TalentPortraitAnswer.session_id == session.id
        ).all()
        
        answers_dict = {}
        for answer in answers:
            key = f"{answer.module}_{answer.question_code}"
            answers_dict[key] = json.loads(answer.answer)  # Десериализуем ответ
        
        calc = calculator.TalentPortraitCalculator(answers_dict)
        results = calc.calculate_full_results()
        
        report_token = utils.generate_unique_token()
        db_result = models.TalentPortraitResult(
            session_id=session.id,
            report_data=json.dumps(results),
            report_token=report_token
        )
        db.add(db_result)
        
        # Generate reports in background
        background_tasks.add_task(
            generate_and_send_reports,
            session.candidate_email,
            report_token,
            results
        )
        db.commit()
        return {"message": "Module 2 completed successfully"}
    
    raise HTTPException(status_code=400, detail="Invalid module number")

def generate_and_send_reports(
    candidate_email: str,
    report_token: str,
    results: dict
):
    try:
        # Generate respondent report
        respondent_html = generate_html_report(results, "respondent")
        respondent_pdf = generate_pdf_report(respondent_html)
        
        # Generate client report
        client_html = generate_html_report(results, "client")
        client_pdf = generate_pdf_report(client_html)
        
        # Send emails
        send_talent_portrait_report(
            email=candidate_email,
            report_url=f"https://gert.pro/reports/{report_token}/respondent",
            report_type="respondent",
            pdf_attachment=respondent_pdf
        )
        
        # For recruiter (implementation depends on your requirements)
        # send_talent_portrait_report(
        #     email="recruiter@example.com",
        #     report_url=f"https://gert.pro/reports/{report_token}/client",
        #     report_type="client",
        #     pdf_attachment=client_pdf
        # )
    except Exception as e:
        logger.error(f"Error generating reports: {str(e)}")

def get_results(db: Session, report_token: str):
    result = db.query(models.TalentPortraitResult).filter(
        models.TalentPortraitResult.report_token == report_token
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    return json.loads(result.report_data)

def get_public_report(db: Session, report_token: str):
    return get_results(db, report_token)