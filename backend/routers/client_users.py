from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import ClientUser
from schemas import Client  # Для response_model
from models import Client as ClientModel  # Для работы с БД
from schemas import ClientUserCreate, ClientUser
from security import get_password_hash, generate_temp_password
from email_service import send_email
from routers.client_auth import get_current_client_user, get_client_admin

router = APIRouter(prefix="/client-users", tags=["Client Users"])

@router.post("/", response_model=ClientUser)
def create_client_user(user: ClientUserCreate, db: Session = Depends(get_db)):
    """Создание нового пользователя клиента"""
    # Проверка уникальности email
    db_user = db.query(ClientUser).filter(ClientUser.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Проверка существования клиента
    db_client = db.query(Client).filter(Client.id == user.client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Создание пользователя
    new_user = ClientUser(
        client_id=user.client_id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        hashed_password=get_password_hash(user.password),
        is_admin=user.is_admin
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@router.get("/{client_id}", response_model=list[ClientUser])
def get_client_users(client_id: int, db: Session = Depends(get_db)):
    """Получение всех пользователей клиента"""
    return db.query(ClientUser).filter(ClientUser.client_id == client_id).all()

@router.put("/{user_id}", response_model=ClientUser)
def update_client_user(
    user_id: int, 
    is_admin: bool, 
    is_active: bool,
    db: Session = Depends(get_db)
):
    """Обновление прав пользователя"""
    db_user = db.query(ClientUser).filter(ClientUser.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.is_admin = is_admin
    db_user.is_active = is_active
    
    try:
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")

@router.delete("/{user_id}")
def delete_client_user(user_id: int, db: Session = Depends(get_db)):
    """Удаление пользователя"""
    db_user = db.query(ClientUser).filter(ClientUser.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        db.delete(db_user)
        db.commit()
        return {"message": "User deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")

@router.post("/invite", response_model=ClientUser)
def invite_user(
    email: str,
    first_name: str,
    last_name: str,
    current_user: ClientUser = Depends(get_client_admin),
    db: Session = Depends(get_db)
):
    """Приглашение нового пользователя"""
    # Проверка существования пользователя
    if db.query(ClientUser).filter(
        ClientUser.email == email,
        ClientUser.client_id == current_user.client_id
    ).first():
        raise HTTPException(status_code=400, detail="User already exists in this client")
    
    # Генерация временного пароля
    temp_password = generate_temp_password()
    
    # Создание пользователя
    new_user = ClientUser(
        client_id=current_user.client_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        hashed_password=get_password_hash(temp_password),
        is_admin=False,
        is_active=True
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")
    
    # Отправка приглашения
    subject = "Приглашение в платформу Gert.pro"
    body = f"""Вам предоставлен доступ в рабочий кабинет платформы по оценке персонала Gert.pro.
    
Ваш временный пароль: {temp_password}
    
Пожалуйста, завершите регистрацию по ссылке: http://gert.pro/complete-registration"""
    
    try:
        send_email(email, subject, body)
        return new_user
    except Exception as e:
        # Откат создания пользователя при ошибке отправки
        db.delete(new_user)
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send invitation email: {str(e)}"
        )