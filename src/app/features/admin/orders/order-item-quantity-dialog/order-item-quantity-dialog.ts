import { ChangeDetectionStrategy, Component, HostListener, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { OrderItemSnapshot } from '../orders.models';

@Component({
  selector: 'app-order-item-quantity-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog-overlay" (click)="requestClose()">
      <div
        class="dialog-container"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qty-title"
      >
        <h3 id="qty-title">{{ 'orders.changeQuantity' | t }}</h3>
        <p>{{ item().productName }}</p>
        <dl>
          <div>
            <dt>{{ 'orders.currentQuantity' | t }}</dt>
            <dd>{{ item().quantity }}</dd>
          </div>
          <div>
            <dt>{{ 'orders.snapshotUnit' | t }}</dt>
            <dd>{{ snapshotUnit() }}</dd>
          </div>
          <div>
            <dt>{{ 'orders.newLineTotal' | t }}</dt>
            <dd>{{ newLineTotal() }}</dd>
          </div>
        </dl>
        <label class="filter-field">
          <span class="filter-field__label">{{ 'orders.newQuantity' | t }}</span>
          <input
            type="number"
            min="1"
            max="99"
            [ngModel]="quantity()"
            (ngModelChange)="quantity.set(+$event || 1)"
          />
        </label>
        <label class="filter-field">
          <span class="filter-field__label">{{ 'orders.mutationReason' | t }}</span>
          <textarea
            rows="3"
            maxlength="1000"
            [ngModel]="reason()"
            (ngModelChange)="reason.set($event)"
            [attr.aria-invalid]="!!reasonError()"
            [attr.aria-describedby]="reasonError() ? 'qty-reason-error' : null"
          ></textarea>
        </label>
        @if (reasonError()) {
          <p id="qty-reason-error" class="err">{{ reasonError() | t }}</p>
        }
        @if (uncertain()) {
          <p class="warn">{{ 'orders.uncertainResult' | t }}</p>
        }
        <div class="dialog-actions">
          <button type="button" class="dialog-btn btn-cancel" [disabled]="submitting()" (click)="requestClose()">
            {{ 'common.cancel' | t }}
          </button>
          <button type="button" class="dialog-btn btn-confirm" [disabled]="submitting()" (click)="submit()">
            {{ 'orders.saveQuantity' | t }}
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
    textarea, input { width: 100%; font-family: inherit; }
    .err { color: var(--color-danger-text); }
    .warn { background: var(--color-warning-soft, #fff7ed); padding: var(--space-2); }
    .dialog-actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
  `,
})
export class OrderItemQuantityDialogComponent {
  readonly item = input.required<OrderItemSnapshot>();
  readonly submitting = input(false);
  readonly uncertain = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<{ quantity: number; reason: string }>();

  readonly quantity = signal(1);
  readonly reason = signal('');
  readonly reasonError = signal('');

  constructor() {
    queueMicrotask(() => this.quantity.set(this.item().quantity));
  }

  snapshotUnit(): number {
    return this.item().unitPrice + this.item().modifiersPrice;
  }

  newLineTotal(): number {
    return this.snapshotUnit() * this.quantity();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.requestClose();
  }

  requestClose() {
    if (this.submitting()) return;
    this.closed.emit();
  }

  submit() {
    const quantity = this.quantity();
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      this.reasonError.set('orders.quantityInvalid');
      return;
    }
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
    this.confirmed.emit({ quantity, reason });
  }
}
