import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-month-picker',
  imports: [FormsModule],
  template: `
    <span class="picker">
      <button type="button" (click)="shift(-1)">‹</button>
      <input type="month" [(ngModel)]="month" (ngModelChange)="emit()" />
      <button type="button" (click)="shift(1)">›</button>
    </span>
  `,
  styles: `
    .picker { display: inline-flex; gap: 4px; align-items: center; }
    input { padding: 6px 8px; }
    button { padding: 6px 10px; }
  `,
})
export class MonthPicker {
  @Input() month = '';
  @Output() monthChange = new EventEmitter<string>();

  emit() { this.monthChange.emit(this.month); }

  shift(delta: number) {
    const [y, m] = this.month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.emit();
  }
}
