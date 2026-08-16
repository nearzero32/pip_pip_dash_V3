import { Component, EventEmitter, Input, Output, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField } from '../../models/form-field.interface';
import { LanguageService } from '../../../i18n/language.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';

@Component({
  selector: 'app-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './form-dialog.css'
})
export class FormDialogComponent implements OnInit {
  @Input() title: string = '';
  @Input() fields: FormField[] = [];
  @Input() initialData: any = null;
  @Input() isSubmitting: boolean = false;
  @Input() submitButtonText: string = '';
  @Input() cancelButtonText: string = '';

  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<any>();
  @Output() onFieldChange = new EventEmitter<{ fieldName: string, value: any, formValue: any }>();

  private fb = inject(FormBuilder);
  private language = inject(LanguageService);

  form!: FormGroup;

  ngOnInit() {
    if (!this.title) this.title = this.language.t('common.add');
    if (!this.submitButtonText) this.submitButtonText = this.language.t('common.save');
    if (!this.cancelButtonText) this.cancelButtonText = this.language.t('common.cancel');
    this.initializeForm();
  }

  initializeForm() {
    const formControls: any = {};

    this.fields.forEach(field => {
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

      initialValue = initialValue !== undefined && initialValue !== null ? initialValue : '';
      formControls[field.name] = [initialValue, validators];
    });

    this.form = this.fb.group(formControls);
  }

  shouldShowField(field: FormField): boolean {
    if (!field.conditionalDisplay) return true;
    return field.conditionalDisplay(this.form?.value);
  }

  getFieldWidth(field: FormField): string {
    return field.width === 'full' ? 'full-width' : '';
  }

  handleSubmit() {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    let formData = { ...this.form.value };

    // Apply parsers to convert display values back to data values
    this.fields.forEach(field => {
      if (field.parser && formData[field.name] !== undefined) {
        formData[field.name] = field.parser(formData[field.name]);
      }
    });

    this.onSubmit.emit(formData);
  }

  close() {
    this.onClose.emit();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    const field = this.fields.find(f => f.name === fieldName);

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

    this.onFieldChange.emit({
      fieldName,
      value,
      formValue: this.form.value
    });
  }

  // Public method to update form field values from parent component
  updateFieldValue(fieldName: string, value: any) {
    const control = this.form.get(fieldName);
    if (control) {
      // Apply formatter if exists
      const field = this.fields.find(f => f.name === fieldName);
      const formattedValue = field?.formatter ? field.formatter(value) : value;
      control.setValue(formattedValue);
    }
  }
}
