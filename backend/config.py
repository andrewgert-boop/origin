import os
from dotenv import load_dotenv

# Загрузка переменных окружения из .env файла
load_dotenv()

# Настройки SMTP для отправки email
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "your-email@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "your-password")

# Секретный ключ для JWT
SECRET_KEY = os.getenv("SECRET_KEY", "secret-key")

# Окружение (dev, prod, test)
ENV = os.getenv("ENV", "dev")

# URL базы данных
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")