import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Bill, BillCategory, Currency, DetectResult, Recurrence, StatementSuggestion } from '../core/models';
import { Modal } from '../shared/modal';

@Component({
  selector: 'app-bills',
  imports: [CurrencyPipe, FormsModule, Modal],
  template: `
    <div class="page-head">
      <h1>Bills & Obligations</h1>
      <span class="head-actions">
        <button class="secondary" (click)="importOpen.set(true)">Import statement</button>
        <button (click)="startNew()">+ Add bill</button>
      </span>
    </div>

    <app-modal [open]="editing()" [title]="form.id ? 'Edit bill' : 'Add bill'" (close)="editing.set(false)">
      <form (ngSubmit)="save()">
        <div class="fields">
          <label>Name <input [(ngModel)]="form.name" name="name" required /></label>
          <label>Category
            <select [(ngModel)]="form.category" name="category">
              @for (c of categories; track c.v) { <option [value]="c.v">{{ c.l }}</option> }
            </select>
          </label>
          <label>{{ form.category === 'loan' ? 'Monthly EMI' : form.category === 'credit_card' ? 'Monthly payment' : 'Amount' }}
            <input type="number" step="0.01" min="0" [(ngModel)]="form.amount" name="amount" required /></label>
          <label>Currency
            <select [(ngModel)]="form.currency" name="currency">
              <option value="USD">USD ($)</option><option value="INR">INR (₹)</option>
            </select>
          </label>
          <label>Repeats
            <select [(ngModel)]="form.recurrence" name="recurrence">
              @for (r of recurrences; track r) { <option [value]="r">{{ r.replace('_', ' ') }}</option> }
            </select>
          </label>
          @if (form.recurrence !== 'one_time' && !isWeekly()) {
            <label>Due day of month <input type="number" min="1" max="31" [(ngModel)]="form.due_day" name="due_day" required /></label>
          }
          <label>{{ form.recurrence === 'one_time' ? 'Date' : 'First due / start date' }}
            <input type="date" [(ngModel)]="form.start_date" name="start_date" required /></label>
          <label>End date (optional) <input type="date" [(ngModel)]="form.end_date" name="end_date" /></label>
          @if (form.category === 'credit_card') {
            <label>Credit limit (total) <input type="number" step="0.01" min="0" [(ngModel)]="form.credit_limit" name="credit_limit" /></label>
            <label>Current balance <input type="number" step="0.01" min="0" [(ngModel)]="form.current_balance" name="current_balance" /></label>
            <label>Minimum payment <input type="number" step="0.01" min="0" [(ngModel)]="form.minimum_payment" name="minimum_payment" /></label>
          }
          @if (form.category === 'loan') {
            <label>Original loan amount <input type="number" step="0.01" min="0" [(ngModel)]="form.total_amount" name="total_amount" /></label>
            <label>Outstanding balance <input type="number" step="0.01" min="0" [(ngModel)]="form.current_balance" name="current_balance" /></label>
          }
          <label class="check"><input type="checkbox" [(ngModel)]="form.auto_pay" name="auto_pay" /> Auto-pay enabled</label>
          <label class="check"><input type="checkbox" [(ngModel)]="form.active" name="active" /> Active</label>
          <label class="wide">Notes <input [(ngModel)]="form.notes" name="notes" /></label>
        </div>
        <div class="actions">
          <button type="submit">Save</button>
          <button type="button" class="link" (click)="editing.set(false)">Cancel</button>
        </div>
      </form>
    </app-modal>

    <app-modal [open]="importOpen()" title="Import from statement" (close)="importOpen.set(false)">
      @if (!detectResult()) {
        <p class="muted">Upload a bank statement (.txt or .csv). I'll find recurring
          transactions — credit cards, loans, utilities, salary — and you pick which to add.</p>
        <input type="file" accept=".txt,.csv" (change)="onFile($event)" />
        @if (detecting()) { <p class="muted">Analyzing…</p> }
        @if (detectError()) { <p class="error">{{ detectError() }}</p> }
      } @else {
        <p class="muted">{{ detectResult()!.transactions }} transactions,
          {{ detectResult()!.span[0] }} → {{ detectResult()!.span[1] }}.
          Review and edit before importing — unchecked rows are skipped.</p>
        <div class="tbl-wrap">
        <table class="review">
          <thead><tr>
            <th></th><th>Name</th><th>Category</th><th>Amount</th>
            <th>Repeats</th><th>Due day</th><th>Seen</th>
          </tr></thead>
          <tbody>
            @for (s of suggestions(); track s.merchant_key; let i = $index) {
              <tr [class.dimmed]="!s.selected">
                <td><input type="checkbox" [(ngModel)]="s.selected" [name]="'sel' + i" /></td>
                <td><input [(ngModel)]="s.name" [name]="'nm' + i" /></td>
                <td>
                  @if (s.kind === 'income') {
                    <span class="kind-tag income">income</span>
                  } @else {
                    <select [(ngModel)]="s.category" [name]="'cat' + i">
                      @for (c of categories; track c.v) { <option [value]="c.v">{{ c.l }}</option> }
                    </select>
                  }
                </td>
                <td><input type="number" step="0.01" min="0" [(ngModel)]="s.amount" [name]="'amt' + i" /></td>
                <td>
                  <select [(ngModel)]="s.recurrence" [name]="'rec' + i">
                    @for (r of recurrences; track r) { <option [value]="r">{{ r.replace('_', ' ') }}</option> }
                  </select>
                </td>
                <td><input type="number" min="1" max="31" [(ngModel)]="s.due_day" [name]="'dd' + i" /></td>
                <td class="muted">{{ s.count }}× · {{ s.recurrence }}</td>
              </tr>
            }
          </tbody>
        </table>
        </div>
        <div class="actions">
          <button (click)="importSelected()" [disabled]="importing() || selectedCount() === 0">
            {{ importing() ? 'Importing…' : 'Import ' + selectedCount() + ' items' }}</button>
          <button type="button" class="link" (click)="resetImport()">Pick another file</button>
        </div>
        @if (importDone()) { <p class="ok-msg">{{ importDone() }}</p> }
      }
    </app-modal>

    <div class="card">
      <table>
        <thead><tr>
          <th>Name</th><th>Category</th><th>Amount</th><th>Balance</th><th>Repeats</th>
          <th>Due</th><th>Auto-pay</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          @for (b of bills(); track b.id) {
            <tr [class.inactive]="!b.active">
              <td><b>{{ b.name }}</b></td>
              <td>{{ label(b.category) }}</td>
              <td>{{ b.amount | currency: b.currency : 'symbol-narrow' }}</td>
              <td>
                @if (b.current_balance !== null) {
                  {{ b.current_balance | currency: b.currency : 'symbol-narrow' : '1.0-0' }}
                  @if (b.credit_limit) { <small class="muted">/ {{ b.credit_limit | currency: b.currency : 'symbol-narrow' : '1.0-0' }}</small> }
                  @if (b.total_amount) { <small class="muted">of {{ b.total_amount | currency: b.currency : 'symbol-narrow' : '1.0-0' }}</small> }
                } @else { — }
              </td>
              <td>{{ b.recurrence.replace('_', ' ') }}</td>
              <td>{{ b.recurrence === 'one_time' ? b.start_date : (b.due_day ? 'day ' + b.due_day : '—') }}</td>
              <td>{{ b.auto_pay ? '✓' : '—' }}</td>
              <td>{{ b.active ? 'active' : 'inactive' }}</td>
              <td class="actions">
                <button class="link" (click)="startEdit(b)">Edit</button>
                <button class="link danger" (click)="remove(b)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="9" class="muted">No bills yet — add your credit cards, loans, utilities and rent.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .page-head { display: flex; justify-content: space-between; align-items: center; }
    .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px 14px; margin: 10px 0; }
    label { font-size: .8rem; color: #475569; display: flex; flex-direction: column; gap: 4px; }
    label.check { flex-direction: row; align-items: center; gap: 8px; margin-top: 18px; }
    .wide { grid-column: 1 / -1; }
    .actions { margin-top: 8px; display: flex; gap: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; }
    th { font-size: .75rem; text-transform: uppercase; color: #64748b; }
    tr.inactive td { opacity: .5; }
    td.actions { white-space: nowrap; }
    .head-actions { display: inline-flex; gap: 10px; }
    .tbl-wrap { max-height: 50vh; overflow-y: auto; margin: 10px 0; }
    table.review td input, table.review td select { padding: 4px 6px; font-size: .82rem; }
    table.review td:nth-child(4) input, table.review td:nth-child(6) input { width: 72px; }
    tr.dimmed td { opacity: .4; }
    .kind-tag { font-size: .7rem; font-weight: 700; padding: 3px 8px; border-radius: 999px;
      background: #e3f5ec; color: #1d7a4e; text-transform: uppercase; }
    .ok-msg { color: #1d7a4e; font-weight: 600; }
  `,
})
export class BillsPage implements OnInit {
  private api = inject(ApiService);
  bills = signal<Bill[]>([]);
  editing = signal(false);
  form = this.blank();

