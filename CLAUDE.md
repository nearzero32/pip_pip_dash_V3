# Lamassu Accounting Dashboard — Angular 21

> See also `../CLAUDE.md` for shared API contract and entity list.

## Stack

| Tool | Version | Role |
|---|---|---|
| Angular | 21.0.0 | Framework (Standalone Components + Signals) |
| Angular CLI | 21.0.4 | Build tool |
| TypeScript | 5.9.2 | Language |
| Axios | 1.13.2 | HTTP client |
| crypto-js | 4.2.0 | SHA-512 password hashing |
| Angular CDK | 21.0.5 | Component utilities |
| RxJS | 7.8.x | Used minimally |

## Dev Commands

```bash
npm start          # ng serve — dev server
npm run build      # ng build — production build
npm run watch      # ng build --watch --configuration development
npm test           # ng test
```

## Directory Structure

```
src/app/
  core/
    axios.instance.ts        # Axios instance: base URL, JWT interceptor, 401/403 handlers
  services/
    api.service.ts           # All API calls — one injectable service
    notification.service.ts  # Signal-based toast notifications
    layout.service.ts        # Responsive sidebar state
  interfaces/                # TypeScript data models for all entities
  components/                # Reusable UI components
    form-dialog/             # FormDialogComponent — universal add/edit modal
    confirmation-dialog/     # ConfirmationDialogComponent — delete confirmations
    table/                   # TableComponent — paginated data table
    sidebar/                 # Navigation sidebar
    statistics/              # Stats cards (per entity)
    date-filter/             # Date range filter
    select-filter/           # Dropdown filter
    export-button/           # Excel export trigger
    image-upload/            # Image upload with preview
    notification-toast/      # Toast display component
    vouchers/                # Print layouts (expense, salary, bill)
  layouts/
    dashboard-layout/        # Authenticated shell (sidebar + router-outlet)
  pages/
    login/                   # /login
    home/                    # /dashboard/home
    employees/               # /dashboard/employees
    customers/               # /dashboard/customers
    services/                # /dashboard/services
    salaries/                # /dashboard/salaries
    salary-services/         # /dashboard/salary-services
    expenses/                # /dashboard/expenses
    expenses-services/       # /dashboard/expenses-services
    bills/                   # /dashboard/bills
    investment-bills/        # /dashboard/investment-bills
    subscriptions/           # /dashboard/subscriptions
    residential/             # /dashboard/subscriptions/residential
    reports/                 # /dashboard/reports
    print-expense/           # /print/expense/:id
    print-salary/            # /print/salary/:id
    print-bill/              # /print/bill/:id
    placeholder/             # Placeholder for unbuilt pages
```

## HTTP Layer — `src/app/core/axios.instance.ts`

```typescript
baseURL: "https://api.lamassu.co.uk/api/dash"
timeout: 100000
```

**Request interceptor:** reads `localStorage.accessToken`, sets `Authorization: <token>` (no Bearer prefix).

**Response interceptor:**
- `401` → removes `accessToken`, `user`, `results` from localStorage, sets `reloaded=false`, `window.location.href = '/login'`
- `403` with `"not authorized to access this route"` → stores message in `localStorage.unauthorized_message`, `window.location.href = '/errors/unauthorized'`

## Services

### `ApiService` — `src/app/services/api.service.ts`

Single injectable class with one method per API operation. All methods are `async` and return the raw Axios response object. Always check `response.data.error` for success/failure.

```typescript
private apiService = inject(ApiService);
const response = await this.apiService.getEmployees({ options: { page: 1, limit: 10, search: '', isDeleted: false } });
if (!response.data.error) { /* success */ }
```

**Available method groups:** auth, employees, customers, services, salaries, countingServiceSalaries, expenses, expensesServices, bills, investmentBills, invoicesTracking, residentialStats, accountingStats/reports.

### `NotificationService` — `src/app/services/notification.service.ts`

Signal-based toast notifications.

```typescript
private notificationService = inject(NotificationService);

this.notificationService.handleApiResponse(response); // reads error + message from API envelope
this.notificationService.success('تمت العملية بنجاح');
this.notificationService.error('حدث خطأ');
```

Always call `handleApiResponse()` after every API call so the user sees feedback.

