# routers/admin.py
from fastapi import APIRouter, Depends, HTTPException  # Добавьте APIRouter в импорт
from sqlalchemy.orm import Session
from database import get_db
from routers.auth import get_current_admin
from models import Client as ClientModel
from email_service import send_welcome_email
from schemas import ClientCreate, ClientUpdate, Client
from config import ENV
from models import Client as ClientModel  # Убедитесь, что импортирована модель SQLAlchemy

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)]
)

@router.post("/clients/", response_model=Client)
def create_client(client: ClientCreate, db: Session = Depends(get_db)):
    # Используем модель Client вместо схемы
    db_client = db.query(ClientModel).filter(
        ClientModel.company_name == client.company_name
    ).first()
    
    if db_client:
        raise HTTPException(status_code=400, detail="Company already registered")
    
    # Создаем объект модели
    new_client = ClientModel(
        company_name=client.company_name,
        employee_count=client.employee_count,
        contact_email=client.contact_email,
        contact_phone=client.contact_phone,
        tokens=0
    )
    
    try:
        db.add(new_client)
        db.commit()
        db.refresh(new_client)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating client: {str(e)}")
    
    if ENV != "test":
        try:
            send_welcome_email(client.contact_email)
        except Exception as e:
            print(f"Failed to send welcome email: {str(e)}")
    
    return new_client
    
    # Отправка приветственного письма (кроме тестового окружения)
    if ENV != "test":
        try:
            send_welcome_email(client.contact_email)
        except Exception as e:
            # Логируем ошибку, но не прерываем выполнение
            print(f"Failed to send welcome email: {str(e)}")
    
    return new_client

# Измените response_model везде, где используется list[Client]
@router.get("/clients/", response_model=list[Client])
def read_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Используем ORM модель для запроса, но возвращаем Pydantic схему
    return db.query(ClientModel).offset(skip).limit(limit).all()

@router.get("/clients/{client_id}", response_model=Client)
def read_client(client_id: int, db: Session = Depends(get_db)):
    db_client = db.query(ClientModel).filter(ClientModel.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    return db_client

@router.put("/clients/{client_id}", response_model=Client)
def update_client(
    client_id: int, 
    update_data: ClientUpdate, 
    db: Session = Depends(get_db)
):
    """Обновление информации о клиенте"""
    db_client = db.query(ClientModel).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Обновление только переданных полей
    for field, value in update_data.dict(exclude_unset=True).items():
        setattr(db_client, field, value)
    
    try:
        db.commit()
        db.refresh(db_client)
        return db_client
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating client: {str(e)}")

@router.delete("/clients/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    """Удаление клиента"""
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    try:
        db.delete(db_client)
        db.commit()
        return {"message": "Client deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting client: {str(e)}")

@router.put("/clients/{client_id}/tokens", response_model=Client)
def update_tokens(client_id: int, tokens: int, db: Session = Depends(get_db)):
    """Обновление количества токенов клиента"""
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db_client.tokens = tokens
    
    try:
        db.commit()
        db.refresh(db_client)
        return db_client
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating tokens: {str(e)}")