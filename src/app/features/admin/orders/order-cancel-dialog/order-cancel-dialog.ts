import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';

@Component({
  selector: 'app-order-cancel-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog-overlay" (click)="closed.emit()">
      <div class="dialog-container warning" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="order-cancel-title">
        <h3 id="order-cancel-title" class="dialog-title">{{ 'orders.cancelTitle' | t }}</h3>
        <p class="dialog-message">{{ 'orders.cancelMessage' | t }}</p>
        @if (driverCustody()) {
          <p class="warn">{{ 'orders.cancelDriverCustody' | t }}</p>
        }
        <label class="filter-field">
          <span class="filter-field__label">{{ 'orders.cancelReason' | t }}</span>
          <textarea
            rows="3"
            maxlength="1000"
            [ngModel]="reason()"
            (ngModelChange)="reason.set($event)"
            [attr.aria-invalid]="!!reasonError()"
            [attr.aria-describedby]="reasonError() ? 'order-cancel-reason-error' : null"
          ></textarea>
        </label>
        @if (reasonError()) {
          <p id="order-cancel-reason-error" class="err">{{ reasonError() | t }}</p>
        }
        <label class="filter-field">
          <span class="filter-field__label">{{ 'orders.cancelNote' | t }}</span>
          <textarea rows="2" maxlength="1000" [ngModel]="note()" (ngModelChange)="note.set($event)"></textarea>
        </label>
        <div class="dialog-actions">
          <button type="button" class="dialog-btn btn-cancel" (click)="closed.emit()">{{ 'common.cancel' | t }}</button>
          <button type="button" class="dialog-btn btn-confirm warning-btn" [disabled]="submitting()" (click)="submit()">
            {{ 'orders.cancel' | t }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .dialog-overlay {
      position: fixed;
      inset: 0;
      z-index: 160;
      background: var(--color-overlay);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4);
    }
    .dialog-container {
      width: min(28rem, 100%);
      background: var(--color-surface-raised);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    textarea {
      width: 100%;
      font-family: inherit;
      border: 1.5px solid var(--color-border-default);
      border-radius: var(--radius-md);
      padding: var(--space-2);
    }
    .warn, .err {
      margin: 0;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-sm);
    }
    .warn { background: var(--color-warning-soft, #fff7ed); }
    .err { color: var(--color-danger-text); background: var(--color-danger-soft); }
    .dialog-actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
  `,
})
export class OrderCancelDialogComponent {
  readonly driverCustody = input(false);
  readonly submitting = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<{ reason: string; note?: string }>();

  readonly reason = signal('');
  readonly note = signal('');
  readonly reasonError = signal('');

  submit() {
    const reason = this.reason().trim();
    if (!reason) {
      this.reasonError.set('orders.reasonRequired');
      return;
    }
    if (reason.length > 1000) {
      this.reasonError.set('orders.reasonTooLong');
      return;
    }
    this.reasonError.set('');
    const note = this.note().trim();
    this.confirmed.emit(note ? { reason, note } : { reason });
  }
}
