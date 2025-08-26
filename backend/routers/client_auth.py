from datetime import datetime, timedelta, timezone  # Добавьте импорт timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from database import get_db
from models import ClientUser, Client
from schemas import Token
from config import SECRET_KEY
from security import verify_password

router = APIRouter(tags=["Client Auth"])

# Схема аутентификации OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="client/token")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_client_access_token(data: dict):
    """Создание JWT токена для клиента"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """Аутентификация пользователя клиента и получение токена"""
    user = db.query(ClientUser).filter(ClientUser.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is disabled")
    
    client = db.query(Client).filter(Client.id == user.client_id).first()
    if client and client.is_blocked:
        raise HTTPException(status_code=403, detail="Client account is blocked")
    
    access_token = create_client_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_client_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
):
    """Получение текущего пользователя клиента из токена"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(ClientUser).filter(ClientUser.email == email).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is disabled")
    
    client = db.query(Client).filter(Client.id == user.client_id).first()
    if client and client.is_blocked:
        raise HTTPException(status_code=403, detail="Client account is blocked")
    
    return user

async def get_client_admin(
    current_user: ClientUser = Depends(get_current_client_user)
):
    """Проверка прав администратора клиента"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user