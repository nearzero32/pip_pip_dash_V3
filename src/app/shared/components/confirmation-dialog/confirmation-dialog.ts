import { Component, EventEmitter, Output, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../i18n/language.service';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-dialog.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './confirmation-dialog.css'
})
export class ConfirmationDialogComponent {
  private language = inject(LanguageService);

  @Input() title = '';
  @Input() message = '';
  @Input() confirmText = '';
  @Input() cancelText = '';
  @Input() type: 'danger' | 'warning' | 'info' = 'danger';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  get displayTitle() {
    return this.title || this.language.t('common.confirmTitle');
  }

  get displayMessage() {
    return this.message || this.language.t('common.confirmMessage');
  }

  get displayConfirm() {
    return this.confirmText || this.language.t('common.confirm');
  }

  get displayCancel() {
    return this.cancelText || this.language.t('common.cancel');
  }

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
