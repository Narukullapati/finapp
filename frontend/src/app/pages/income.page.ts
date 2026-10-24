import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Currency, Income, IncomeKind, Recurrence } from '../core/models';

@Component({
  selector: 'app-income',
  imports: [CurrencyPipe, FormsModule],
  template: `
    <div class="page-head">
      <h1>Income</h1>
      <button (click)="startNew()">+ Add income</button>
    </div>

    @if (editing()) {
      <form class="card form" (ngSubmit)="save()">
        <h2>{{ form.id ? 'Edit' : 'New' }} income</h2>
        <div class="fields">
          <label>Name <input [(ngModel)]="form.name" name="name" required placeholder="e.g. Salary, Freelance" /></label>
          <label>Type
            <select [(ngModel)]="form.kind" name="kind">
              @for (k of kinds; track k) { <option [value]="k">{{ k }}</option> }
            </select>
          </label>
          <label>Amount <input type="number" step="0.01" min="0" [(ngModel)]="form.amount" name="amount" required /></label>
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
          @if (form.recurrence !== 'one_time' && form.recurrence !== 'weekly' && form.recurrence !== 'biweekly') {
            <label>Pay day of month <input type="number" min="1" max="31" [(ngModel)]="form.pay_day" name="pay_day" required /></label>
          }
          <label>{{ form.recurrence === 'one_time' ? 'Date' : 'Start date' }}
            <input type="date" [(ngModel)]="form.start_date" name="start_date" required /></label>
          <label>End date (optional) <input type="date" [(ngModel)]="form.end_date" name="end_date" /></label>
          <label class="check"><input type="checkbox" [(ngModel)]="form.active" name="active" /> Active</label>
          <label class="wide">Notes <input [(ngModel)]="form.notes" name="notes" /></label>
        </div>
        <div class="actions">
          <button type="submit">Save</button>
          <button type="button" class="link" (click)="editing.set(false)">Cancel</button>
        </div>
      </form>
    }

    <div class="card">
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Amount</th><th>Repeats</th><th>Pay day</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (i of items(); track i.id) {
            <tr [class.inactive]="!i.active">
              <td><b>{{ i.name }}</b></td>
              <td>{{ i.kind }}</td>
              <td>{{ i.amount | currency: i.currency : 'symbol-narrow' }}</td>
              <td>{{ i.recurrence.replace('_', ' ') }}</td>
              <td>{{ i.pay_day ? 'day ' + i.pay_day : '—' }}</td>
              <td>{{ i.active ? 'active' : 'inactive' }}</td>
              <td class="actions">
                <button class="link" (click)="startEdit(i)">Edit</button>
                <button class="link danger" (click)="remove(i)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="muted">No income yet — add your salary and other deposits.</td></tr>
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
  `,
})
export class IncomePage implements OnInit {
  private api = inject(ApiService);
  items = signal<Income[]>([]);
  editing = signal(false);
  form = this.blank();

  kinds: IncomeKind[] = ['salary', 'rental', 'business', 'investment', 'other'];
  recurrences: Recurrence[] = ['monthly', 'weekly', 'biweekly', 'quarterly', 'yearly', 'one_time'];

  blank() {
    return {
      id: 0, name: '', kind: 'salary' as IncomeKind, amount: 0,
      currency: 'USD' as Currency, recurrence: 'monthly' as Recurrence,
      pay_day: 1 as number | null, start_date: new Date().toISOString().slice(0, 10),
      end_date: null as string | null, active: true, notes: '' as string | null,
    };
  }

  ngOnInit() { this.load(); }
  load() { this.api.getIncome().subscribe(i => this.items.set(i)); }

  startNew() { this.form = this.blank(); this.editing.set(true); }
  startEdit(i: Income) { this.form = { ...i, end_date: i.end_date ?? null, notes: i.notes ?? '' }; this.editing.set(true); }

  save() {
    const { id, ...body } = this.form;
    const req = id ? this.api.updateIncome(id, body) : this.api.createIncome(body);
    req.subscribe(() => { this.editing.set(false); this.load(); });
  }

  remove(i: Income) {
    if (confirm(`Delete "${i.name}"?`)) this.api.deleteIncome(i.id).subscribe(() => this.load());
  }
}
