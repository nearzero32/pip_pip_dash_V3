import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { COLLECTION_AMOUNT_MAX, OrderLifecycleAction } from '../orders.models';

@Component({
  selector: 'app-order-lifecycle-override-dialog',
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
        [attr.aria-labelledby]="'override-title'"
      >
        <p class="badge">{{ 'orders.dashboardOverride' | t }}</p>
        <h3 id="override-title">{{ titleKey() | t }}</h3>
        <p>{{ explanationKey() | t }}</p>
        @if (action() === 'delivery') {
          <p>
            <strong>{{ 'orders.expectedAmount' | t }}:</strong>
            <span dir="ltr"> {{ expectedAmount() }} IQD</span>
          </p>
          <label class="filter-field">
            <span class="filter-field__label">{{ 'orders.collectedAmount' | t }}</span>
            <input
              type="number"
              min="0"
              [max]="max"
              [ngModel]="collected()"
              (ngModelChange)="collected.set($event)"
              [attr.aria-invalid]="!!amountError()"
              [attr.aria-describedby]="amountError() ? 'collected-error' : null"
            />
          </label>
          @if (amountError()) {
            <p id="collected-error" class="err">{{ amountError() | t }}</p>
          }
          @if (shortfall() > 0) {
            <p class="err">{{ 'orders.underCollection' | t }}: {{ shortfall() }} IQD</p>
          }
          @if (overCollection()) {
            <p class="warn">{{ 'orders.overCollectionHint' | t }}</p>
          }
        }
        <label class="filter-field">
          <span class="filter-field__label">{{ 'orders.mutationReason' | t }}</span>
          <textarea
            rows="3"
            maxlength="1000"
            [ngModel]="reason()"
            (ngModelChange)="reason.set($event)"
            [attr.aria-invalid]="!!reasonError()"
            [attr.aria-describedby]="reasonError() ? 'override-reason-error' : null"
          ></textarea>
        </label>
        @if (reasonError()) {
          <p id="override-reason-error" class="err">{{ reasonError() | t }}</p>
        }
        <label class="filter-field">
          <span class="filter-field__label">{{ 'orders.overrideNote' | t }}</span>
          <textarea rows="2" maxlength="1000" [ngModel]="note()" (ngModelChange)="note.set($event)"></textarea>
        </label>
        @if (uncertain()) {
          <p class="warn">{{ 'orders.uncertainResult' | t }}</p>
        }
        <div class="dialog-actions">
          <button type="button" class="dialog-btn btn-cancel" [disabled]="submitting()" (click)="requestClose()">
            {{ 'common.cancel' | t }}
          </button>
          <button type="button" class="dialog-btn btn-confirm" [disabled]="submitting() || shortfall() > 0" (click)="submit()">
            {{ titleKey() | t }}
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
      width: min(30rem, 100%); background: var(--color-surface-raised);
      border-radius: var(--radius-lg); padding: var(--space-5);
      display: flex; flex-direction: column; gap: var(--space-3);
    }
    textarea, input { width: 100%; font-family: inherit; }
    .err { color: var(--color-danger-text); margin: 0; }
    .warn { background: var(--color-warning-soft, #fff7ed); padding: var(--space-2); margin: 0; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
  `,
})
export class OrderLifecycleOverrideDialogComponent {
  readonly action = input.required<OrderLifecycleAction>();
  readonly expectedAmount = input(0);
  readonly submitting = input(false);
  readonly uncertain = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<{
    reason: string;
    note?: string;
    collectedAmount?: number;
  }>();

  readonly max = COLLECTION_AMOUNT_MAX;
  readonly reason = signal('');
  readonly note = signal('');
  readonly collected = signal('');
  readonly reasonError = signal('');
  readonly amountError = signal('');

  readonly titleKey = computed(() => `orders.lifecycle.${this.action()}`);
  readonly explanationKey = computed(() => `orders.lifecycle.${this.action()}.hint`);

  readonly collectedValue = computed(() => {
    const raw = String(this.collected()).trim();
    if (!/^\d+$/.test(raw)) return null;
    return Number(raw);
  });

  readonly shortfall = computed(() => {
    if (this.action() !== 'delivery') return 0;
    const value = this.collectedValue();
    if (value == null) return 0;
    return Math.max(0, this.expectedAmount() - value);
  });

  readonly overCollection = computed(() => {
    const value = this.collectedValue();
    return this.action() === 'delivery' && value != null && value > this.expectedAmount();
  });

  constructor() {
    queueMicrotask(() => this.collected.set(String(this.expectedAmount())));
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
    let collectedAmount: number | undefined;
    if (this.action() === 'delivery') {
      const value = this.collectedValue();
      if (value == null || value < 0 || value > COLLECTION_AMOUNT_MAX) {
        this.amountError.set('orders.collectedInvalid');
        return;
      }
      if (value < this.expectedAmount()) {
        this.amountError.set('orders.underCollection');
        return;
      }
      this.amountError.set('');
      collectedAmount = value;
    }
    const note = this.note().trim();
    this.confirmed.emit(note ? { reason, note, collectedAmount } : { reason, collectedAmount });
  }
}
