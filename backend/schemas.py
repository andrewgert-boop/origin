# schemas.py
from datetime import datetime
from pydantic import ConfigDict, BaseModel, EmailStr
from typing import Optional

class Token(BaseModel):
    """Схема для токена доступа"""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Схема для данных в токене"""
    email: str | None = None

class ClientBase(BaseModel):
    company_name: str
    employee_count: int
    contact_email: EmailStr
    contact_phone: str

class ClientCreate(ClientBase):
    pass

# ДОБАВЛЕН НЕДОСТАЮЩИЙ КЛАСС
class ClientUpdate(BaseModel):
    """Схема для обновления клиента"""
    tokens: Optional[int] = None
    is_suspended: Optional[bool] = None
    is_blocked: Optional[bool] = None

class Client(ClientBase):
    id: int
    tokens: int
    is_active: bool
    is_suspended: bool
    is_blocked: bool

    model_config = ConfigDict(from_attributes=True)

class ClientUserBase(BaseModel):
    """Базовые поля пользователя клиента"""
    first_name: str
    last_name: str
    email: EmailStr
    is_admin: bool = False

class ClientUserCreate(ClientUserBase):
    """Схема для создания пользователя клиента"""
    password: str

class ClientUser(ClientUserBase):
    """Полная схема пользователя клиента"""
    id: int
    client_id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class EmployeeBase(BaseModel):
    """Базовые поля сотрудника"""
    first_name: str
    last_name: str
    email: EmailStr
    department: str
    position: str

class EmployeeCreate(EmployeeBase):
    """Схема для создания сотрудника"""
    pass

class Employee(EmployeeBase):
    """Полная схема сотрудника"""
    id: Optional[int] = None  # Сделать необязательным
    client_id: int
    created_at: Optional[datetime] = None  # Сделать необязательным

    model_config = ConfigDict(from_attributes=True)