import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class BillCategory(str, enum.Enum):
    credit_card = "credit_card"
    loan = "loan"
    utility = "utility"
    rent_payment = "rent_payment"
    rent_income = "rent_income"
    subscription = "subscription"
    insurance = "insurance"
    other = "other"


class Recurrence(str, enum.Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"
    quarterly = "quarterly"
    yearly = "yearly"
    one_time = "one_time"


class IncomeKind(str, enum.Enum):
    salary = "salary"
    rental = "rental"
    business = "business"
    investment = "investment"
    other = "other"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Bill(Base):
    """A recurring or one-time obligation (outgoing) or expected receipt (rent_income)."""

    __tablename__ = "bills"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[BillCategory] = mapped_column(Enum(BillCategory))
    amount: Mapped[float] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")  # USD / INR
    recurrence: Mapped[Recurrence] = mapped_column(Enum(Recurrence), default=Recurrence.monthly)
    due_day: Mapped[int | None] = mapped_column(Integer, nullable=True)  # day of month
    start_date: Mapped[date] = mapped_column(Date)  # anchor for weekly/biweekly & one_time date
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # balance tracking (credit cards: limit/balance/min; loans: principal/outstanding)
    total_amount: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)  # original loan principal
    credit_limit: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    current_balance: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    minimum_payment: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    auto_pay: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    payments: Mapped[list["Payment"]] = relationship(
        back_populates="bill", cascade="all, delete-orphan"
    )


class Payment(Base):
    """A recorded payment/receipt against a bill occurrence (bill + due_date)."""

    __tablename__ = "payments"
    __table_args__ = (UniqueConstraint("bill_id", "due_date", name="uq_payment_bill_due"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    bill_id: Mapped[int] = mapped_column(ForeignKey("bills.id", ondelete="CASCADE"))
    due_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[float] = mapped_column(Numeric(14, 2))
    paid_date: Mapped[date] = mapped_column(Date, default=date.today)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    bill: Mapped[Bill] = relationship(back_populates="payments")


class Income(Base):
    __tablename__ = "incomes"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[IncomeKind] = mapped_column(Enum(IncomeKind), default=IncomeKind.other)
    amount: Mapped[float] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    recurrence: Mapped[Recurrence] = mapped_column(Enum(Recurrence), default=Recurrence.monthly)
    pay_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (UniqueConstraint("month", "currency", name="uq_budget_month_currency"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    month: Mapped[str] = mapped_column(String(7))  # YYYY-MM
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    amount: Mapped[float] = mapped_column(Numeric(14, 2))
    warn_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=80)  # alert at % used
