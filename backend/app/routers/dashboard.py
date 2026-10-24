from collections import defaultdict
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Bill, BillCategory, Budget
from ..schemas import (
    BudgetStatus,
    CreditCardHealth,
    NotificationOut,
    SummaryOut,
)
from ..services.schedule import bill_occurrences, income_occurrences, month_window

router = APIRouter(prefix="/api", tags=["dashboard"], dependencies=[Depends(get_current_user)])

EXPENSE_CATEGORIES = {
    BillCategory.credit_card,
    BillCategory.loan,
    BillCategory.utility,
    BillCategory.rent_payment,
    BillCategory.subscription,
    BillCategory.insurance,
    BillCategory.other,
}


def _budget_statuses(db: Session, month: str, today: date) -> list[BudgetStatus]:
    start, end = month_window(month)
    occ = bill_occurrences(db, start, end, today)

    spent: dict[str, Decimal] = defaultdict(Decimal)
    received: dict[str, Decimal] = defaultdict(Decimal)
    for o in occ:
        if o.category == BillCategory.rent_income:
            received[o.currency] += o.amount
        else:
            spent[o.currency] += o.amount
    for inc, _ in income_occurrences(db, start, end):
        received[inc.currency] += inc.amount

    budgets = {b.currency: b for b in db.query(Budget).filter(Budget.month == month)}
    currencies = sorted(set(spent) | set(received) | set(budgets) | {"USD"})

    out = []
    for cur in currencies:
        b = budgets.get(cur)
        s, i = spent.get(cur, Decimal(0)), received.get(cur, Decimal(0))
        if not b:
            out.append(BudgetStatus(currency=cur, budget=None, spent=s, income=i,
                                    remaining=None, pct_used=None, status="no_budget"))
            continue
        pct = float(s / b.amount * 100) if b.amount else 0.0
        status = "over_budget" if pct > 100 else "warning" if pct >= float(b.warn_pct) else "ok"
        out.append(BudgetStatus(currency=cur, budget=b.amount, spent=s, income=i,
                                remaining=b.amount - s, pct_used=round(pct, 1), status=status))
    return out


@router.get("/summary/{month}", response_model=SummaryOut)
def summary(month: str, db: Session = Depends(get_db)):
    today = date.today()
    start, end = month_window(month)
    occ = bill_occurrences(db, start, end, today)
    return SummaryOut(
        month=month,
        budgets=_budget_statuses(db, month, today),
        missed=[o for o in occ if o.status == "missed"],
        due_soon=[o for o in occ if o.status == "due_soon"],
        upcoming_count=sum(1 for o in occ if o.status == "upcoming"),
        paid_count=sum(1 for o in occ if o.status == "paid"),
    )


@router.get("/notifications", response_model=list[NotificationOut])
def notifications(db: Session = Depends(get_db)):
    today = date.today()
    month = today.strftime("%Y-%m")
    start, end = month_window(month)
    occ = bill_occurrences(db, start, end, today)
    out: list[NotificationOut] = []

    for o in occ:
        if o.status == "missed":
            if o.category == BillCategory.rent_income:
                out.append(NotificationOut(
                    kind="rent_received", severity="warning", date=o.due_date,
                    title=f"Rent not received: {o.name}",
                    detail=f"Expected {o.amount} {o.currency} on {o.due_date} — not marked received."))
            elif not o.auto_pay:
                out.append(NotificationOut(
                    kind="missed", severity="critical", date=o.due_date,
                    title=f"Missed payment: {o.name}",
                    detail=f"{o.amount} {o.currency} was due {o.due_date}. Pay ASAP — late payments hurt your credit score."))
        elif o.status == "due_soon" and not o.auto_pay:
            out.append(NotificationOut(
                kind="due_soon", severity="warning", date=o.due_date,
                title=f"Due soon: {o.name}",
                detail=f"{o.amount} {o.currency} due {o.due_date}."))

    for b in _budget_statuses(db, month, today):
        if b.status == "over_budget":
            out.append(NotificationOut(
                kind="budget", severity="critical",
                title=f"Over budget ({b.currency})",
                detail=f"Spent {b.spent} of {b.budget} {b.currency} this month."))
        elif b.status == "warning":
            out.append(NotificationOut(
                kind="budget", severity="warning",
                title=f"Budget warning ({b.currency})",
                detail=f"{b.pct_used}% of {b.budget} {b.currency} used; {b.remaining} left."))
    return sorted(out, key=lambda n: (n.severity != "critical", n.date or today))


@router.get("/credit-health", response_model=list[CreditCardHealth])
def credit_health(db: Session = Depends(get_db)):
    today = date.today()
    cards = (
        db.query(Bill)
        .filter(Bill.category == BillCategory.credit_card, Bill.active.is_(True))
        .all()
    )
    out = []
    for c in cards:
        tips: list[str] = []
        util = None
        if c.credit_limit and c.current_balance is not None and c.credit_limit > 0:
            util = round(float(c.current_balance / c.credit_limit * 100), 1)
            if util > 30:
                tips.append(f"Utilization is {util}% — pay balance below 30% of the limit (ideally <10%) to protect your score.")
            elif util > 10:
                tips.append(f"Utilization {util}% is OK — under 10% is best for your score.")
        else:
            tips.append("Add credit limit and current balance to track utilization (keep it under 30%).")

        # on-time ratio over the last 12 months
        start = date(today.year - 1, today.month, 1)
        occ = [o for o in bill_occurrences(db, start, today, today) if o.bill_id == c.id]
        due = [o for o in occ if o.status in ("paid", "missed") or o.due_date < today]
        on_time = [o for o in due if o.payment and o.payment.paid_date <= o.due_date]
        ratio = round(len(on_time) / len(due) * 100, 1) if due else None
        if ratio is not None and ratio < 100:
            tips.append(f"On-time payment rate is {ratio}% — payment history is the biggest credit-score factor. Enable auto-pay for at least the minimum.")
        if not c.auto_pay:
            tips.append("Auto-pay is off — turning on auto-pay for the minimum payment prevents missed payments.")
        out.append(CreditCardHealth(
            bill_id=c.id, name=c.name, currency=c.currency,
            credit_limit=c.credit_limit, current_balance=c.current_balance,
            utilization_pct=util, on_time_ratio_pct=ratio, tips=tips))
    return out
