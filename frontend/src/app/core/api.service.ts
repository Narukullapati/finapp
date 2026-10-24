import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Bill, Budget, CreditCardHealth, Income, NotificationItem,
  Occurrence, Payment, Summary,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  login(email: string, password: string): Observable<{ access_token: string }> {
    return this.http.post<{ access_token: string }>(`${this.base}/auth/login`, { email, password });
  }

  // bills
  getBills() { return this.http.get<Bill[]>(`${this.base}/bills`); }
  createBill(b: Partial<Bill>) { return this.http.post<Bill>(`${this.base}/bills`, b); }
  updateBill(id: number, b: Partial<Bill>) { return this.http.put<Bill>(`${this.base}/bills/${id}`, b); }
  deleteBill(id: number) { return this.http.delete<void>(`${this.base}/bills/${id}`); }

  // schedule & payments
  getSchedule(month: string) { return this.http.get<Occurrence[]>(`${this.base}/schedule`, { params: { month } }); }
  markPaid(billId: number, dueDate: string, amount?: number) {
    return this.http.post<Payment>(`${this.base}/payments`, { bill_id: billId, due_date: dueDate, amount });
  }
  unmarkPaid(billId: number, dueDate: string) {
    return this.http.delete<void>(`${this.base}/payments/${billId}/${dueDate}`);
  }

  // income
  getIncome() { return this.http.get<Income[]>(`${this.base}/income`); }
  createIncome(i: Partial<Income>) { return this.http.post<Income>(`${this.base}/income`, i); }
  updateIncome(id: number, i: Partial<Income>) { return this.http.put<Income>(`${this.base}/income/${id}`, i); }
  deleteIncome(id: number) { return this.http.delete<void>(`${this.base}/income/${id}`); }

  // budgets
  getBudgets(month?: string) {
    return this.http.get<Budget[]>(`${this.base}/budgets`, month ? { params: { month } } : {});
  }
  saveBudget(b: Partial<Budget>) { return this.http.put<Budget>(`${this.base}/budgets`, b); }
  deleteBudget(id: number) { return this.http.delete<void>(`${this.base}/budgets/${id}`); }

  // dashboard
  getSummary(month: string) { return this.http.get<Summary>(`${this.base}/summary/${month}`); }
  getNotifications() { return this.http.get<NotificationItem[]>(`${this.base}/notifications`); }
  getCreditHealth() { return this.http.get<CreditCardHealth[]>(`${this.base}/credit-health`); }
}
