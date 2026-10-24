import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-wrap">
      <div class="login-inner">
        <div class="brand-block">
          <h1>Fin<em>Reminder</em></h1>
          <p>Bills, budget & credit health — all in one place.</p>
        </div>
        <form class="card login-card" (ngSubmit)="submit()">
          <h2>Log in</h2>
          <label>Email
            <input type="email" [(ngModel)]="email" name="email" required autocomplete="username" />
          </label>
          <label>Password
            <input type="password" [(ngModel)]="password" name="password" required autocomplete="current-password" />
          </label>
          @if (error()) { <p class="error">{{ error() }}</p> }
          <button type="submit" [disabled]="loading()">{{ loading() ? 'Signing in…' : 'Log in' }}</button>
        </form>
      </div>
    </div>
  `,
  styles: `
    .login-wrap { min-height: 100vh; display: grid; place-items: center;
      background: linear-gradient(135deg, #00a885 0%, #00b8d4 55%, #4c6fff 130%); padding: 20px; }
    .login-inner { width: min(400px, 92vw); }
    .brand-block { text-align: center; color: #fff; margin-bottom: 20px; }
    .brand-block h1 { font-size: 2rem; font-weight: 800; letter-spacing: -.03em; margin: 0; }
    .brand-block em { font-style: normal; opacity: .85; }
    .brand-block p { margin: 6px 0 0; opacity: .9; font-size: .95rem; }
    .login-card { padding: 26px; }
    .login-card h2 { margin: 0 0 6px; }
    label { display: block; margin: 14px 0 4px; font-size: .82rem; font-weight: 600; color: #42526e; }
    button { margin-top: 18px; width: 100%; padding: 12px; }
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
