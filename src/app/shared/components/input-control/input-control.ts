import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, forwardRef, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
let nextInputControlId = 0;
@Component({ selector: 'app-input-control', standalone: true, imports: [CommonModule], templateUrl: './input-control.html', styleUrl: './input-control.css', changeDetection: ChangeDetectionStrategy.OnPush, providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InputControlComponent), multi: true }] })
export class InputControlComponent implements ControlValueAccessor {
  private readonly generatedId = `input-control-${++nextInputControlId}`;
  private readonly cdr = inject(ChangeDetectorRef);
  private onControlChange: (value: string) => void = () => undefined;
  private onControlTouched: () => void = () => undefined;
  @Input() id = '';
  @Input() label = '';
  @Input() value: string | number | null = '';
  @Input() type: 'text' | 'number' | 'time' | 'search' = 'text';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() error = '';
  @Input() hint = '';
  @Output() valueChange = new EventEmitter<string>();
  get controlId() { return this.id || this.generatedId; }
  get describedBy() { return [this.hint ? `${this.controlId}-hint` : '', this.error ? `${this.controlId}-error` : ''].filter(Boolean).join(' ') || null; }
  change(event: Event) { const value = (event.target as HTMLInputElement).value; this.value = value; this.onControlChange(value); this.valueChange.emit(value); }
  touch() { this.onControlTouched(); }
  writeValue(value: string | number | null): void { this.value = value ?? ''; this.cdr.markForCheck(); }
  registerOnChange(fn: (value: string) => void): void { this.onControlChange = fn; }
  registerOnTouched(fn: () => void): void { this.onControlTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; this.cdr.markForCheck(); }
}
