import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  private key = 'fr_token';

  readonly token = signal<string | null>(localStorage.getItem(this.key));

  get isLoggedIn() { return !!this.token(); }

  login(email: string, password: string) {
    return this.api.login(email, password).pipe(
      tap(r => {
        localStorage.setItem(this.key, r.access_token);
        this.token.set(r.access_token);
      })
    );
  }

  logout() {
    localStorage.removeItem(this.key);
    this.token.set(null);
    this.router.navigate(['/login']);
  }
}
