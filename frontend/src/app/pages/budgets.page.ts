import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Budget, Currency, Summary } from '../core/models';
import { MonthPicker } from '../shared/month-picker';

@Component({
  selector: 'app-budgets',
  imports: [CurrencyPipe, FormsModule, MonthPicker],
  template: `
    <div class="page-head">
      <h1>Monthly Budget</h1>
      <app-month-picker [(month)]="month" (monthChange)="load()" />
    </div>

    <form class="card form" (ngSubmit)="save()">
      <h2>Set budget for {{ month }}</h2>
      <div class="fields">
        <label>Currency
          <select [(ngModel)]="form.currency" name="currency">
            <option value="USD">USD ($)</option><option value="INR">INR (₹)</option>
          </select>
        </label>
        <label>Budget amount <input type="number" step="0.01" min="0" [(ngModel)]="form.amount" name="amount" required /></label>
        <label>Warn me at % used <input type="number" min="1" max="100" [(ngModel)]="form.warn_pct" name="warn_pct" /></label>
      </div>
      <button type="submit">Save budget</button>
      <p class="muted">Set one budget per currency. The warn threshold flags "low budget" before you overspend — e.g. warn at 80%.</p>
    </form>

    @if (summary(); as s) {
      <div class="grid cards">
        @for (b of s.budgets; track b.currency) {
          <div class="card stat" [class.warn]="b.status === 'warning'" [class.bad]="b.status === 'over_budget'">
            <h3>{{ b.currency }} — {{ b.status.replace('_', ' ') }}</h3>
            @if (b.budget !== null) {
              <p class="big">{{ b.spent | currency: b.currency : 'symbol-narrow' : '1.0-0' }}
                <span class="muted">/ {{ b.budget | currency: b.currency : 'symbol-narrow' : '1.0-0' }}</span></p>
              <div class="bar"><div class="fill" [style.width.%]="minPct(b.pct_used)"></div></div>
              <p class="muted">{{ b.pct_used }}% used · {{ b.remaining | currency: b.currency : 'symbol-narrow' : '1.0-0' }} remaining</p>
              <p class="muted">Income this month: {{ b.income | currency: b.currency : 'symbol-narrow' : '1.0-0' }}</p>
              @if (b.status === 'over_budget') {
                <p class="tip bad-text">Over budget — pause non-essential spending; pay at least card minimums to protect your credit score.</p>
              } @else if (b.status === 'warning') {
                <p class="tip">Approaching limit — prioritize credit cards and loans first, defer discretionary spending.</p>
              } @else {
                <p class="tip ok-text">Within budget. If income allows, pay extra toward the highest-APR card.</p>
              }
            } @else {
              <p>No budget set for {{ b.currency }} — planned spend is {{ b.spent | currency: b.currency : 'symbol-narrow' : '1.0-0' }}.</p>
            }
          </div>
        }
      </div>
    }

    @if (budgets().length > 0) {
      <div class="card">
        <h2>Saved budgets</h2>
        <table>
          <thead><tr><th>Month</th><th>Currency</th><th>Amount</th><th>Warn at</th><th></th></tr></thead>
          <tbody>
            @for (b of budgets(); track b.id) {
              <tr>
                <td>{{ b.month }}</td><td>{{ b.currency }}</td>
                <td>{{ b.amount | currency: b.currency : 'symbol-narrow' }}</td>
                <td>{{ b.warn_pct }}%</td>
                <td><button class="link danger" (click)="remove(b)">Delete</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .page-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px 14px; margin: 10px 0; }
    label { font-size: .8rem; color: #475569; display: flex; flex-direction: column; gap: 4px; }
    .grid { display: grid; gap: 12px; margin: 12px 0; }
    .cards { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .stat h3 { margin: 0 0 6px; font-size: .8rem; text-transform: uppercase; color: #64748b; }
    .big { font-size: 1.4rem; margin: 4px 0; font-weight: 700; }
    .bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin: 8px 0; }
    .fill { height: 100%; background: #2563eb; }
    .warn .fill { background: #d97706; } .bad .fill { background: #dc2626; }
    .tip { font-size: .85rem; margin-top: 8px; }
    .bad-text { color: #dc2626; } .ok-text { color: #15803d; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; }
    th { font-size: .75rem; text-transform: uppercase; color: #64748b; }
  `,
})
export class BudgetsPage implements OnInit {
  private api = inject(ApiService);
  month = new Date().toISOString().slice(0, 7);
  budgets = signal<Budget[]>([]);
  summary = signal<Summary | null>(null);
  form = { currency: 'USD' as Currency, amount: 0, warn_pct: 80 };

  ngOnInit() { this.load(); }
  load() {
    this.api.getBudgets().subscribe(b => this.budgets.set(b));
    this.api.getSummary(this.month).subscribe(s => this.summary.set(s));
  }

  minPct(v: number | null) { return Math.min(v ?? 0, 100); }

  save() {
    this.api.saveBudget({ month: this.month, ...this.form }).subscribe(() => this.load());
  }

  remove(b: Budget) {
    this.api.deleteBudget(b.id).subscribe(() => this.load());
  }
}
