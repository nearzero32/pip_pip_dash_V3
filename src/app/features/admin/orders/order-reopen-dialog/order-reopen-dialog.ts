import { ChangeDetectionStrategy, Component, HostListener, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../i18n/language.service';
import { DriverCandidate } from '../../drivers/driver.models';
import { OrderDriverPickerComponent } from '../order-driver-picker/order-driver-picker';
import { OrderReopenBody } from '../orders.models';

type ReopenNext = OrderReopenBody['nextAction'];

@Component({
  selector: 'app-order-reopen-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe, OrderDriverPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog-overlay" (click)="requestClose()">
      <div class="dialog-container" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="reopen-title">
        <h3 id="reopen-title">{{ 'orders.ops.reopenTitle' | t }}</h3>
        <div class="choices">
          @if (allowKeepCancelled()) {
            <button type="button" class="choice" [class.choice--on]="nextAction() === 'KEEP_CANCELLED'" (click)="nextAction.set('KEEP_CANCELLED')">
              <strong>{{ 'orders.ops.reopen.KEEP_CANCELLED' | t }}</strong>
              <span>{{ 'orders.ops.reopen.KEEP_CANCELLED.hint' | t }}</span>
            </button>
          }
          <button type="button" class="choice" [class.choice--on]="nextAction() === 'PREPARE'" (click)="nextAction.set('PREPARE')">
            <strong>{{ 'orders.ops.reopen.PREPARE' | t }}</strong>
            <span>{{ 'orders.ops.reopen.PREPARE.hint' | t }}</span>
          </button>
          <button type="button" class="choice" [class.choice--on]="nextAction() === 'REOFFER'" (click)="nextAction.set('REOFFER')">
            <strong>{{ 'orders.ops.reopen.REOFFER' | t }}</strong>
            <span>{{ 'orders.ops.reopen.REOFFER.hint' | t }}</span>
          </button>
          <button type="button" class="choice" [class.choice--on]="nextAction() === 'ASSIGN_DRIVER'" (click)="nextAction.set('ASSIGN_DRIVER')">
            <strong>{{ 'orders.ops.reopen.ASSIGN_DRIVER' | t }}</strong>
            <span>{{ 'orders.ops.reopen.ASSIGN_DRIVER.hint' | t }}</span>
          </button>
        </div>
        @if (reofferDenied() && nextAction() === 'REOFFER') {
          <p class="warn">{{ 'orders.ops.reofferDenied' | t }}</p>
        }
        @if (nextAction() === 'ASSIGN_DRIVER') {
          <app-order-driver-picker
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
          <button type="button" class="dialog-btn btn-confirm" [disabled]="submitting() || (reofferDenied() && nextAction() === 'REOFFER')" (click)="submit()">
            {{ 'orders.ops.reopenTitle' | t }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .dialog-overlay { position: fixed; inset: 0; z-index: 160; background: var(--color-overlay); display: flex; align-items: center; justify-content: center; padding: var(--space-4); }
    .dialog-container { width: min(38rem, 100%); background: var(--color-surface-raised); border-radius: var(--radius-lg); padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-3); max-block-size: 90vh; overflow: auto; }
    textarea { width: 100%; font-family: inherit; }
    .choices { display: grid; gap: var(--space-2); }
    .choice { text-align: start; display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-3); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-surface); }
    .choice--on { border-color: var(--color-brand-primary); }
    .err { color: var(--color-danger-text); margin: 0; }
    .warn { background: var(--color-warning-soft, #fff7ed); padding: var(--space-2); margin: 0; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
  `,
})
export class OrderReopenDialogComponent {
  private language = inject(LanguageService);
  readonly allowKeepCancelled = input(false);
  readonly reofferDenied = input(false);
  readonly refreshToken = input(0);
  readonly submitting = input(false);
  readonly uncertain = input(false);
  readonly closed = output<void>();
  readonly denied = output<void>();
  readonly named = output<{ id: string; name: string }>();
  readonly confirmed = output<OrderReopenBody>();

  readonly nextAction = signal<ReopenNext>('PREPARE');
  readonly reason = signal('');
  readonly note = signal('');
  readonly driver = signal<DriverCandidate | null>(null);
  readonly error = signal('');

  onPick(row: DriverCandidate) {
    this.driver.set(row);
    this.named.emit({ id: row.driverId, name: row.driverName });
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
    const nextAction = this.nextAction();
    if (nextAction === 'ASSIGN_DRIVER' && !this.driver()) {
      this.error.set('orders.ops.driverRequired');
      return;
    }
    this.error.set('');
    const note = this.note().trim();
    this.confirmed.emit({
      reason,
      nextAction,
      ...(note ? { note } : {}),
      ...(nextAction === 'ASSIGN_DRIVER' && this.driver() ? { driverId: this.driver()!.driverId } : {}),
    });
  }
}
