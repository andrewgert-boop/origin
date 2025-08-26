from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Employee, ClientUser
from schemas import EmployeeCreate, Employee
from routers.client_auth import get_current_client_user
from schemas import Client  # Если используется в response_model
from models import Client as ClientModel  # Для работы с БД
from models import Employee as EmployeeModel  # Исправленный импорт
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/employees", tags=["Employees"])

@router.post("/", response_model=Employee)
def create_employee(
    employee: EmployeeCreate,
    current_user: ClientUser = Depends(get_current_client_user),
    db: Session = Depends(get_db)
):
    try:
        if not current_user.is_active:
            raise HTTPException(status_code=403, detail="User account is disabled")
        
        new_employee = EmployeeModel(  # Исправлено EmployeeModel вместо Employee
            client_id=current_user.client_id,
            first_name=employee.first_name,
            last_name=employee.last_name,
            email=employee.email,
            department=employee.department,
            position=employee.position
        )
        
        db.add(new_employee)
        db.commit()
        db.refresh(new_employee)
        return new_employee
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating employee: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Error creating employee: {str(e)}"
        )

@router.get("/", response_model=list[Employee])
def get_employees(
    current_user: ClientUser = Depends(get_current_client_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="User account is disabled")
    
    # Используем EmployeeModel
    return db.query(EmployeeModel).filter(
        EmployeeModel.client_id == current_user.client_id
    ).all()

@router.get("/{employee_id}", response_model=Employee)
def get_employee(
    employee_id: int,
    current_user: ClientUser = Depends(get_current_client_user),
    db: Session = Depends(get_db)
):
    """Получение информации о конкретном сотруднике"""
    # Используем EmployeeModel вместо Employee
    employee = db.query(EmployeeModel).filter(
        EmployeeModel.id == employee_id,
        EmployeeModel.client_id == current_user.client_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return employee

@router.put("/{employee_id}", response_model=Employee)
def update_employee(
    employee_id: int,
    employee: EmployeeCreate,
    current_user: ClientUser = Depends(get_current_client_user),
    db: Session = Depends(get_db)
):
    # Используем EmployeeModel
    db_employee = db.query(EmployeeModel).filter(
        EmployeeModel.id == employee_id,
        EmployeeModel.client_id == current_user.client_id
    ).first()
    
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Обновление полей
    db_employee.first_name = employee.first_name
    db_employee.last_name = employee.last_name
    db_employee.email = employee.email
    db_employee.department = employee.department
    db_employee.position = employee.position
    
    try:
        db.commit()
        db.refresh(db_employee)
        return db_employee
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating employee: {str(e)}")

@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    current_user: ClientUser = Depends(get_current_client_user),
    db: Session = Depends(get_db)
):
    # Используем EmployeeModel
    employee = db.query(EmployeeModel).filter(
        EmployeeModel.id == employee_id,
        EmployeeModel.client_id == current_user.client_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    try:
        db.delete(employee)
        db.commit()
        return {"message": "Employee deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting employee: {str(e)}")