  categories: { v: BillCategory; l: string }[] = [
    { v: 'credit_card', l: 'Credit card' }, { v: 'loan', l: 'Loan / EMI' },
    { v: 'utility', l: 'Utility bill' }, { v: 'rent_payment', l: 'Rent to pay' },
    { v: 'rent_income', l: 'Rent to receive' }, { v: 'subscription', l: 'Subscription' },
    { v: 'insurance', l: 'Insurance' }, { v: 'other', l: 'Other' },
  ];
  recurrences: Recurrence[] = ['monthly', 'weekly', 'biweekly', 'quarterly', 'yearly', 'one_time'];

  private catLabels = Object.fromEntries(this.categories.map(c => [c.v, c.l]));
  label(c: BillCategory) { return this.catLabels[c]; }
  isWeekly() { return this.form.recurrence === 'weekly' || this.form.recurrence === 'biweekly'; }

  blank() {
    return {
      id: 0, name: '', category: 'utility' as BillCategory, amount: 0,
      currency: 'USD' as Currency, recurrence: 'monthly' as Recurrence,
      due_day: 1 as number | null, start_date: new Date().toISOString().slice(0, 10),
      end_date: null as string | null, total_amount: null as number | null,
      credit_limit: null as number | null,
      current_balance: null as number | null, minimum_payment: null as number | null,
      auto_pay: false, active: true, notes: '' as string | null,
    };
  }

