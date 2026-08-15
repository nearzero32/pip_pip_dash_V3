import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { SessionResponse } from '../interfaces/auth.interface';
import {
  clearTokens,
  currentIdentity,
  DashboardIdentity,
  hasSession,
  writeTokens,
} from '../core/session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly identity = signal<DashboardIdentity | null>(currentIdentity());
  readonly isAuthenticated = computed(() => Boolean(this.identity()));
  readonly roles = computed(() => this.identity()?.roles ?? []);
  readonly isSuperAdmin = computed(() => this.roles().includes('SUPER_ADMIN'));

  constructor() {
    if (!hasSession()) this.identity.set(null);
  }

  async login(email: string, password: string) {
    const response = await this.api.client.post<SessionResponse>(
      '/api/v1/dashboard/auth/login',
      {
        email: email.trim().toLowerCase(),
        password,
        device_name: this.deviceName(),
        device_id: this.deviceId(),
      }
    );
    this.persist(response.data);
    return response.data;
  }

  async logout() {
    try {
      await this.api.client.post('/api/v1/dashboard/auth/logout');
    } catch {
      /* still clear local session */
    }
    this.clearLocal();
    await this.router.navigate(['/auth/sign-in']);
  }

  persist(session: SessionResponse) {
    writeTokens({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      sessionId: session.session_id,
    });
    this.identity.set(currentIdentity());
  }

  clearLocal() {
    clearTokens();
    this.identity.set(null);
  }

  private deviceName(): string {
    if (typeof navigator === 'undefined') return 'Pip Pip Dashboard';
    return (navigator.userAgent || 'Pip Pip Dashboard').slice(0, 128);
  }

  private deviceId(): string {
    const key = 'pip_device_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id.slice(0, 256);
  }
}
