import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Occurrence } from '../core/models';
import { Modal } from '../shared/modal';
import { MonthPicker } from '../shared/month-picker';

interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  items: Occurrence[];
}

@Component({
  selector: 'app-schedule',
  imports: [CurrencyPipe, DatePipe, FormsModule, Modal, MonthPicker],
  template: `
    <div class="page-head">
      <h1>Schedule</h1>
      <app-month-picker [(month)]="month" (monthChange)="load()" />
    </div>

    <div class="card cal">
      @for (d of dows; track d) { <div class="dow">{{ d }}</div> }
      @for (c of cells(); track c.iso) {
        <button type="button" class="day" [class.out]="!c.inMonth" [class.today]="c.isToday"
          [class.sel]="c.iso === selected()" (click)="selected.set(c.iso)">
          <span class="num">{{ c.day }}</span>
          <span class="chips">
            @for (o of c.items.slice(0, 3); track o.bill_id + o.due_date + o.name) {
              <span class="chip {{ o.status }}">{{ o.name }}</span>
            }
            @if (c.items.length > 3) { <span class="more">+{{ c.items.length - 3 }} more</span> }
          </span>
        </button>
      }
    </div>

    <div class="legend">
      <span><i class="dot paid"></i> Paid</span>
      <span><i class="dot missed"></i> Missed</span>
      <span><i class="dot due_soon"></i> Due soon</span>
      <span><i class="dot upcoming"></i> Upcoming</span>
    </div>

    @if (selectedItems(); as sel) {
      <div class="card detail">
        <h2>{{ selected() | date: 'EEEE, MMMM d, y' }}</h2>
        @if (sel.length === 0) { <p class="muted">Nothing due this day.</p> }
        @for (o of sel; track o.bill_id + '-' + o.due_date) {
          <div class="row" [class]="o.status">
            <span class="name"><b>{{ o.name }}</b>
              <small class="muted"> · {{ label(o.category) }}{{ o.auto_pay ? ' · auto-pay' : '' }}</small></span>
            <span class="amt" [class.income-amt]="o.category === 'rent_income'">
              {{ o.category === 'rent_income' ? '+' : '−' }}{{ o.amount | currency: o.currency : 'symbol-narrow' }}</span>
            <span class="badge {{ o.status }}">{{ o.status.replace('_', ' ') }}</span>
            <span class="actions">
              @if (o.status === 'paid') {
                <button class="link" (click)="unpay(o)">Undo</button>
              } @else {
                <button (click)="openPay(o)">{{ o.category === 'rent_income' ? 'Received' : 'Pay' }}</button>
              }
            </span>
          </div>
        }
      </div>
    }

    <app-modal [open]="payTarget() !== null" [title]="payTitle()" (close)="payTarget.set(null)">
      @if (payTarget(); as t) {
        <form (ngSubmit)="confirmPay()">
          <div class="fields">
            <label>Amount <input type="number" step="0.01" min="0" [(ngModel)]="payForm.amount" name="pamt" required /></label>
            <label>{{ t.category === 'rent_income' ? 'Received on' : 'Paid on' }}
              <input type="date" [(ngModel)]="payForm.paid_date" name="pdate" required /></label>
          </div>
          <div class="fields">
            <label class="wide">Note (optional) <input [(ngModel)]="payForm.notes" name="pnotes" /></label>
          </div>
          <div class="actions">
            <button type="submit">Confirm</button>
            <button type="button" class="link" (click)="payTarget.set(null)">Cancel</button>
          </div>
        </form>
      }
    </app-modal>
  `,
  styles: `
    .page-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; padding: 14px; }
    .dow { text-align: center; font-size: .72rem; font-weight: 700; color: #6b778c;
      text-transform: uppercase; padding: 4px 0 8px; }
    .day { background: #f7f9fc; border: 1.5px solid transparent; border-radius: 10px;
      min-height: 84px; padding: 6px; text-align: left; display: flex; flex-direction: column;
      gap: 4px; cursor: pointer; font: inherit; }
    .day:hover { border-color: #c8d2e0; background: #fff; transform: none; }
    .day.sel { border-color: #00a885; background: #fff; box-shadow: 0 0 0 2px #00a88533; }
    .day.today .num { background: #00a885; color: #fff; }
    .day.out { opacity: .35; }
    .num { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center;
      font-size: .78rem; font-weight: 700; color: #42526e; }
    .chips { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
    .chip { font-size: .66rem; font-weight: 600; padding: 2px 6px; border-radius: 5px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chip.paid { background: #e3f5ec; color: #1d7a4e; }
    .chip.missed { background: #fdeaea; color: #b92f33; }
    .chip.due_soon { background: #fdf2dd; color: #a96f1d; }
    .chip.upcoming { background: #e6f7f2; color: #008f70; }
    .more { font-size: .62rem; color: #6b778c; padding-left: 4px; }
    .legend { display: flex; gap: 16px; padding: 4px 8px 12px; font-size: .78rem; color: #6b778c; flex-wrap: wrap; }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot.paid { background: #30a46c; } .dot.missed { background: #de3b40; }
    .dot.due_soon { background: #e9a13b; } .dot.upcoming { background: #00a885; }
    .detail .row { display: flex; align-items: center; gap: 12px; padding: 10px;
      border-bottom: 1px solid #eef2f7; flex-wrap: wrap; }
    .detail .row:last-child { border-bottom: 0; }
    .name { flex: 1; min-width: 140px; }
    .amt { font-weight: 700; }
    .income-amt { color: #30a46c; }
    .badge { font-size: .72rem; padding: 3px 10px; border-radius: 999px; text-transform: capitalize; }
    .badge.paid { background: #e3f5ec; color: #1d7a4e; }
    .badge.missed { background: #fdeaea; color: #b92f33; }
    .badge.due_soon { background: #fdf2dd; color: #a96f1d; }
    .badge.upcoming { background: #e6f7f2; color: #008f70; }
    .row.missed { background: #fff5f5; }
    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; margin: 10px 0; }
    .fields label { font-size: .8rem; color: #475569; display: flex; flex-direction: column; gap: 4px; }
    .fields .wide { grid-column: 1 / -1; }
    .actions { margin-top: 8px; display: flex; gap: 10px; }
    @media (max-width: 640px) {
      .day { min-height: 58px; }
      .chip { font-size: .58rem; }
    }
  `,
})
export class SchedulePage implements OnInit {
  private api = inject(ApiService);
  month = new Date().toISOString().slice(0, 7);
  items = signal<Occurrence[]>([]);
  selected = signal(this.todayIso());
  dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  cells = computed<DayCell[]>(() => {
    const [y, m] = this.month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);
    const byDate = new Map<string, Occurrence[]>();
    for (const o of this.items()) {
      const list = byDate.get(o.due_date) ?? [];
      list.push(o);
      byDate.set(o.due_date, list);
    }
    const out: DayCell[] = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(y, m - 1, 1 - first.getDay() + i);
      const iso = this.fmt(d);
      out.push({
        iso,
        day: d.getDate(),
        inMonth: d.getMonth() === m - 1,
        isToday: iso === this.todayIso(),
        items: byDate.get(iso) ?? [],
      });
    }
    return out;
  });

  selectedItems = computed(() =>
    this.cells().find(c => c.iso === this.selected())?.items ?? null
  );

  private labels: Record<string, string> = {
    credit_card: 'Credit card', loan: 'Loan', utility: 'Utility',
    rent_payment: 'Rent due', rent_income: 'Rent to receive',
    subscription: 'Subscription', insurance: 'Insurance', other: 'Other',
  };
  label(c: string) { return this.labels[c] ?? c; }

  ngOnInit() { this.load(); }

  load() {
    this.api.getSchedule(this.month).subscribe(i => {
      this.items.set(i);
      // select today if it's in this month, else first day needing action
      if (!this.month.startsWith(this.todayIso().slice(0, 7))) {
        const next = i.find(o => o.status === 'missed' || o.status === 'due_soon');
        this.selected.set(next?.due_date ?? this.month + '-01');
      }
    });
  }

  payTarget = signal<Occurrence | null>(null);
  payForm = { amount: 0, paid_date: '', notes: '' };

  payTitle() {
    const t = this.payTarget();
    return t ? (t.category === 'rent_income' ? `Mark received — ${t.name}` : `Mark paid — ${t.name}`) : '';
  }

  openPay(o: Occurrence) {
    this.payForm = { amount: o.amount, paid_date: this.todayIso(), notes: '' };
    this.payTarget.set(o);
  }

  confirmPay() {
    const t = this.payTarget();
    if (!t) return;
    this.api.markPaid(t.bill_id, t.due_date, this.payForm.amount,
      this.payForm.paid_date, this.payForm.notes || undefined)
      .subscribe(() => { this.payTarget.set(null); this.load(); });
  }

  unpay(o: Occurrence) {
    this.api.unmarkPaid(o.bill_id, o.due_date).subscribe(() => this.load());
  }

  private todayIso() { return this.fmt(new Date()); }
  private fmt(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
