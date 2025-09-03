FROM python:3.11-slim

# Устанавливаем системные зависимости для psycopg2-binary (минимально)
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# requirements.txt должен лежать рядом с main.py и analyzer.py
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Запускаем FastAPI через uvicorn
ENV PORT=8000
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
