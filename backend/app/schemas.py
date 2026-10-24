import datetime as dt
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from .models import BillCategory, IncomeKind, Recurrence

Currency = Literal["USD", "INR"]


# ---------- auth ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True


# ---------- bills ----------
class BillIn(BaseModel):
    name: str
    category: BillCategory
    amount: Decimal
    currency: Currency = "USD"
    recurrence: Recurrence = Recurrence.monthly
    due_day: int | None = Field(default=None, ge=1, le=31)
    start_date: date
    end_date: date | None = None
    credit_limit: Decimal | None = None
    current_balance: Decimal | None = None
    minimum_payment: Decimal | None = None
    auto_pay: bool = False
    active: bool = True
    notes: str | None = None


class BillOut(BillIn):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- payments ----------
class PaymentIn(BaseModel):
    bill_id: int
    due_date: date
    amount: Decimal | None = None
    paid_date: date | None = None
    notes: str | None = None


class PaymentOut(BaseModel):
    id: int
    bill_id: int
    due_date: date
    amount: Decimal
    paid_date: date
    notes: str | None

    class Config:
        from_attributes = True


class OccurrenceOut(BaseModel):
    bill_id: int
    name: str
    category: BillCategory
    amount: Decimal
    currency: str
    due_date: date
    status: Literal["paid", "missed", "due_soon", "upcoming"]
    auto_pay: bool
    payment: PaymentOut | None = None


# ---------- income ----------
class IncomeIn(BaseModel):
    name: str
    kind: IncomeKind = IncomeKind.other
    amount: Decimal
    currency: Currency = "USD"
    recurrence: Recurrence = Recurrence.monthly
    pay_day: int | None = Field(default=None, ge=1, le=31)
    start_date: date
    end_date: date | None = None
    active: bool = True
    notes: str | None = None


class IncomeOut(IncomeIn):
    id: int

    class Config:
        from_attributes = True


# ---------- budgets ----------
class BudgetIn(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    currency: Currency = "USD"
    amount: Decimal
    warn_pct: Decimal = Decimal("80")


class BudgetOut(BudgetIn):
    id: int

    class Config:
        from_attributes = True


# ---------- summaries ----------
class BudgetStatus(BaseModel):
    currency: str
    budget: Decimal | None
    spent: Decimal
    income: Decimal
    remaining: Decimal | None
    pct_used: float | None
    status: Literal["no_budget", "ok", "warning", "over_budget"]


class SummaryOut(BaseModel):
    month: str
    budgets: list[BudgetStatus]
    missed: list[OccurrenceOut]
    due_soon: list[OccurrenceOut]
    upcoming_count: int
    paid_count: int


class CreditCardHealth(BaseModel):
    bill_id: int
    name: str
    currency: str
    credit_limit: Decimal | None
    current_balance: Decimal | None
    utilization_pct: float | None
    on_time_ratio_pct: float | None
    tips: list[str]


class NotificationOut(BaseModel):
    kind: Literal["missed", "due_soon", "budget", "credit", "rent_received"]
    title: str
    detail: str
    date: dt.date | None = None
    severity: Literal["info", "warning", "critical"]
