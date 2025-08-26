from database import SessionLocal
from models import AdminUser, Client, ClientUser
from security import get_password_hash

def init_db():
    """Инициализация базы данных тестовыми данными"""
    db = SessionLocal()
    
    try:
        # Создание администратора
        admin_email = "admin@example.com"
        if not db.query(AdminUser).filter(AdminUser.email == admin_email).first():
            admin = AdminUser(
                email=admin_email,
                hashed_password=get_password_hash("admin123"),
                is_superadmin=True
            )
            db.add(admin)
            print(f"Admin user created: {admin_email}")
        
        # Создание тестового клиента
        client_name = "Test Company"
        if not db.query(Client).filter(Client.company_name == client_name).first():
            client = Client(
                company_name=client_name,
                employee_count=50,
                contact_email="client@example.com",
                contact_phone="+79998887766",
                tokens=100,
                is_active=True,
                is_suspended=False,
                is_blocked=False
            )
            db.add(client)
            db.commit()
            db.refresh(client)
            
            # Создание пользователя для клиента
            client_user = ClientUser(
                client_id=client.id,
                first_name="Иван",
                last_name="Иванов",
                email="user@example.com",
                hashed_password=get_password_hash("user123"),
                is_admin=True
            )
            db.add(client_user)
            print(f"Test client created: {client_name}")
        
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error initializing database: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()