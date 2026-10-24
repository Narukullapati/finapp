from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Income
from ..schemas import IncomeIn, IncomeOut

router = APIRouter(prefix="/api/income", tags=["income"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[IncomeOut])
def list_income(db: Session = Depends(get_db)):
    return db.query(Income).order_by(Income.name).all()


@router.post("", response_model=IncomeOut, status_code=201)
def create_income(body: IncomeIn, db: Session = Depends(get_db)):
    inc = Income(**body.model_dump())
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return inc


@router.put("/{income_id}", response_model=IncomeOut)
def update_income(income_id: int, body: IncomeIn, db: Session = Depends(get_db)):
    inc = db.get(Income, income_id)
    if not inc:
        raise HTTPException(404, "Income not found")
    for k, v in body.model_dump().items():
        setattr(inc, k, v)
    db.commit()
    db.refresh(inc)
    return inc


@router.delete("/{income_id}", status_code=204)
def delete_income(income_id: int, db: Session = Depends(get_db)):
    inc = db.get(Income, income_id)
    if not inc:
        raise HTTPException(404, "Income not found")
    db.delete(inc)
    db.commit()
