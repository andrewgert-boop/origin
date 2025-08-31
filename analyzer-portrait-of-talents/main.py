# FastAPI сервер для анализа "Портрет Талантов"
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import psycopg2
from analyzer import analyze

app = FastAPI(title="Gert Platform — Анализатор: Портрет Талантов")

class AnalyzeRequest(BaseModel):
    assignment_id: int

@app.post("/analyze")
async def analyze_results(request: AnalyzeRequest):
    try:
        conn = psycopg2.connect(
            host="postgres",
            database="gert_platform",
            user="gert_user",
            password="gert_password"
        )
        cursor = conn.cursor()

        cursor.execute("""
            SELECT question_id, answer_value 
            FROM survey_responses 
            WHERE survey_assignment_id = %s
        """, (request.assignment_id,))
        rows = cursor.fetchall()
        answers = [{"question_id": row[0], "answer_value": row[1]} for row in rows]

        results = analyze(request.assignment_id, answers)

        cursor.close()
        conn.close()

        return {"results": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
