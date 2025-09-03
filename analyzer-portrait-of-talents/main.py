# analyzer-portrait-of-talents/main.py
# FastAPI сервер анализа «Портрет Талантов».
# Считывает ответы из БД и использует analyzer.py для расчёта метрик.

import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import psycopg2
import psycopg2.extras
from analyzer import analyze  # ваша логика анализа в analyzer.py

app = FastAPI(title="Gert Platform — Анализатор: Портрет Талантов")

class AnalyzeRequest(BaseModel):
    assignment_id: int

def get_conn():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL env var is not set")
    return psycopg2.connect(dsn)

@app.get("/health")
def health():
    return {"ok": True, "service": "analyzer"}

@app.post("/analyze")
def analyze_results(req: AnalyzeRequest):
    try:
      conn = get_conn()
      cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
      cur.execute("""
        SELECT question_id, answer_value
        FROM survey_responses
        WHERE survey_assignment_id = %s
        ORDER BY responded_at ASC
      """, (req.assignment_id,))
      rows = cur.fetchall()
      answers = [{"question_id": r["question_id"], "answer_value": r["answer_value"]} for r in rows]
      cur.close()
      conn.close()

      # Ваша функция analyze должна принять assignment_id и массив ответов
      results = analyze(req.assignment_id, answers)
      # results = [{ "parameter_name": "...", "raw_score": 10, "standardized_score": 50, "interpretation_text": "...", "indicator": "..." }, ...]

      return { "results": results }
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))
