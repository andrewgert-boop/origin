from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from surveys.core.database import get_db  # Вместо from database import get_db
from . import service, schemas
from .reports.report_generator import generate_html_report, generate_pdf_report
from fastapi.responses import FileResponse, HTMLResponse
from surveys.talent_portrait.reports.report_generator import generate_html_report, generate_pdf_report


router = APIRouter(
    prefix="/surveys/talent-portrait",
    tags=["Talent Portrait Survey"]
)

@router.post("/sessions/", response_model=schemas.SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(session_data: schemas.SessionCreate, db: Session = Depends(get_db)):
    return service.create_session(db, session_data)

@router.get("/sessions/{session_token}/")
def get_session(session_token: str, db: Session = Depends(get_db)):
    session = service.get_session_by_token(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("/questions/{module}/", response_model=list[schemas.QuestionSchema])
def get_questions(module: int):
    if module not in [1, 2]:
        raise HTTPException(status_code=400, detail="Invalid module number. Must be 1 or 2.")
    return service.get_questions(module)

@router.post("/sessions/{session_token}/answers/")
def save_answers(session_token: str, answers: list[schemas.AnswerCreate], db: Session = Depends(get_db)):
    return service.save_answers(db, session_token, answers)

@router.post("/sessions/{session_token}/complete-module/{module}/")
def complete_module(
    session_token: str, 
    module: int, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    return service.complete_module(db, session_token, module, background_tasks)

@router.get("/results/{report_token}/", response_model=schemas.FullReport)
def get_results(report_token: str, db: Session = Depends(get_db)):
    return service.get_results(db, report_token)

@router.get("/public-report/{report_token}/", response_model=schemas.FullReport)
def get_public_report(report_token: str, db: Session = Depends(get_db)):
    return service.get_public_report(db, report_token)

@router.get("/reports/{report_token}/respondent/pdf")
def get_respondent_pdf_report(report_token: str, db: Session = Depends(get_db)):
    results = service.get_results(db, report_token)
    html_content = generate_html_report(results, "respondent")
    pdf_bytes = generate_pdf_report(html_content)
    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="respondent_report_{report_token}.pdf"'}
    )

@router.get("/reports/{report_token}/client/pdf")
def get_client_pdf_report(report_token: str, db: Session = Depends(get_db)):
    results = service.get_results(db, report_token)
    html_content = generate_html_report(results, "client")
    pdf_bytes = generate_pdf_report(html_content)
    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="client_report_{report_token}.pdf"'}
    )