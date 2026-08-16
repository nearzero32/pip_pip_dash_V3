import { Injectable, inject, signal } from '@angular/core';
import { LanguageService } from '../../i18n/language.service';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private language = inject(LanguageService);
  notifications = signal<Notification[]>([]);

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', duration: number = 4000) {
    const id = Math.random().toString(36).substring(2, 9);
    const notification: Notification = { id, message, type, duration };

    this.notifications.update(notifications => [...notifications, notification]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(message: string, duration?: number) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number) {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number) {
    this.show(message, 'info', duration);
  }

  remove(id: string) {
    this.notifications.update(notifications =>
      notifications.filter(n => n.id !== id)
    );
  }

  handleApiResponse(response: any) {
    if (response && response.data) {
      const apiResponse = response.data;
      if (apiResponse.error) {
        this.error(apiResponse.message || this.language.t('common.unexpectedError'));
      } else {
        this.success(apiResponse.message || this.language.t('common.success'));
      }
    }
  }
}

