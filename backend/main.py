# main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from surveys.core.database import get_db
from models import Base, AdminUser, ClientUser
from schemas import Client
from email_service import send_welcome_email
import uvicorn
from config import ENV
from surveys.talent_portrait.router import router as talent_portrait_router


# Создание таблиц в базе данных
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Подключаем роутеры
app.include_router(talent_portrait_router)


# Импорт и подключение роутеров с префиксами
from routers import admin, auth, client_auth, client_users, employees
app.include_router(auth.router, prefix="/admin")  # Добавьте префикс
app.include_router(admin.router)
app.include_router(client_auth.router, prefix="/client")  # Добавьте префикс
app.include_router(client_users.router)
app.include_router(employees.router)

@app.get("/")
def read_root():
    """Корневой эндпоинт"""
    return {"message": "Gert Admin Platform API", "environment": ENV}  # Теперь ENV определена

@app.get("/test/admin")
async def test_admin_route(current_admin: AdminUser = Depends(auth.get_current_admin)):
    """Тестовый эндпоинт для проверки прав администратора"""
    return {
        "message": "Admin access confirmed",
        "email": current_admin.email,
        "is_superadmin": current_admin.is_superadmin
    }

@app.get("/test/client")
async def test_client_route(client_id: int = 1, db: Session = Depends(get_db)):
    """Тестовый эндпоинт для проверки данных клиента"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {
        "client": client.company_name,
        "tokens": client.tokens,
        "users": [user.email for user in client.users]
    }

@app.post("/test/email")
async def test_email_route(email: str = "test@example.com"):
    """Тестовый эндпоинт для проверки отправки email"""
    try:
        send_welcome_email(email)
        return {"status": "success", "message": f"Test email sent to {email}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    # Запуск сервера разработки
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)