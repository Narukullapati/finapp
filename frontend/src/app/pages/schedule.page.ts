import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { Occurrence } from '../core/models';
import { MonthPicker } from '../shared/month-picker';

@Component({
  selector: 'app-schedule',
  imports: [CurrencyPipe, DatePipe, MonthPicker],
  template: `
    <div class="page-head">
      <h1>Schedule</h1>
      <app-month-picker [(month)]="month" (monthChange)="load()" />
    </div>

    <div class="card">
      @for (o of items(); track o.bill_id + '-' + o.due_date) {
        <div class="row" [class]="o.status">
          <span class="date">{{ o.due_date | date: 'EEE, MMM d' }}</span>
          <span class="name"><b>{{ o.name }}</b>
            <small class="muted"> · {{ label(o.category) }}{{ o.auto_pay ? ' · auto-pay' : '' }}</small></span>
          <span class="amt" [class.income-amt]="o.category === 'rent_income'">
            {{ o.category === 'rent_income' ? '+' : '−' }}{{ o.amount | currency: o.currency : 'symbol-narrow' }}</span>
          <span class="badge {{ o.status }}">{{ o.status.replace('_', ' ') }}</span>
          <span class="actions">
            @if (o.status === 'paid') {
              <button class="link" (click)="unpay(o)">Undo</button>
            } @else {
              <button (click)="pay(o)">{{ o.category === 'rent_income' ? 'Received' : 'Pay' }}</button>
            }
          </span>
        </div>
      } @empty {
        <p class="muted">Nothing scheduled this month. Add bills under <b>Bills</b>.</p>
      }
    </div>
  `,
  styles: `
    .page-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .row { display: flex; align-items: center; gap: 12px; padding: 10px; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
    .row:last-child { border-bottom: 0; }
    .date { width: 110px; color: #64748b; }
    .name { flex: 1; min-width: 140px; }
    .amt { font-weight: 600; }
    .income-amt { color: #16a34a; }
    .badge { font-size: .75rem; padding: 3px 10px; border-radius: 999px; text-transform: capitalize; }
    .badge.paid { background: #dcfce7; color: #15803d; }
    .badge.missed { background: #fee2e2; color: #b91c1c; }
    .badge.due_soon { background: #fef3c7; color: #b45309; }
    .badge.upcoming { background: #e0e7ff; color: #4338ca; }
    .row.missed { background: #fef2f2; }
  `,
})
export class SchedulePage implements OnInit {
  private api = inject(ApiService);
  month = new Date().toISOString().slice(0, 7);
  items = signal<Occurrence[]>([]);

  private labels: Record<string, string> = {
    credit_card: 'Credit card', loan: 'Loan', utility: 'Utility',
    rent_payment: 'Rent due', rent_income: 'Rent to receive',
    subscription: 'Subscription', insurance: 'Insurance', other: 'Other',
  };
  label(c: string) { return this.labels[c] ?? c; }

  ngOnInit() { this.load(); }
  load() { this.api.getSchedule(this.month).subscribe(i => this.items.set(i)); }

  pay(o: Occurrence) {
    this.api.markPaid(o.bill_id, o.due_date, o.amount).subscribe(() => this.load());
  }
  unpay(o: Occurrence) {
    this.api.unmarkPaid(o.bill_id, o.due_date).subscribe(() => this.load());
  }
}
