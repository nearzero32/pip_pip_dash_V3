import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

let nextSelectControlId = 0;

export interface SelectControlOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * A reusable, accessible select control for dashboard filters and forms.
 * It intentionally uses the native select element for keyboard and mobile support.
 */
@Component({
  selector: 'app-select-control',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-control.html',
  styleUrl: './select-control.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectControlComponent {
  private readonly generatedId = `select-control-${++nextSelectControlId}`;
  @Input() id = '';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() allowEmpty = false;
  @Input() value = '';
  @Input() options: readonly SelectControlOption[] = [];
  @Input() disabled = false;
  @Input() required = false;
  @Input() error = '';
  @Input() hint = '';

  @Output() valueChange = new EventEmitter<string>();

  change(event: Event) {
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }

  get controlId(): string {
    return this.id || this.generatedId;
  }

  get describedBy(): string | null {
    const ids = [this.hint ? `${this.controlId}-hint` : '', this.error ? `${this.controlId}-error` : '']
      .filter(Boolean)
      .join(' ');
    return ids || null;
  }
}
