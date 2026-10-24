from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Budget
from ..schemas import BudgetIn, BudgetOut

router = APIRouter(prefix="/api/budgets", tags=["budgets"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[BudgetOut])
def list_budgets(month: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Budget)
    if month:
        q = q.filter(Budget.month == month)
    return q.order_by(Budget.month.desc(), Budget.currency).all()


@router.put("", response_model=BudgetOut)
def upsert_budget(body: BudgetIn, db: Session = Depends(get_db)):
    budget = (
        db.query(Budget)
        .filter(Budget.month == body.month, Budget.currency == body.currency)
        .first()
    )
    if not budget:
        budget = Budget(month=body.month, currency=body.currency)
        db.add(budget)
    budget.amount = body.amount
    budget.warn_pct = body.warn_pct
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    budget = db.get(Budget, budget_id)
    if not budget:
        raise HTTPException(404, "Budget not found")
    db.delete(budget)
    db.commit()
