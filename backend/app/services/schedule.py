"""Expand recurring bills/incomes into dated occurrences and compute status."""
import calendar
from datetime import date, timedelta

from sqlalchemy.orm import Session

from ..config import settings
from ..models import Bill, Income, Payment, Recurrence
from ..schemas import OccurrenceOut, PaymentOut


def _clamp_day(year: int, month: int, day: int) -> date:
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(day, last))


def _add_months(d: date, months: int) -> date:
    m = d.month - 1 + months
    y = d.year + m // 12
    return _clamp_day(y, m % 12 + 1, d.day)


def occurrence_dates(
    recurrence: Recurrence,
    start: date,
    end: date | None,
    due_day: int | None,
    window_start: date,
    window_end: date,
) -> list[date]:
    """All due dates for a recurring item within [window_start, window_end]."""
    dates: list[date] = []
    limit = end or window_end
    hard_end = min(limit, window_end)

    if recurrence == Recurrence.one_time:
        if window_start <= start <= hard_end:
            dates.append(start)
        return dates

    if recurrence in (Recurrence.weekly, Recurrence.biweekly):
        step = 7 if recurrence == Recurrence.weekly else 14
        d = start
        if d < window_start:
            # fast-forward to first occurrence inside the window
            delta = (window_start - d).days
            d += timedelta(days=(delta // step) * step)
            if d < window_start:
                d += timedelta(days=step)
        while d <= hard_end:
            dates.append(d)
            d += timedelta(days=step)
        return dates

    # month-based: monthly / quarterly / yearly
    step_months = {
        Recurrence.monthly: 1,
        Recurrence.quarterly: 3,
        Recurrence.yearly: 12,
    }[recurrence]
    day = due_day or start.day
    d = _clamp_day(start.year, start.month, day)
    if d < start:
        d = _add_months(d, step_months)
    while d < window_start:
        d = _add_months(d, step_months)
    while d <= hard_end:
        dates.append(d)
        d = _add_months(d, step_months)
    return dates


def bill_occurrences(
    db: Session,
    window_start: date,
    window_end: date,
    today: date | None = None,
) -> list[OccurrenceOut]:
    today = today or date.today()
    soon_limit = today + timedelta(days=settings.reminder_days)

    bills = db.query(Bill).filter(Bill.active.is_(True)).all()
    payments = {
        (p.bill_id, p.due_date): p
        for p in db.query(Payment).filter(Payment.due_date.between(window_start, window_end))
    }

    out: list[OccurrenceOut] = []
    for b in bills:
        for due in occurrence_dates(
            b.recurrence, b.start_date, b.end_date, b.due_day, window_start, window_end
        ):
            p = payments.get((b.id, due))
            if p:
                status = "paid"
            elif due < today:
                status = "missed"
            elif due <= soon_limit:
                status = "due_soon"
            else:
                status = "upcoming"
            out.append(
                OccurrenceOut(
                    bill_id=b.id,
                    name=b.name,
                    category=b.category,
                    amount=b.amount,
                    currency=b.currency,
                    due_date=due,
                    status=status,
                    auto_pay=b.auto_pay,
                    payment=PaymentOut.model_validate(p) if p else None,
                )
            )
    out.sort(key=lambda o: o.due_date)
    return out


def income_occurrences(
    db: Session, window_start: date, window_end: date
) -> list[tuple[Income, date]]:
    out: list[tuple[Income, date]] = []
    for inc in db.query(Income).filter(Income.active.is_(True)).all():
        for d in occurrence_dates(
            inc.recurrence, inc.start_date, inc.end_date, inc.pay_day, window_start, window_end
        ):
            out.append((inc, d))
    out.sort(key=lambda t: t[1])
    return out


def month_window(month: str) -> tuple[date, date]:
    y, m = int(month[:4]), int(month[5:7])
    return date(y, m, 1), date(y, m, calendar.monthrange(y, m)[1])
