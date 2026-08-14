import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './notification-toast.html',
  styleUrl: './notification-toast.css'
})
export class NotificationToastComponent {
  notificationService = inject(NotificationService);

  getIcon(type: string): string {
    switch (type) {
      case 'success':
        return '<circle cx="12" cy="12" r="10"></circle><polyline points="9 12 11 14 15 10"></polyline>';
      case 'error':
        return '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';
      case 'warning':
        return '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>';
      case 'info':
        return '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>';
      default:
        return '';
    }
  }

  onClose(id: string) {
    this.notificationService.remove(id);
  }
}

