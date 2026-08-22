import { ValidatorFn } from '@angular/forms';

export interface FormOption {
  value: string | number | boolean;
  label: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'textarea' | 'select' | 'file' | 'map' | 'boundary-map';
  placeholder?: string;
  icon?: string; // SVG path
  required?: boolean;
  validators?: ValidatorFn[];
  options?: any[]; // For select fields (supports FormOption or custom objects)
  optionLabel?: string; // Property name for option label
  optionValue?: string; // Property name for option value
  formatter?: (value: any) => any; // For formatting display values
  parser?: (value: any) => any; // For parsing form values before submit
  defaultValue?: any;
  width?: 'half' | 'full'; // Grid width
  conditionalDisplay?: (formValue: any) => boolean; // Show/hide based on other fields
  hint?: string; // Optional hint text
  helpText?: string; // Optional explanation revealed from a help button beside the label
  /** Form control names filled when type is `map`. */
  latitudeField?: string;
  longitudeField?: string;
  /** Optional zero-based wizard step. */
  step?: number;
}
