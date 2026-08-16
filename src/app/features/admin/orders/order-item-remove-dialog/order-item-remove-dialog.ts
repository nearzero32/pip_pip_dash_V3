import { ChangeDetectionStrategy, Component, HostListener, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { OrderItemSnapshot } from '../orders.models';

@Component({
  selector: 'app-order-item-remove-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog-overlay" (click)="requestClose()">
      <div
        class="dialog-container warning"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-title"
      >
        <h3 id="remove-title">{{ 'orders.removeItem' | t }}</h3>
        <p>{{ item().productName }}</p>
        <p class="warn">{{ 'orders.removeHint' | t }}</p>
        <label class="filter-field">
          <span class="filter-field__label">{{ 'orders.mutationReason' | t }}</span>
          <textarea
            rows="3"
            maxlength="1000"
            [ngModel]="reason()"
            (ngModelChange)="reason.set($event)"
            [attr.aria-invalid]="!!reasonError()"
            [attr.aria-describedby]="reasonError() ? 'remove-reason-error' : null"
          ></textarea>
        </label>
        @if (reasonError()) {
          <p id="remove-reason-error" class="err">{{ reasonError() | t }}</p>
        }
        @if (uncertain()) {
          <p class="warn">{{ 'orders.uncertainResult' | t }}</p>
        }
        <div class="dialog-actions">
          <button type="button" class="dialog-btn btn-cancel" [disabled]="submitting()" (click)="requestClose()">
            {{ 'common.cancel' | t }}
          </button>
          <button type="button" class="dialog-btn btn-confirm warning-btn" [disabled]="submitting()" (click)="submit()">
            {{ 'orders.removeItem' | t }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .dialog-overlay {
      position: fixed; inset: 0; z-index: 160; background: var(--color-overlay);
      display: flex; align-items: center; justify-content: center; padding: var(--space-4);
    }
    .dialog-container {
      width: min(28rem, 100%); background: var(--color-surface-raised);
      border-radius: var(--radius-lg); padding: var(--space-5);
      display: flex; flex-direction: column; gap: var(--space-3);
    }
    textarea { width: 100%; font-family: inherit; }
    .warn { background: var(--color-warning-soft, #fff7ed); padding: var(--space-2); margin: 0; }
    .err { color: var(--color-danger-text); }
    .dialog-actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
  `,
})
export class OrderItemRemoveDialogComponent {
  readonly item = input.required<OrderItemSnapshot>();
  readonly submitting = input(false);
  readonly uncertain = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<{ reason: string }>();

  readonly reason = signal('');
  readonly reasonError = signal('');

  @HostListener('document:keydown.escape')
  onEscape() {
    this.requestClose();
  }

  requestClose() {
    if (this.submitting()) return;
    this.closed.emit();
  }

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
    this.confirmed.emit({ reason });
  }
}
