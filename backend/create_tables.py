from database import engine
from models import Base

print("Создаем таблицы...")
# Удаление старых таблиц (для разработки)
Base.metadata.drop_all(bind=engine)  
# Создание новых таблиц
Base.metadata.create_all(bind=engine)  
print("Таблицы успешно созданы!")