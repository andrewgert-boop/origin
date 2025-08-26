import uuid
import json
from datetime import datetime, timedelta
from typing import Any

def generate_unique_token():
    """Генерация уникального токена"""
    return str(uuid.uuid4())

def validate_time_limit(start_time: datetime, time_limit: timedelta) -> bool:
    """Проверка соблюдения временного лимита"""
    if not start_time:
        return False
    return datetime.utcnow() <= start_time + time_limit

def parse_answer(answer: str) -> Any:
    """Парсинг строкового ответа в Python объект"""
    try:
        return json.loads(answer)
    except (json.JSONDecodeError, TypeError):
        return answer