import { ChangeDetectionStrategy, Component, HostListener, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../i18n/language.service';
import { DriverCandidate } from '../../drivers/driver.models';
import { OrderDriverPickerComponent } from '../order-driver-picker/order-driver-picker';
import { OrderAssignDriverBody } from '../orders.models';

@Component({
  selector: 'app-order-driver-assignment-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe, OrderDriverPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog-overlay" (click)="requestClose()">
      <div
        class="dialog-container"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-title"
      >
        <h3 id="assign-title">{{ 'orders.ops.assignManual' | t }}</h3>
        <p>{{ 'orders.ops.assignHint' | t }}</p>
        @if (hasOpenInitialSearch()) {
          <p class="warn">{{ 'orders.ops.assignClosesSearch' | t }}</p>
        }
        <app-order-driver-picker
          [selectedId]="driver()?.driverId ?? null"
          [refreshToken]="refreshToken()"
          (denied)="denied.emit()"
          (picked)="onPick($event)"
        />
        @if (driver(); as chosen) {
          <p><strong>{{ chosen.driverName }}</strong></p>
        }
        <label class="filter-field">
          <span class="filter-field__label">{{ 'orders.ops.reasonOptional' | t }}</span>
          <textarea rows="2" maxlength="1000" [ngModel]="reason()" (ngModelChange)="reason.set($event)"></textarea>
        </label>
        @if (error()) {
          <p class="err">{{ error() | t }}</p>
        }
        @if (uncertain()) {
          <p class="warn">{{ 'orders.uncertainResult' | t }}</p>
        }
        <div class="dialog-actions">
          <button type="button" class="dialog-btn btn-cancel" [disabled]="submitting()" (click)="requestClose()">
            {{ 'common.cancel' | t }}
          </button>
          <button type="button" class="dialog-btn btn-confirm" [disabled]="submitting()" (click)="submit()">
            {{ 'orders.ops.assignManual' | t }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .dialog-overlay { position: fixed; inset: 0; z-index: 160; background: var(--color-overlay); display: flex; align-items: center; justify-content: center; padding: var(--space-4); }
    .dialog-container { width: min(36rem, 100%); background: var(--color-surface-raised); border-radius: var(--radius-lg); padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-3); max-block-size: 90vh; overflow: auto; }
    textarea { width: 100%; font-family: inherit; }
    .err { color: var(--color-danger-text); margin: 0; }
    .warn { background: var(--color-warning-soft, #fff7ed); padding: var(--space-2); margin: 0; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
  `,
})
export class OrderDriverAssignmentDialogComponent {
  private language = inject(LanguageService);
  readonly hasOpenInitialSearch = input(false);
  readonly refreshToken = input(0);
  readonly submitting = input(false);
  readonly uncertain = input(false);
  readonly closed = output<void>();
  readonly denied = output<void>();
  readonly named = output<{ id: string; name: string }>();
  readonly confirmed = output<OrderAssignDriverBody>();

  readonly reason = signal('');
  readonly driver = signal<DriverCandidate | null>(null);
  readonly error = signal('');

  @HostListener('document:keydown.escape')
  onEscape() {
    this.requestClose();
  }

  onPick(row: DriverCandidate) {
    this.driver.set(row);
    this.error.set('');
    this.named.emit({ id: row.driverId, name: row.driverName });
  }

  requestClose() {
    if (this.submitting()) return;
    if ((this.reason().trim() || this.driver()) && !window.confirm(this.language.t('orders.ops.discard'))) {
      return;
    }
    this.closed.emit();
  }

  submit() {
    const chosen = this.driver();
    if (!chosen) {
      this.error.set('orders.ops.driverRequired');
      return;
    }
    const reason = this.reason().trim();
    this.confirmed.emit(reason ? { driverId: chosen.driverId, reason } : { driverId: chosen.driverId });
  }
}
