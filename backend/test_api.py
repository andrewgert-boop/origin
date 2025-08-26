# test_api.py
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from main import app
from schemas import Client  # Для проверки ответов

# Фикстура для асинхронного клиента
@pytest_asyncio.fixture(scope="module")
async def async_client():
    async with AsyncClient(
        transport=ASGITransport(app=app), 
        base_url="http://test"
    ) as client:
        yield client

# Фикстура для токена администратора
@pytest_asyncio.fixture(scope="module")
async def admin_token(async_client):
    response = await async_client.post(
        "/admin/token",  # Используем префикс
        data={"username": "admin@example.com", "password": "admin123"}
    )
    assert response.status_code == 200
    token_data = response.json()
    return token_data["access_token"]

# Фикстура для токена пользователя клиента
@pytest_asyncio.fixture(scope="module")
async def client_user_token(async_client):
    response = await async_client.post(
        "/client/token",  # Используем префикс
        data={"username": "user@example.com", "password": "user123"}
    )
    assert response.status_code == 200
    token_data = response.json()
    return token_data["access_token"]

# Тест аутентификации администратора
@pytest.mark.asyncio
async def test_admin_auth(admin_token):
    assert admin_token is not None
    assert isinstance(admin_token, str)
    assert len(admin_token) > 0

# Тест создания клиента
@pytest.mark.asyncio
async def test_create_client(async_client, admin_token):
    # Генерируем уникальное имя компании для теста
    import time
    company_name = f"Test Company {time.time()}"
    
    client_data = {
        "company_name": company_name,
        "employee_count": 50,
        "contact_email": "test@company.com",
        "contact_phone": "+1234567890"
    }
    
    response = await async_client.post(
        "/admin/clients/",
        json=client_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    # Добавим вывод для диагностики
    if response.status_code != 200:
        print(f"Error response: {response.text}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["company_name"] == company_name

# Тест аутентификации пользователя клиента
@pytest.mark.asyncio
async def test_client_user_auth(client_user_token):
    assert client_user_token is not None
    assert isinstance(client_user_token, str)
    assert len(client_user_token) > 0

# Тест управления сотрудниками
@pytest.mark.asyncio
async def test_employee_crud(async_client, client_user_token):
    # Создание сотрудника
    employee_data = {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@company.com",
        "department": "IT",
        "position": "Developer"
    }
    create_response = await async_client.post(
        "/employees/",
        json=employee_data,
        headers={"Authorization": f"Bearer {client_user_token}"}
    )

# Добавим вывод ошибки для диагностики
    if create_response.status_code != 200:
        print(f"Error response: {create_response.text}")

    assert create_response.status_code == 200
    employee = create_response.json()
    employee_id = employee["id"]
    
    # Получение сотрудника
    get_response = await async_client.get(
        f"/employees/{employee_id}",
        headers={"Authorization": f"Bearer {client_user_token}"}
    )
    assert get_response.status_code == 200
    
    # Обновление сотрудника
    update_data = {**employee_data, "position": "Senior Developer"}
    update_response = await async_client.put(
        f"/employees/{employee_id}",
        json=update_data,
        headers={"Authorization": f"Bearer {client_user_token}"}
    )
    assert update_response.status_code == 200
    updated_employee = update_response.json()
    assert updated_employee["position"] == "Senior Developer"
    
    # Удаление сотрудника
    delete_response = await async_client.delete(
        f"/employees/{employee_id}",
        headers={"Authorization": f"Bearer {client_user_token}"}
    )
    assert delete_response.status_code == 200