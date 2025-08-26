# surveys/core/database.py
from sqlalchemy.orm import Session
from database import SessionLocal  # Импорт из корневого database.py

def get_db() -> Session:
    """
    Генератор сессий базы данных для зависимостей FastAPI.
    Обеспечивает корректное закрытие сессии после завершения запроса.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()