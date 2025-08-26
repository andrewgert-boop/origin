# В начале файла добавьте:
import os
import sys
sys.path.append(os.getcwd())  # Добавляем текущую директорию в PYTHONPATH

# Замените блок с target_metadata на:
from models import Base
target_metadata = Base.metadata

# В функции run_migrations_online замените создание движка:
def run_migrations_online() -> None:
    from database import engine
    connectable = engine

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True
        )

        with context.begin_transaction():
            context.run_migrations()