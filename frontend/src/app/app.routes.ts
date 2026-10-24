import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { HomePage } from './pages/home.page';
import { LoginPage } from './pages/login.page';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: '', component: HomePage, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
