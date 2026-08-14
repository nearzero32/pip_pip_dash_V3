# Reusable Components Guide

## Overview
This guide explains how to use the reusable form dialog and confirmation dialog components across the application.

## 1. Form Dialog Component

### Location
`src/app/components/form-dialog/`

### Purpose
A reusable modal dialog for add/edit forms that follows the application's design system.

### Features
- ✅ Consistent pink gradient header with white text
- ✅ Support for multiple field types (text, number, date, textarea, select, checkbox, toggle)
- ✅ Automatic form validation
- ✅ Formatted input values (e.g., currency with commas)
- ✅ Conditional field display
- ✅ Custom icons for each field
- ✅ Responsive design
- ✅ Loading states

### Field Types

#### FormField Interface
```typescript
export interface FormField {
  name: string;              // Form control name
  label: string;             // Display label
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox' | 'toggle' | 'custom-select';
  placeholder?: string;      // Input placeholder
  icon?: string;             // SVG path for label icon
  required?: boolean;        // Is field required
  validators?: ValidatorFn[]; // Additional validators
  options?: any[];           // Options for select fields
  optionLabel?: string;      // Property name for option label
  optionValue?: string;      // Property name for option value
  formatter?: (value: any) => any;  // Format display value
  parser?: (value: any) => any;     // Parse value before submit
  defaultValue?: any;        // Default value
  width?: 'half' | 'full';   // Grid width
  conditionalDisplay?: (formValue: any) => boolean; // Show/hide logic
  hint?: string;             // Optional hint text
}
```

### Example Usage: Expense Service

**In Component TypeScript:**

```typescript
import { FormDialogComponent, FormField } from '../../components/form-dialog/form-dialog';
import { Validators } from '@angular/forms';

export class ExpensesServicesComponent {
  // ... other code ...

  showFormDialog = signal<boolean>(false);
  selectedItem = signal<ExpenseService | null>(null);
  isSubmitting = signal<boolean>(false);

  // Define form fields
  formFields: FormField[] = [
    {
      name: 'name',
      label: 'اسم الخدمة',
      type: 'text',
      icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>',
      placeholder: 'مثال: فواتير الكهرباء',
      required: true,
      validators: [Validators.minLength(2)],
      width: 'half'
    },
    {
      name: 'price',
      label: 'السعر',
      type: 'number',
      icon: '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>',
      placeholder: '0',
      required: true,
      validators: [Validators.min(0)],
      width: 'half',
      formatter: (value: any) => {
        if (!value) return '';
        const num = value.toString().replace(/[^0-9]/g, '');
        return num ? parseInt(num, 10).toLocaleString('en-US') : '';
      },
      parser: (value: any) => {
        return parseInt(value.toString().replace(/,/g, ''), 10);
      }
    },
    {
      name: 'note',
      label: 'ملاحظات',
      type: 'textarea',
      icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><line x1="16" y1="13" x2="8" y2="13"></line>',
      placeholder: 'أضف ملاحظات إضافية...',
      required: false,
      width: 'full'
    }
  ];

  openAddModal(item: ExpenseService | null = null) {
    this.selectedItem.set(item);
    this.showFormDialog.set(true);
  }

  async handleFormSubmit(formData: any) {
    this.isSubmitting.set(true);
    
    try {
      let response;
      const item = this.selectedItem();
      
      if (item?._id) {
        // Edit
        response = await this.apiService.editExpenses({
          _id: item._id,
          ...formData
        });
      } else {
        // Add
        response = await this.apiService.addExpenses(formData);
      }

      this.notificationService.handleApiResponse(response);
      
      if (response && response.data && !response.data.error) {
        this.showFormDialog.set(false);
        this.selectedItem.set(null);
        this.fetchData();
      }
    } catch (error) {
      this.notificationService.error('حدث خطأ');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  closeFormDialog() {
    this.showFormDialog.set(false);
    this.selectedItem.set(null);
  }
}
```

**In Component Template:**

