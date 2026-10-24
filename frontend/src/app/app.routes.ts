import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { BillsPage } from './pages/bills.page';
import { BudgetsPage } from './pages/budgets.page';
import { DashboardPage } from './pages/dashboard.page';
import { IncomePage } from './pages/income.page';
import { LoginPage } from './pages/login.page';
import { SchedulePage } from './pages/schedule.page';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: '', component: DashboardPage, canActivate: [authGuard] },
  { path: 'schedule', component: SchedulePage, canActivate: [authGuard] },
  { path: 'bills', component: BillsPage, canActivate: [authGuard] },
  { path: 'income', component: IncomePage, canActivate: [authGuard] },
  { path: 'budgets', component: BudgetsPage, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