### `LayoutService` — `src/app/services/layout.service.ts`

Manages sidebar open/close state and responsive breakpoints.

## Reusable Components

### `FormDialogComponent` — `src/app/components/form-dialog/`

Universal modal for add and edit forms. Define a `FormField[]` array and pass it in. Full reference in `REUSABLE_COMPONENTS_GUIDE.md`.

**Supported `type` values:** `text`, `number`, `date`, `textarea`, `select`, `custom-select`, `checkbox`, `toggle`, `image-upload`

**Key `FormField` properties:**
```typescript
interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  validators?: ValidatorFn[];
  options?: any[];            // for select
  optionLabel?: string;       // property to display in options
  optionValue?: string;       // property to use as value
  formatter?: (value) => any; // display formatting (e.g. currency commas)
  parser?: (value) => any;    // parse before submit (e.g. strip commas → number)
  conditionalDisplay?: (formValue) => boolean; // show/hide based on other fields
  width?: 'half' | 'full';
  defaultValue?: any;
}
```

**Template:**
```html
@if (showFormDialog()) {
  <app-form-dialog
    [title]="selectedItem() ? 'تعديل' : 'إضافة'"
    [fields]="formFields"
    [initialData]="selectedItem()"
    [isSubmitting]="isSubmitting()"
    [submitButtonText]="selectedItem() ? 'تحديث' : 'حفظ'"
    (onClose)="closeFormDialog()"
    (onSubmit)="handleFormSubmit($event)"
  ></app-form-dialog>
}
```

### `ConfirmationDialogComponent` — `src/app/components/confirmation-dialog/`

Three types: `'danger'` (red), `'warning'` (orange), `'info'` (blue).

```html
@if (showDeleteDialog()) {
  <app-confirmation-dialog
    [title]="'تأكيد الحذف'"
    [message]="'هل أنت متأكد من حذف هذا العنصر؟'"
    [confirmText]="'حذف'"
    [cancelText]="'إلغاء'"
    [type]="'danger'"
    (confirm)="confirmDelete()"
    (cancel)="cancelDelete()"
  ></app-confirmation-dialog>
}
```

### `TableComponent` — `src/app/components/table/`

Handles pagination, search, sorting, and row actions (edit, delete, restore).

## Interfaces (Data Models)

All entities use `_id: string` (MongoDB ObjectId). Key models in `src/app/interfaces/`:

| Interface | Key Fields |
|---|---|
| Employee | name, phone, jop_title, salary, start_date, address |
| Customer | name, phone, email, address |
| Bill | bill_id, customer_id, customer_info, services_info[], total_amount, date |
| Expense | name, money, date, is_dollar, exchange_rate, service_id, invoice_number |
| Salary | account_id, salary_id, amount, payment_date, discounts[], additional[] |
| ExpenseService / SalaryService | name, price, note |
| InvestmentBill | investment-specific billing fields |
| Service | name, price, note |

## Coding Conventions

- All components are **standalone** — no NgModules ever
- Use Angular **Signals** (`signal()`, `computed()`) for all reactive state — avoid `Subject`/`BehaviorSubject`
- Use `inject()` for dependency injection — not constructor injection
- Use **Reactive Forms** (`FormBuilder`, `FormGroup`) for all forms
- Password must be **SHA-512 hashed** via `crypto-js` before calling `apiService.login()`
- Always call `notificationService.handleApiResponse()` after every API call
- All labels and messages are in **Arabic**
- Primary accent color: `#A21D58` (pink) — form dialog headers, icon highlights
- All page components must be **lazy-loaded** in the router
- Prettier: `printWidth: 100`, `singleQuote: true`

## Adding a New Page

1. Create `src/app/pages/<feature>/<feature>.ts` + `.html` + `.scss` as a standalone component
2. Add a lazy-loaded route in `src/app/app.routes.ts`
3. Add a nav item in `SidebarComponent`
4. Use `FormDialogComponent` + `ConfirmationDialogComponent` for CRUD UI
5. Add any new API methods to `ApiService`

## Build Budgets (`angular.json`)

- Initial bundle: warn 500kB / error 1MB
- Component styles: warn 4kB / error 8kB

Keep dependencies lean — this is a dashboard app, not a landing page.
