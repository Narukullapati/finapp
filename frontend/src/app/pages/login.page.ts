import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-wrap">
      <form class="card login-card" (ngSubmit)="submit()">
        <h1>Financial Reminder</h1>
        <p class="muted">Sign in to manage your bills, budget & credit</p>
        <label>Email
          <input type="email" [(ngModel)]="email" name="email" required autocomplete="username" />
        </label>
        <label>Password
          <input type="password" [(ngModel)]="password" name="password" required autocomplete="current-password" />
        </label>
        @if (error()) { <p class="error">{{ error() }}</p> }
        <button type="submit" [disabled]="loading()">{{ loading() ? 'Signing in…' : 'Sign in' }}</button>
      </form>
    </div>
  `,
  styles: `
    .login-wrap { min-height: 100vh; display: grid; place-items: center; background: #0f172a; }
    .login-card { width: min(400px, 90vw); }
    h1 { margin: 0 0 4px; font-size: 1.4rem; }
    label { display: block; margin: 12px 0 4px; font-size: .85rem; }
    button { margin-top: 16px; width: 100%; }
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  submit() {
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => { this.error.set('Invalid email or password'); this.loading.set(false); },
    });
  }
}
