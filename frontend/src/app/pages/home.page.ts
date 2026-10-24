import { Component } from '@angular/core';
import { BillsPage } from './bills.page';
import { BudgetsPage } from './budgets.page';
import { DashboardPage } from './dashboard.page';
import { IncomePage } from './income.page';
import { SchedulePage } from './schedule.page';

@Component({
  selector: 'app-home',
  imports: [DashboardPage, SchedulePage, BillsPage, IncomePage, BudgetsPage],
  template: `
    <section id="overview"><app-dashboard /></section>
    <section id="schedule"><app-schedule /></section>
    <section id="bills"><app-bills /></section>
    <section id="income"><app-income /></section>
    <section id="budget"><app-budgets /></section>
  `,
  styles: `
    section { scroll-margin-top: 76px; }
  `,
})
export class HomePage {}
