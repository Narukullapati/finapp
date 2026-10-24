import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CreditCardHealth, NotificationItem, Summary } from '../core/models';
import { MonthPicker } from '../shared/month-picker';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, MonthPicker],
  template: `
    <div class="page-head">
      <h1>Dashboard</h1>
      <app-month-picker [(month)]="month" (monthChange)="load()" />
    </div>

    @if (summary(); as s) {
      <section class="grid cards">
        @for (b of s.budgets; track b.currency) {
          <div class="card stat" [class.warn]="b.status === 'warning'" [class.bad]="b.status === 'over_budget'">
            <h3>{{ b.currency }} budget</h3>
            @if (b.budget !== null) {
              <p class="big">{{ b.spent | currency: b.currency : 'symbol-narrow' : '1.0-0' }}
                <span class="muted">/ {{ b.budget | currency: b.currency : 'symbol-narrow' : '1.0-0' }}</span></p>
              <div class="bar"><div class="fill" [style.width.%]="pct(b.pct_used)"></div></div>
              <p class="muted">{{ b.pct_used }}% used · {{ b.remaining | currency: b.currency : 'symbol-narrow' : '1.0-0' }} left</p>
            } @else {
              <p class="big">{{ b.spent | currency: b.currency : 'symbol-narrow' : '1.0-0' }}</p>
              <p class="muted">spent — <a routerLink="/budgets">set a budget</a></p>
            }
            <p class="muted">Income: {{ b.income | currency: b.currency : 'symbol-narrow' : '1.0-0' }}</p>
          </div>
        }
        <div class="card stat" [class.bad]="s.missed.length > 0">
          <h3>Missed</h3><p class="big">{{ s.missed.length }}</p>
        </div>
        <div class="card stat" [class.warn]="s.due_soon.length > 0">
          <h3>Due in 7 days</h3><p class="big">{{ s.due_soon.length }}</p>
        </div>
        <div class="card stat">
          <h3>Paid / Upcoming</h3><p class="big">{{ s.paid_count }} / {{ s.upcoming_count }}</p>
        </div>
      </section>

      <section class="grid two">
        <div class="card">
          <h2>Needs attention</h2>
          @if (s.missed.length === 0 && s.due_soon.length === 0) {
            <p class="muted">Nothing missed or due soon. Nice.</p>
          }
          @for (o of s.missed; track o.bill_id + '-' + o.due_date) {
            <div class="row bad-row">
              <span><b>{{ o.name }}</b><br><small class="muted">was due {{ o.due_date | date: 'mediumDate' }}</small></span>
              <span>{{ o.amount | currency: o.currency : 'symbol-narrow' }}</span>
              <button (click)="pay(o.bill_id, o.due_date, o.amount)">Mark paid</button>
            </div>
          }
          @for (o of s.due_soon; track o.bill_id + '-' + o.due_date) {
            <div class="row warn-row">
              <span><b>{{ o.name }}</b><br><small class="muted">due {{ o.due_date | date: 'mediumDate' }}{{ o.auto_pay ? ' · auto-pay' : '' }}</small></span>
              <span>{{ o.amount | currency: o.currency : 'symbol-narrow' }}</span>
              <button (click)="pay(o.bill_id, o.due_date, o.amount)">Mark paid</button>
            </div>
          }
        </div>

        <div class="card">
          <h2>Notifications</h2>
          @if (notifications().length === 0) { <p class="muted">No notifications.</p> }
          @for (n of notifications(); track n.title + n.date) {
            <div class="row" [class.bad-row]="n.severity === 'critical'" [class.warn-row]="n.severity === 'warning'">
              <span><b>{{ n.title }}</b><br><small class="muted">{{ n.detail }}</small></span>
            </div>
          }
        </div>
      </section>

      @if (credit().length > 0) {
        <section class="card">
          <h2>Credit health</h2>
          <div class="grid cards">
            @for (c of credit(); track c.bill_id) {
              <div class="card inner">
                <h3>{{ c.name }} <small class="muted">{{ c.currency }}</small></h3>
                @if (c.utilization_pct !== null) {
                  <p>Utilization: <b [class.bad-text]="c.utilization_pct > 30">{{ c.utilization_pct }}%</b>
                    ({{ c.current_balance | currency: c.currency : 'symbol-narrow' : '1.0-0' }} /
                    {{ c.credit_limit | currency: c.currency : 'symbol-narrow' : '1.0-0' }})</p>
                }
                @if (c.on_time_ratio_pct !== null) {
                  <p>On-time payments (12 mo): <b [class.bad-text]="c.on_time_ratio_pct < 100">{{ c.on_time_ratio_pct }}%</b></p>
                }
                <ul class="tips">@for (t of c.tips; track t) { <li>{{ t }}</li> }</ul>
              </div>
            }
          </div>
        </section>
      }
    } @else {
      <p class="muted">Loading…</p>
    }
  `,
  styles: `
    .page-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .grid { display: grid; gap: 12px; margin: 12px 0; }
    .cards { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
    .two { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
    .stat h3 { margin: 0 0 6px; font-size: .8rem; text-transform: uppercase; color: #64748b; }
    .big { font-size: 1.5rem; margin: 4px 0; font-weight: 700; }
    .bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .fill { height: 100%; background: #2563eb; }
    .warn .fill { background: #d97706; } .bad .fill { background: #dc2626; }
    .row { display: flex; gap: 10px; align-items: center; justify-content: space-between;
      padding: 8px 10px; border-radius: 8px; margin: 6px 0; background: #f8fafc; }
    .bad-row { background: #fef2f2; } .warn-row { background: #fffbeb; }
    .bad-text { color: #dc2626; }
    .tips { margin: 6px 0 0; padding-left: 18px; font-size: .85rem; color: #475569; }
    .inner { background: #f8fafc; }
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  month = new Date().toISOString().slice(0, 7);
  summary = signal<Summary | null>(null);
  notifications = signal<NotificationItem[]>([]);
  credit = signal<CreditCardHealth[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.api.getSummary(this.month).subscribe(s => this.summary.set(s));
    this.api.getNotifications().subscribe(n => this.notifications.set(n));
    this.api.getCreditHealth().subscribe(c => this.credit.set(c));
  }

  pct(v: number | null) { return Math.min(v ?? 0, 100); }

  pay(billId: number, dueDate: string, amount: number) {
    this.api.markPaid(billId, dueDate, amount).subscribe(() => this.load());
  }
}
