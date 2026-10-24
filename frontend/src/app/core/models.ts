export type Currency = 'USD' | 'INR';
export type BillCategory =
  | 'credit_card' | 'loan' | 'utility' | 'rent_payment'
  | 'rent_income' | 'subscription' | 'insurance' | 'other';
export type Recurrence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time';
export type IncomeKind = 'salary' | 'rental' | 'business' | 'investment' | 'other';
export type OccurrenceStatus = 'paid' | 'missed' | 'due_soon' | 'upcoming';

export interface Bill {
  id: number;
  name: string;
  category: BillCategory;
  amount: number;
  currency: Currency;
  recurrence: Recurrence;
  due_day: number | null;
  start_date: string;
  end_date: string | null;
  credit_limit: number | null;
  current_balance: number | null;
  minimum_payment: number | null;
  auto_pay: boolean;
  active: boolean;
  notes: string | null;
  created_at: string;
}

export interface Payment {
  id: number;
  bill_id: number;
  due_date: string;
  amount: number;
  paid_date: string;
  notes: string | null;
}

export interface Occurrence {
  bill_id: number;
  name: string;
  category: BillCategory;
  amount: number;
  currency: string;
  due_date: string;
  status: OccurrenceStatus;
  auto_pay: boolean;
  payment: Payment | null;
}

export interface Income {
  id: number;
  name: string;
  kind: IncomeKind;
  amount: number;
  currency: Currency;
  recurrence: Recurrence;
  pay_day: number | null;
  start_date: string;
  end_date: string | null;
  active: boolean;
  notes: string | null;
}

export interface Budget {
  id: number;
  month: string;
  currency: Currency;
  amount: number;
  warn_pct: number;
}

export interface BudgetStatus {
  currency: string;
  budget: number | null;
  spent: number;
  income: number;
  remaining: number | null;
  pct_used: number | null;
  status: 'no_budget' | 'ok' | 'warning' | 'over_budget';
}

export interface Summary {
  month: string;
  budgets: BudgetStatus[];
  missed: Occurrence[];
  due_soon: Occurrence[];
  upcoming_count: number;
  paid_count: number;
}

export interface NotificationItem {
  kind: 'missed' | 'due_soon' | 'budget' | 'credit' | 'rent_received';
  title: string;
  detail: string;
  date: string | null;
  severity: 'info' | 'warning' | 'critical';
}

export interface CreditCardHealth {
  bill_id: number;
  name: string;
  currency: string;
  credit_limit: number | null;
  current_balance: number | null;
  utilization_pct: number | null;
  on_time_ratio_pct: number | null;
  tips: string[];
}
