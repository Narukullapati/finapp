import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CreditCardHealth, NotificationItem, Summary } from '../core/models';
import { MonthPicker } from '../shared/month-picker';
import { ScoreGauge } from '../shared/score-gauge';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, MonthPicker, ScoreGauge],
  template: `
    <div class="page-head">
      <div>
        <h1>Your money at a glance</h1>
        <p class="muted">Bills, budget and credit health for {{ month }}</p>
      </div>
      <app-month-picker [(month)]="month" (monthChange)="load()" />
    </div>

    @if (summary(); as s) {
      <section class="grid hero">
        <div class="card score-card">
          <app-score-gauge [score]="score()" caption="Based on on-time payments & utilization" />
        </div>

        <div class="card glance">
          <h2>This month</h2>
          <div class="stat-row" [class.bad-text]="s.missed.length > 0">
            <span>Missed</span><b>{{ s.missed.length }}</b>
          </div>
          <div class="stat-row" [class.warn-text]="s.due_soon.length > 0">
            <span>Due in 7 days</span><b>{{ s.due_soon.length }}</b>
          </div>
          <div class="stat-row"><span>Upcoming</span><b>{{ s.upcoming_count }}</b></div>
          <div class="stat-row ok-text"><span>Paid</span><b>{{ s.paid_count }}</b></div>
          <a routerLink="/" fragment="schedule" class="cta">View full schedule →</a>
        </div>

        @for (b of s.budgets; track b.currency) {
          <div class="card glance" [class.warn]="b.status === 'warning'" [class.bad]="b.status === 'over_budget'">
            <h2>{{ b.currency }} budget</h2>
            @if (b.budget !== null) {
              <p class="big">{{ b.spent | currency: b.currency : 'symbol-narrow' : '1.0-0' }}
                <span class="muted">of {{ b.budget | currency: b.currency : 'symbol-narrow' : '1.0-0' }}</span></p>
              <div class="bar"><div class="fill" [style.width.%]="pct(b.pct_used)"
                [class.warn-fill]="b.status === 'warning'" [class.bad-fill]="b.status === 'over_budget'"></div></div>
              <p class="muted">{{ b.pct_used }}% used · {{ b.remaining | currency: b.currency : 'symbol-narrow' : '1.0-0' }} left</p>
            } @else {
              <p class="big">{{ b.spent | currency: b.currency : 'symbol-narrow' : '1.0-0' }}</p>
              <p class="muted">spent — <a routerLink="/" fragment="budget">set a {{ b.currency }} budget</a></p>
            }
            <p class="muted">Income: {{ b.income | currency: b.currency : 'symbol-narrow' : '1.0-0' }}</p>
          </div>
        }
      </section>

      <section class="grid two">
        <div class="card">
          <h2>Needs your attention</h2>
          @if (s.missed.length === 0 && s.due_soon.length === 0) {
            <p class="muted">All caught up — nothing missed or due soon.</p>
          }
          @for (o of s.missed; track o.bill_id + '-' + o.due_date) {
            <div class="row bad-row">
              <span class="dot bad"></span>
              <span class="grow"><b>{{ o.name }}</b><br>
                <small class="muted">was due {{ o.due_date | date: 'mediumDate' }}</small></span>
              <span class="amt">{{ o.amount | currency: o.currency : 'symbol-narrow' }}</span>
              <button (click)="pay(o.bill_id, o.due_date, o.amount)">
                {{ o.category === 'rent_income' ? 'Received' : 'Pay now' }}</button>
            </div>
          }
          @for (o of s.due_soon; track o.bill_id + '-' + o.due_date) {
            <div class="row warn-row">
              <span class="dot warn"></span>
              <span class="grow"><b>{{ o.name }}</b><br>
                <small class="muted">due {{ o.due_date | date: 'mediumDate' }}{{ o.auto_pay ? ' · auto-pay' : '' }}</small></span>
              <span class="amt">{{ o.amount | currency: o.currency : 'symbol-narrow' }}</span>
              <button class="secondary" (click)="pay(o.bill_id, o.due_date, o.amount)">
                {{ o.category === 'rent_income' ? 'Received' : 'Mark paid' }}</button>
            </div>
          }
        </div>

        <div class="card">
          <h2>Alerts</h2>
          @if (notifications().length === 0) { <p class="muted">No alerts right now.</p> }
          @for (n of notifications(); track n.title + n.date) {
            <div class="row" [class.bad-row]="n.severity === 'critical'" [class.warn-row]="n.severity === 'warning'">
              <span class="dot" [class.bad]="n.severity === 'critical'" [class.warn]="n.severity === 'warning'"></span>
              <span class="grow"><b>{{ n.title }}</b><br><small class="muted">{{ n.detail }}</small></span>
            </div>
          }
        </div>
      </section>

      @if (credit().length > 0) {
        <section class="card">
          <h2>Credit health</h2>
          <div class="grid cards">
            @for (c of credit(); track c.bill_id) {
              <div class="cc">
                <div class="cc-head">
                  <b>{{ c.name }}</b>
                  <span class="muted">{{ c.kind === 'loan' ? 'Loan' : 'Card' }} · {{ c.currency }}</span>
                </div>
                @if (c.kind === 'loan') {
                  @if (c.paid_off_pct !== null) {
                    <div class="util-bar">
                      <div class="util-fill" [style.width.%]="pct(c.paid_off_pct)"></div>
                    </div>
                    <p class="muted">{{ c.paid_off_pct }}% paid off —
                      {{ c.current_balance | currency: c.currency : 'symbol-narrow' : '1.0-0' }} left of
                      {{ c.total_amount | currency: c.currency : 'symbol-narrow' : '1.0-0' }}</p>
                  } @else {
                    <p class="muted">Add loan amount & outstanding balance in <a routerLink="/" fragment="bills">Bills</a> to track payoff.</p>
                  }
                } @else {
                  @if (c.utilization_pct !== null) {
                    <div class="util-bar">
                      <div class="util-fill" [style.width.%]="pct(c.utilization_pct)"
                        [class.warn-fill]="c.utilization_pct > 30 && c.utilization_pct <= 50"
                        [class.bad-fill]="c.utilization_pct > 50"></div>
                      <span class="mark m30">30%</span><span class="mark m10">10%</span>
                    </div>
                    <p class="muted">{{ c.utilization_pct }}% of
                      {{ c.credit_limit | currency: c.currency : 'symbol-narrow' : '1.0-0' }} limit</p>
                  }
                }
                @if (c.on_time_ratio_pct !== null) {
                  <p class="muted">On-time payments: <b [class.bad-text]="c.on_time_ratio_pct < 100">{{ c.on_time_ratio_pct }}%</b></p>
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
    .page-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
    .page-head .muted { margin: 2px 0 0; }
    .grid { display: grid; gap: 14px; margin: 14px 0; }
    .hero { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
    .two { grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); }
    .cards { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin: 0; }
    .score-card { display: grid; place-items: center; }
    .big { font-size: 1.45rem; margin: 6px 0; font-weight: 800; }
    .stat-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #eef2f7; font-size: .92rem; }
    .stat-row b { font-size: 1.05rem; }
    .cta { display: inline-block; margin-top: 10px; font-weight: 700; font-size: .9rem; text-decoration: none; }
    .bar { height: 10px; background: #eef2f7; border-radius: 999px; overflow: hidden; margin: 8px 0; }
    .fill { height: 100%; background: #30a46c; border-radius: 999px; transition: width .3s; }
    .warn-fill { background: #e9a13b !important; }
    .bad-fill { background: #de3b40 !important; }
    .row { display: flex; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 12px; margin: 6px 0; background: #f7f9fc; }
    .grow { flex: 1; min-width: 0; }
    .amt { font-weight: 700; white-space: nowrap; }
    .bad-row { background: #fff5f5; } .warn-row { background: #fffcf2; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #b3bac7; flex-shrink: 0; }
    .dot.bad { background: #de3b40; } .dot.warn { background: #e9a13b; }
    .bad-text { color: #de3b40; } .warn-text { color: #b5791f; } .ok-text { color: #30a46c; }
    .cc { background: #f7f9fc; border-radius: 12px; padding: 14px; }
    .cc-head { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .util-bar { position: relative; height: 10px; background: #e4e9f0; border-radius: 999px; margin: 16px 0 6px; }
    .util-fill { height: 100%; background: #30a46c; border-radius: 999px; }
    .mark { position: absolute; top: -14px; font-size: .65rem; color: #9aa5b8; transform: translateX(-50%); }
    .m10 { left: 10%; } .m30 { left: 30%; }
    .tips { margin: 8px 0 0; padding-left: 18px; font-size: .85rem; color: #42526e; }
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  month = new Date().toISOString().slice(0, 7);
  summary = signal<Summary | null>(null);
  notifications = signal<NotificationItem[]>([]);
  credit = signal<CreditCardHealth[]>([]);
  score = signal(0);

  ngOnInit() { this.load(); }

  load() {
    this.api.getSummary(this.month).subscribe(s => { this.summary.set(s); this.computeScore(); });
    this.api.getNotifications().subscribe(n => this.notifications.set(n));
    this.api.getCreditHealth().subscribe(c => { this.credit.set(c); this.computeScore(); });
  }

  pct(v: number | null) { return Math.min(v ?? 0, 100); }

  pay(billId: number, dueDate: string, amount: number) {
    this.api.markPaid(billId, dueDate, amount).subscribe(() => this.load());
  }

  /** 0–100 wellness score: 65% on-time history + 35% utilization (per card). */
  private computeScore() {
    const cards = this.credit();
    const missed = this.summary()?.missed.length ?? 0;
    if (cards.length === 0) {
      this.score.set(Math.max(100 - missed * 15, 10));
      return;
    }
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const ratios = cards.map(c => c.on_time_ratio_pct).filter((v): v is number => v !== null);
    const payScore = ratios.length ? avg(ratios) : 80;
    const utils = cards.map(c => c.utilization_pct).filter((v): v is number => v !== null);
    const utilScore = utils.length
      ? avg(utils.map(u => u <= 10 ? 100 : u <= 30 ? 80 : u <= 50 ? 55 : u <= 75 ? 30 : 10))
      : 75;
    this.score.set(Math.round(payScore * 0.65 + utilScore * 0.35));
  }
}
