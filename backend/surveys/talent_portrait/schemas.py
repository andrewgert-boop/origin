from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any, Dict, List, Union

class SessionCreate(BaseModel):
    client_id: int
    employee_id: Optional[int] = None
    candidate_email: Optional[str] = None

class SessionOut(BaseModel):
    id: int
    token: str
    status: str
    created_at: datetime
    employee_id: Optional[int] = None
    candidate_email: Optional[str] = None

class AnswerCreate(BaseModel):
    module: int
    question_code: str
    answer: Any

class QuestionSchema(BaseModel):
    code: str
    text: str
    type: str
    options: Optional[List[str]] = None
    instruction: Optional[str] = None
    pairs: Optional[List[Dict]] = None

class TestResult(BaseModel):
    score: float
    percentage: float
    level: str
    description: str

class FullReport(BaseModel):
    business_archetypes: Dict[str, TestResult]
    emotional_intelligence: Dict[str, TestResult]
    team_roles: Dict[str, TestResult]
    motivation: Dict[str, Union[Dict[str, TestResult], List]]
    iq: Dict[str, Union[TestResult, Dict]]