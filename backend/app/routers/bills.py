from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Bill, Payment, User
from ..schemas import BillIn, BillOut, OccurrenceOut, PaymentIn, PaymentOut
from ..services.schedule import bill_occurrences, month_window

router = APIRouter(prefix="/api", tags=["bills"], dependencies=[Depends(get_current_user)])


@router.get("/bills", response_model=list[BillOut])
def list_bills(db: Session = Depends(get_db)):
    return db.query(Bill).order_by(Bill.name).all()


@router.post("/bills", response_model=BillOut, status_code=201)
def create_bill(body: BillIn, db: Session = Depends(get_db)):
    bill = Bill(**body.model_dump())
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


@router.get("/bills/{bill_id}", response_model=BillOut)
def get_bill(bill_id: int, db: Session = Depends(get_db)):
    bill = db.get(Bill, bill_id)
    if not bill:
        raise HTTPException(404, "Bill not found")
    return bill


@router.put("/bills/{bill_id}", response_model=BillOut)
def update_bill(bill_id: int, body: BillIn, db: Session = Depends(get_db)):
    bill = db.get(Bill, bill_id)
    if not bill:
        raise HTTPException(404, "Bill not found")
    for k, v in body.model_dump().items():
        setattr(bill, k, v)
    db.commit()
    db.refresh(bill)
    return bill


@router.delete("/bills/{bill_id}", status_code=204)
def delete_bill(bill_id: int, db: Session = Depends(get_db)):
    bill = db.get(Bill, bill_id)
    if not bill:
        raise HTTPException(404, "Bill not found")
    db.delete(bill)
    db.commit()


# ---------- schedule / occurrences ----------

@router.get("/schedule", response_model=list[OccurrenceOut])
def schedule(month: str, db: Session = Depends(get_db)):
    start, end = month_window(month)
    return bill_occurrences(db, start, end)


# ---------- payments ----------

@router.post("/payments", response_model=PaymentOut, status_code=201)
def mark_paid(body: PaymentIn, db: Session = Depends(get_db)):
    bill = db.get(Bill, body.bill_id)
    if not bill:
        raise HTTPException(404, "Bill not found")
    existing = (
        db.query(Payment)
        .filter(Payment.bill_id == body.bill_id, Payment.due_date == body.due_date)
        .first()
    )
    if existing:
        raise HTTPException(409, "Occurrence already paid")
    payment = Payment(
        bill_id=body.bill_id,
        due_date=body.due_date,
        amount=body.amount or bill.amount,
        paid_date=body.paid_date or date.today(),
        notes=body.notes,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.delete("/payments/{bill_id}/{due_date}", status_code=204)
def unmark_paid(bill_id: int, due_date: date, db: Session = Depends(get_db)):
    payment = (
        db.query(Payment)
        .filter(Payment.bill_id == bill_id, Payment.due_date == due_date)
        .first()
    )
    if not payment:
        raise HTTPException(404, "Payment not found")
    db.delete(payment)
    db.commit()


@router.get("/payments", response_model=list[PaymentOut])
def list_payments(month: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Payment)
    if month:
        start, end = month_window(month)
        q = q.filter(Payment.due_date.between(start, end))
    return q.order_by(Payment.due_date.desc()).all()
