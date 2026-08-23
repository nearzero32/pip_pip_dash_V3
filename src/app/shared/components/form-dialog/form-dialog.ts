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
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField } from '../../models/form-field.interface';
import { LanguageService } from '../../../i18n/language.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { LocationPickerMapComponent, MapPoint } from '../location-picker-map/location-picker-map';
import { CityBoundaryMapComponent } from '../city-boundary-map/city-boundary-map';
import { SelectControlComponent, SelectControlOption } from '../select-control/select-control';
import { registerDialogOverlay } from '../dialog-layer';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PASSWORD_CHARACTER_SETS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%^&*_-+=',
];
const PASSWORD_ALPHABET = PASSWORD_CHARACTER_SETS.join('');

@Component({
  selector: 'app-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, LocationPickerMapComponent, CityBoundaryMapComponent, SelectControlComponent],
  templateUrl: './form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './form-dialog.css',
})
export class FormDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() title: string = '';
  @Input() fields: FormField[] = [];
  @Input() initialData: any = null;
  @Input() isSubmitting: boolean = false;
  @Input() submitButtonText: string = '';
  @Input() cancelButtonText: string = '';
  @Input() steps: string[] = [];
  /** Enables the shared modern select control without changing legacy forms. */
  @Input() modernSelect = false;

  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<any>();
  @Output() onFieldChange = new EventEmitter<{ fieldName: string; value: any; formValue: any }>();

  private fb = inject(FormBuilder);
  private language = inject(LanguageService);
  private host = inject(ElementRef<HTMLElement>);

  form!: FormGroup;
  readonly visiblePasswords = signal<ReadonlySet<string>>(new Set());
  readonly generatedPasswordField = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly openFieldHelp = signal<string | null>(null);
  readonly activeStep = signal(0);
  readonly filePreviews = signal<Record<string, string>>({});

  private unregisterOverlay: (() => void) | null = null;

  ngOnInit() {
    if (!this.title) this.title = this.language.t('common.add');
    if (!this.submitButtonText) this.submitButtonText = this.language.t('common.save');
    if (!this.cancelButtonText) this.cancelButtonText = this.language.t('common.cancel');
    this.initializeForm();
    this.unregisterOverlay = registerDialogOverlay(() => this.close());
  }

  ngAfterViewInit() {
    queueMicrotask(() => this.focusFirstField());
  }

  ngOnDestroy() {
    this.unregisterOverlay?.();
    this.unregisterOverlay = null;
    Object.values(this.filePreviews()).forEach((url) => URL.revokeObjectURL(url));
  }

  initializeForm() {
    const formControls: any = {};

    this.fields.forEach((field) => {
    if (field.type === 'map') return;

      const validators = [...(field.validators || [])];
      if (field.required) {
        validators.push(Validators.required);
      }

      let initialValue = field.defaultValue;
      if (this.initialData && this.initialData[field.name] !== undefined) {
        initialValue = this.initialData[field.name];
        if (field.formatter) {
          initialValue = field.formatter(initialValue);
        }
      }

      initialValue = initialValue !== undefined && initialValue !== null ? initialValue : field.type === 'multiselect' ? [] : '';
      formControls[field.name] = [initialValue, validators];
    });

    this.form = this.fb.group(formControls);
  }

  shouldShowField(field: FormField): boolean {
    if (this.steps.length && field.step !== undefined && field.step !== this.activeStep()) return false;
    if (!field.conditionalDisplay) return true;
    return field.conditionalDisplay(this.form?.value);
  }

  getFieldWidth(field: FormField): string {
    if (field.type === 'map' || field.type === 'boundary-map') return 'full-width';
    return field.width === 'full' ? 'full-width' : '';
  }

  hasMapField(): boolean {
    return this.fields.some((field) => field.type === 'map' || field.type === 'boundary-map');
  }

  mapLatitudeField(field: FormField): string {
    return field.latitudeField || 'latitude';
  }

  mapLongitudeField(field: FormField): string {
    return field.longitudeField || 'longitude';
  }

  onMapLocation(field: FormField, point: MapPoint) {
    this.updateFieldValue(this.mapLatitudeField(field), point.latitude);
    this.updateFieldValue(this.mapLongitudeField(field), point.longitude);
    this.onFieldChange.emit({
      fieldName: field.name,
      value: point,
      formValue: this.form.value,
    });
  }

  isInvalid(field: FormField): boolean {
    if (field.type === 'map') return false;
    const control = this.form.get(field.name);
    return !!control && control.invalid && (control.touched || this.submitted());
  }

  errorId(fieldName: string): string {
    return `field-error-${fieldName}`;
  }

  hintId(fieldName: string): string {
    return `field-hint-${fieldName}`;
  }

  onFileChange(field: FormField, file: File | undefined) {
    const previous = this.filePreviews()[field.name];
    if (previous) URL.revokeObjectURL(previous);
    this.filePreviews.update((current) => ({
      ...current,
      ...(file ? { [field.name]: URL.createObjectURL(file) } : { [field.name]: '' }),
    }));
    this.form.get(field.name)?.setValue(file ?? null);
    this.form.get(field.name)?.markAsTouched();
    this.onFieldChange.emit({ fieldName: field.name, value: file ?? null, formValue: this.form.value });
  }

  clearFile(field: FormField) {
    const previous = this.filePreviews()[field.name];
    if (previous) URL.revokeObjectURL(previous);
    this.filePreviews.update((current) => ({ ...current, [field.name]: '' }));
    this.form.get(field.name)?.setValue(null);
    this.form.get(field.name)?.markAsTouched();
  }

  helpId(fieldName: string): string {
    return `field-help-${fieldName}`;
  }

  toggleFieldHelp(fieldName: string) {
    this.openFieldHelp.update((current) => (current === fieldName ? null : fieldName));
  }

  describedBy(field: FormField): string | null {
    const parts: string[] = [];
    if (this.isInvalid(field)) parts.push(this.errorId(field.name));
    if (field.hint && field.type !== 'map') parts.push(this.hintId(field.name));
    return parts.length ? parts.join(' ') : null;
  }

  inputType(field: FormField): string {
    if (field.type === 'password') return this.passwordVisible(field.name) ? 'text' : 'password';
    if (field.name.toLowerCase().includes('email')) return 'email';
    if (field.name.toLowerCase().includes('phone')) return 'tel';
    return 'text';
  }

  inputMode(field: FormField): string | null {
    if (field.type === 'number') return 'decimal';
    if (field.name.toLowerCase().includes('email')) return 'email';
    if (field.name.toLowerCase().includes('phone')) return 'tel';
    return null;
  }

  autocomplete(field: FormField): string {
    if (field.type === 'password') return 'new-password';
    if (field.name.toLowerCase().includes('email')) return 'email';
    if (field.name.toLowerCase().includes('phone')) return 'tel';
    if (field.name.toLowerCase().includes('name')) return 'name';
    return 'off';
  }

  handleSubmit() {
    this.submitted.set(true);
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
      queueMicrotask(() => this.focusFirstInvalid());
      return;
    }

    let formData = { ...this.form.value };

    this.fields.forEach((field) => {
      if (field.parser && formData[field.name] !== undefined) {
        formData[field.name] = field.parser(formData[field.name]);
      }
    });

    this.onSubmit.emit(formData);
  }

  close() {
    if (this.isSubmitting) return;
    this.onClose.emit();
  }

  trapTab(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const root = this.host.nativeElement.querySelector('.modal-content') as HTMLElement | null;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll(FOCUSABLE) as NodeListOf<HTMLElement>).filter(
      (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
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

  passwordVisible(fieldName: string): boolean {
    return this.visiblePasswords().has(fieldName);
  }

  togglePassword(fieldName: string) {
    this.visiblePasswords.update((visible) => {
      const next = new Set(visible);
      if (next.has(fieldName)) next.delete(fieldName);
      else next.add(fieldName);
      return next;
    });
  }

  isLastStep(): boolean { return this.activeStep() >= this.steps.length - 1; }
  nextStep() {
    const current = this.fields.filter((field) => field.type !== 'map' && field.step === this.activeStep());
    current.forEach((field) => this.form.get(field.name)?.markAsTouched());
    if (current.some((field) => this.form.get(field.name)?.invalid)) return;
    this.activeStep.update((step) => Math.min(step + 1, this.steps.length - 1));
    queueMicrotask(() => this.focusFirstField());
  }
  previousStep() { this.activeStep.update((step) => Math.max(0, step - 1)); }

  generatePassword(fieldName: string) {
    if (!globalThis.crypto?.getRandomValues) return;

    const length = 20;
    const random = new Uint32Array(length * 2);
    globalThis.crypto.getRandomValues(random);
    const password = PASSWORD_CHARACTER_SETS.map(
      (characters, index) => characters[random[index]! % characters.length]!,
    );
    for (let index = password.length; index < length; index++) {
      password.push(PASSWORD_ALPHABET[random[index]! % PASSWORD_ALPHABET.length]!);
    }
    for (let index = password.length - 1; index > 0; index--) {
      const swapIndex = random[length + index]! % (index + 1);
      [password[index], password[swapIndex]] = [password[swapIndex]!, password[index]!];
    }

    const control = this.form.get(fieldName);
    control?.setValue(password.join(''));
    control?.markAsDirty();
    control?.markAsTouched();
    this.visiblePasswords.update((visible) => new Set([...visible, fieldName]));
    this.generatedPasswordField.set(fieldName);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);

    if (control?.hasError('required')) {
      return this.language.t('common.required');
    }
    if (control?.hasError('minlength')) {
      return this.language.t('common.tooShort');
    }
    if (control?.hasError('min')) {
      return this.language.t('common.tooSmall');
    }
    if (control?.hasError('email')) {
      return this.language.t('common.invalidEmail');
    }
    if (control?.hasError('pattern')) {
      return this.language.t('common.invalidFormat');
    }
    return '';
  }

  formatValue(event: any, field: FormField) {
    if (field.formatter) {
      const input = event.target;
      const formattedValue = field.formatter(input.value);
      input.value = formattedValue;
      this.form.get(field.name)?.setValue(formattedValue, { emitEvent: false });
    }
  }

  onFieldValueChange(fieldName: string, value: any) {
    this.form.get(fieldName)?.setValue(value);
    const field = this.fields.find((item) => item.name === fieldName);
    for (const dependentField of field?.resetWhen ?? []) {
      this.form.get(dependentField)?.setValue([]);
      this.form.get(dependentField)?.markAsDirty();
    }

    this.onFieldChange.emit({
      fieldName,
      value,
      formValue: this.form.value,
    });
  }

  onMultiSelectChange(fieldName: string, event: Event) {
    const values = Array.from((event.target as HTMLSelectElement).selectedOptions, (option) => option.value);
    this.onFieldValueChange(fieldName, values);
  }

  isMultiOptionSelected(fieldName: string, value: string | number | boolean): boolean {
    const selected = this.form.get(fieldName)?.value;
    return Array.isArray(selected) && selected.map(String).includes(String(value));
  }

  selectOptions(field: FormField): readonly SelectControlOption[] {
    return (field.options ?? []).map((option) => ({
      value: String(option[field.optionValue || 'value']),
      label: String(option[field.optionLabel || 'label']),
      disabled: Boolean(option.disabled),
    }));
  }

  toggleMultiOption(fieldName: string, value: string | number | boolean, checked: boolean) {
    const existing = this.form.get(fieldName)?.value;
    const selected = Array.isArray(existing) ? existing.map(String) : [];
    const next = checked ? [...new Set([...selected, String(value)])] : selected.filter((item) => item !== String(value));
    this.onFieldValueChange(fieldName, next);
    this.form.get(fieldName)?.markAsTouched();
  }

  updateFieldValue(fieldName: string, value: any) {
    const control = this.form.get(fieldName);
    if (control) {
      const field = this.fields.find((item) => item.name === fieldName);
      const formattedValue = field?.formatter ? field.formatter(value) : value;
      control.setValue(formattedValue);
      control.markAsDirty();
      control.markAsTouched();
    }
  }

  private focusFirstField() {
    const root = this.host.nativeElement.querySelector('.modal-body') as HTMLElement | null;
    const first = root?.querySelector('input, select, textarea') as HTMLElement | null;
    first?.focus();
  }

  private focusFirstInvalid() {
    const root = this.host.nativeElement.querySelector('.modal-body') as HTMLElement | null;
    const invalid = root?.querySelector('.form-input.ng-invalid, .form-select.ng-invalid') as HTMLElement | null;
    invalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    invalid?.focus();
  }
}
