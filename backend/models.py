from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class AdminUser(Base):
    """
    Модель администратора платформы
    """
    __tablename__ = "admin_users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_superadmin = Column(Boolean, default=False)

class Client(Base):
    """
    Модель клиента (компании)
    """
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, index=True)
    employee_count = Column(Integer)
    contact_email = Column(String)
    contact_phone = Column(String)
    tokens = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_suspended = Column(Boolean, default=False)
    is_blocked = Column(Boolean, default=False)
    
    # Связь с пользователями клиента
    users = relationship("ClientUser", back_populates="client")

class ClientUser(Base):
    """
    Модель пользователя клиента
    """
    __tablename__ = "client_users"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Связь с клиентом
    client = relationship("Client", back_populates="users")

class Employee(Base):
    """
    Модель сотрудника компании
    """
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String)
    department = Column(String)
    position = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))  # Исправлено
    
    # Связь с клиентом
    client = relationship("Client")