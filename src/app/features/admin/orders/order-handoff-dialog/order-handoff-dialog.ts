import { ChangeDetectionStrategy, Component, HostListener, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../i18n/language.service';
import { DriverCandidate } from '../../drivers/driver.models';
import { OrderDriverPickerComponent } from '../order-driver-picker/order-driver-picker';

export type OrderHandoffDialogMode = 'start' | 'cancel' | 'complete';

@Component({
  selector: 'app-order-handoff-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe, OrderDriverPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog-overlay" (click)="requestClose()">
      <div class="dialog-container" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" [attr.aria-labelledby]="'handoff-title'">
        <p class="badge">{{ 'orders.dashboardOverride' | t }}</p>
        <h3 id="handoff-title">{{ titleKey() | t }}</h3>
        <p>{{ hintKey() | t }}</p>
        @if (mode() === 'complete' && rollbackToPickup()) {
          <p class="warn">{{ 'orders.ops.handoffRollback' | t }}</p>
        }
        @if (mode() === 'start') {
          <app-order-driver-picker
            [excludeDriverId]="excludeDriverId()"
            [selectedId]="driver()?.driverId ?? null"
            [refreshToken]="refreshToken()"
            (denied)="denied.emit()"
            (picked)="onPick($event)"
          />
        }
        <label class="filter-field">
          <span class="filter-field__label">{{ 'orders.mutationReason' | t }}</span>
          <textarea rows="3" maxlength="1000" [ngModel]="reason()" (ngModelChange)="reason.set($event)"></textarea>
        </label>
        <label class="filter-field">
          <span class="filter-field__label">{{ 'orders.overrideNote' | t }}</span>
          <textarea rows="2" maxlength="1000" [ngModel]="note()" (ngModelChange)="note.set($event)"></textarea>
        </label>
        @if (error()) { <p class="err">{{ error() | t }}</p> }
        @if (uncertain()) { <p class="warn">{{ 'orders.uncertainResult' | t }}</p> }
        <div class="dialog-actions">
          <button type="button" class="dialog-btn btn-cancel" [disabled]="submitting()" (click)="requestClose()">{{ 'common.cancel' | t }}</button>
          <button type="button" class="dialog-btn btn-confirm" [disabled]="submitting()" (click)="submit()">{{ titleKey() | t }}</button>
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
export class OrderHandoffDialogComponent {
  private language = inject(LanguageService);
  readonly mode = input.required<OrderHandoffDialogMode>();
  readonly excludeDriverId = input<string | null>(null);
  readonly rollbackToPickup = input(false);
  readonly refreshToken = input(0);
  readonly submitting = input(false);
  readonly uncertain = input(false);
  readonly closed = output<void>();
  readonly denied = output<void>();
  readonly named = output<{ id: string; name: string }>();
  readonly confirmed = output<{ driverId?: string; reason: string; note?: string }>();

  readonly reason = signal('');
  readonly note = signal('');
  readonly driver = signal<DriverCandidate | null>(null);
  readonly error = signal('');

  onPick(row: DriverCandidate) {
    this.driver.set(row);
    this.named.emit({ id: row.driverId, name: row.driverName });
  }

  titleKey() {
    return `orders.ops.handoff.${this.mode()}`;
  }
  hintKey() {
    return `orders.ops.handoff.${this.mode()}.hint`;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.requestClose();
  }

  requestClose() {
    if (this.submitting()) return;
    if ((this.reason().trim() || this.note().trim() || this.driver()) && !window.confirm(this.language.t('orders.ops.discard'))) return;
    this.closed.emit();
  }

  submit() {
    const reason = this.reason().trim();
    if (!reason) {
      this.error.set('orders.reasonRequired');
      return;
    }
    if (this.mode() === 'start' && !this.driver()) {
      this.error.set('orders.ops.driverRequired');
      return;
    }
    this.error.set('');
    const note = this.note().trim();
    this.confirmed.emit({
      reason,
      ...(note ? { note } : {}),
      ...(this.driver() ? { driverId: this.driver()!.driverId } : {}),
    });
  }
}