```html
@if (showFormDialog()) {
  <app-form-dialog
    [title]="selectedItem() ? 'تعديل خدمة المصروف' : 'إضافة خدمة مصروف جديدة'"
    [fields]="formFields"
    [initialData]="selectedItem()"
    [isSubmitting]="isSubmitting()"
    [submitButtonText]="selectedItem() ? 'تحديث' : 'حفظ'"
    (onClose)="closeFormDialog()"
    (onSubmit)="handleFormSubmit($event)"
  ></app-form-dialog>
}
```

---

## 2. Confirmation Dialog Component

### Location
`src/app/components/confirmation-dialog/`

### Purpose
A reusable confirmation dialog for delete and other dangerous actions.

### Features
- ✅ Three types: danger (red), warning (orange), info (blue)
- ✅ Animated icon
- ✅ Custom title and message
- ✅ Custom button text
- ✅ Backdrop with blur effect

### Example Usage

**In Component TypeScript:**

```typescript
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog';

export class ExpensesServicesComponent {
  showDeleteDialog = signal<boolean>(false);
  itemToDelete = signal<ExpenseService | null>(null);

  onDelete(item: ExpenseService) {
    this.itemToDelete.set(item);
    this.showDeleteDialog.set(true);
  }

  async confirmDelete() {
    const item = this.itemToDelete();
    if (!item) return;

    this.showDeleteDialog.set(false);
    
    try {
      const response = await this.apiService.removeExpenses(item._id!);
      this.notificationService.handleApiResponse(response);
      
      if (response && response.data && !response.data.error) {
        this.fetchData();
      }
    } catch (error) {
      this.notificationService.error('حدث خطأ');
    } finally {
      this.itemToDelete.set(null);
    }
  }

  cancelDelete() {
    this.showDeleteDialog.set(false);
    this.itemToDelete.set(null);
  }
}
```

**In Component Template:**

```html
@if (showDeleteDialog()) {
  <app-confirmation-dialog
    [title]="'تأكيد الحذف'"
    [message]="'هل أنت متأكد من حذف هذه الخدمة؟'"
    [confirmText]="'حذف'"
    [cancelText]="'إلغاء'"
    [type]="'danger'"
    (confirm)="confirmDelete()"
    (cancel)="cancelDelete()"
  ></app-confirmation-dialog>
}
```

---

## 3. Advanced Form Examples

### Example: Conditional Fields

```typescript
formFields: FormField[] = [
  {
    name: 'is_dollar',
    label: 'بالدولار',
    type: 'toggle',
    defaultValue: false,
    width: 'half'
  },
  {
    name: 'exchange_rate',
    label: 'سعر الصرف',
    type: 'number',
    placeholder: '1',
    required: true,
    width: 'half',
    conditionalDisplay: (formValue) => formValue.is_dollar === true
  }
];
```

### Example: Select Field with Custom Options

```typescript
formFields: FormField[] = [
  {
    name: 'service_id',
    label: 'الخدمة',
    type: 'select',
    required: true,
    options: this.services, // Array of objects
    optionLabel: 'name',    // Property to display
    optionValue: '_id',     // Property for value
    placeholder: 'اختر الخدمة',
    width: 'full'
  }
];
```

---

## Benefits of Using Reusable Components

1. **Consistency**: All forms follow the same design system
2. **Maintainability**: Update once, apply everywhere
3. **Reduced Code**: Less duplication across pages
4. **Type Safety**: TypeScript interfaces ensure correct usage
5. **Validation**: Built-in form validation
6. **Accessibility**: Proper ARIA labels and keyboard navigation
7. **Responsive**: Works on all screen sizes

---

## Migration Checklist

When migrating an existing add/edit modal to use the form dialog:

- [ ] Import `FormDialogComponent` and `FormField`
- [ ] Define form fields array with proper configuration
- [ ] Replace custom modal HTML with `<app-form-dialog>`
- [ ] Update submit handler to receive `formData` event
- [ ] Remove old modal component files
- [ ] Test add, edit, and validation scenarios
- [ ] Verify mobile responsiveness

---

## Notes

- All icons use the primary pink accent color (`#A21D58`)
- Header background uses pink gradient
- Form supports up to 3 columns on desktop
- Automatically formats currency values
- Handles loading states with spinner
- Close on backdrop click
- ESC key closes dialog

