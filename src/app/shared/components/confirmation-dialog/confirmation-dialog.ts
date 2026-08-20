import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../i18n/language.service';
import { registerDialogOverlay } from '../dialog-layer';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './confirmation-dialog.css',
})
export class ConfirmationDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  private language = inject(LanguageService);
  private host = inject(ElementRef<HTMLElement>);

  @Input() title = '';
  @Input() message = '';
  @Input() confirmText = '';
  @Input() cancelText = '';
  @Input() type: 'danger' | 'warning' | 'info' = 'danger';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private unregisterOverlay: (() => void) | null = null;

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

  ngOnInit() {
    this.unregisterOverlay = registerDialogOverlay(() => this.onCancel());
  }

  ngAfterViewInit() {
    queueMicrotask(() => {
      const cancelBtn = this.host.nativeElement.querySelector('.btn-cancel') as HTMLButtonElement | null;
      cancelBtn?.focus();
    });
  }

  ngOnDestroy() {
    this.unregisterOverlay?.();
    this.unregisterOverlay = null;
  }

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }

  trapTab(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const root = this.host.nativeElement.querySelector('.dialog-container') as HTMLElement | null;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll(FOCUSABLE) as NodeListOf<HTMLElement>).filter(
      (el) => el.offsetParent !== null
    );
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === last) {
      first.focus();
      event.preventDefault();
    }
  }
}