  ngOnInit() { this.load(); }
  load() { this.api.getBills().subscribe(b => this.bills.set(b)); }

  startNew() { this.form = this.blank(); this.editing.set(true); }
  startEdit(b: Bill) {
    this.form = { ...b, end_date: b.end_date ?? null, notes: b.notes ?? '' };
    this.editing.set(true);
  }

  save() {
    const { id, ...body } = this.form;
    const req = id ? this.api.updateBill(id, body) : this.api.createBill(body);
    req.subscribe(() => { this.editing.set(false); this.load(); });
  }

  remove(b: Bill) {
    if (confirm(`Delete "${b.name}"? This also removes its payment history.`)) {
      this.api.deleteBill(b.id).subscribe(() => this.load());
    }
  }

  // ---------- statement import ----------
  importOpen = signal(false);
  detecting = signal(false);
  detectError = signal('');
  detectResult = signal<DetectResult | null>(null);
  suggestions = signal<StatementSuggestion[]>([]);
  importing = signal(false);
  importDone = signal('');

  onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.detecting.set(true);
    this.detectError.set('');
    this.api.detectStatement(file).subscribe({
      next: r => {
        this.detecting.set(false);
        this.detectResult.set(r);
        this.suggestions.set(r.suggestions.map(s => ({ ...s, selected: s.kind !== 'skip' })));
      },
      error: err => {
        this.detecting.set(false);
        this.detectError.set(err.error?.detail ?? 'Could not parse that file.');
      },
    });
  }

  resetImport() {
    this.detectResult.set(null);
    this.suggestions.set([]);
    this.importDone.set('');
  }

  selectedCount() { return this.suggestions().filter(s => s.selected).length; }

  importSelected() {
    const items = this.suggestions().filter(s => s.selected);
    this.importing.set(true);
    let bills = 0, incomes = 0, done = 0;
    const finish = () => {
      if (++done === items.length) {
        this.importing.set(false);
        this.importDone.set(`Imported ${bills} bills and ${incomes} income sources.`);
        this.load();
      }
    };
    for (const s of items) {
      if (s.kind === 'income') {
        this.api.createIncome({
          name: s.name, kind: (s.category === 'salary' ? 'salary' : 'other'),
          amount: s.amount, currency: 'USD', recurrence: s.recurrence,
          pay_day: s.due_day, start_date: s.last_date,
        }).subscribe({ next: () => { incomes++; finish(); }, error: finish });
      } else {
        this.api.createBill({
          name: s.name, category: s.category as BillCategory,
          amount: s.amount, currency: 'USD', recurrence: s.recurrence,
          due_day: s.due_day, start_date: s.last_date,
        }).subscribe({
          next: bill => {
            bills++;
            // the statement proves the last occurrence was paid — record it so
            // the calendar shows it as paid and projects only future due dates
            this.api.markPaid(bill.id, this.occurrenceDate(s), s.amount, s.last_date)
              .subscribe({ next: finish, error: finish });
          },
          error: finish,
        });
      }
    }
  }

  /** The occurrence due-date a suggestion's last transaction corresponds to. */
  private occurrenceDate(s: StatementSuggestion): string {
    if (s.recurrence === 'weekly' || s.recurrence === 'biweekly') return s.last_date;
    const [y, m] = s.last_date.slice(0, 7).split('-').map(Number);
    const dim = new Date(y, m, 0).getDate();
    return `${s.last_date.slice(0, 7)}-${String(Math.min(s.due_day, dim)).padStart(2, '0')}`;
  }
}
