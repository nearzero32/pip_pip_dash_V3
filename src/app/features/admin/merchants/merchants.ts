import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TableComponent } from '../../../shared/components/table/table';
import { FormDialogComponent } from '../../../shared/components/form-dialog/form-dialog';
import { TableColumn } from '../../../shared/models/table-column.interface';
import { PaginationConfig } from '../../../shared/models/pagination.interface';
import { FormField } from '../../../shared/models/form-field.interface';
import { LanguageService } from '../../../i18n/language.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { getApiErrorMessage, getApiErrorStatus } from '../../../core/http/api-error';
import { StoresService } from '../stores/stores.service';
import { Store } from '../stores/stores.models';
import { Merchant, MerchantStatus } from './merchants.models';
import { MerchantsService } from './merchants.service';

@Component({
  selector: 'app-merchants', standalone: true,
  imports: [FormsModule, DatePipe, TableComponent, FormDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './merchants.html', styleUrl: './merchants.css',
})
export class MerchantsComponent implements OnInit, OnDestroy {
  private merchantsApi = inject(MerchantsService);
  private storesApi = inject(StoresService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);
  readonly rows = signal<Merchant[]>([]);
  readonly pagination = signal<PaginationConfig | null>(null);
  readonly loading = signal(true);
  readonly blocked = signal(false);
  readonly search = signal('');
  readonly status = signal<'' | MerchantStatus>('');
  readonly storeId = signal('');
  readonly stores = signal<Store[]>([]);
  readonly formOpen = signal(false);
  readonly formMode = signal<'create' | 'edit' | 'password' | 'transfer'>('create');
  readonly selected = signal<Merchant | null>(null);
  readonly submitting = signal(false);
  columns: TableColumn[] = [];
  private page = 1;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private request = 0;

  ngOnInit() {
    this.columns = [
      { key: 'displayName', label: 'الاسم' }, { key: 'phone', label: 'الهاتف' },
      { key: 'storeName', label: 'المتجر' },
      { key: 'status', label: 'الحالة', type: 'badge', badgeClassMap: { ACTIVE: 'badge-success', INACTIVE: 'badge-default', SUSPENDED: 'badge-danger' } },
      { key: 'createdAt', label: 'تاريخ الإنشاء', type: 'date' },
    ];
    void this.loadStores(); void this.load(1);
  }
  ngOnDestroy() { if (this.timer) clearTimeout(this.timer); }
  onSearch(value: string) { this.search.set(value); if (this.timer) clearTimeout(this.timer); this.timer = setTimeout(() => void this.load(1), 350); }
  onStatus(value: string) { this.status.set(value as '' | MerchantStatus); void this.load(1); }
  onStore(value: string) { this.storeId.set(value); void this.load(1); }
  onPage(page: number) { void this.load(page); }
  openCreate() { this.selected.set(null); this.formMode.set('create'); this.formOpen.set(true); }
  openEdit(row: Merchant) { this.selected.set(row); this.formMode.set('edit'); this.formOpen.set(true); }
  openPassword(row: Merchant) { this.selected.set(row); this.formMode.set('password'); this.formOpen.set(true); }
  openTransfer(row: Merchant) { this.selected.set(row); this.formMode.set('transfer'); this.formOpen.set(true); }
  openDetails(row: Merchant) { this.selected.set(row); }
  closeDetails() { this.selected.set(null); }
  closeForm() { this.formOpen.set(false); }
  formTitle() { return { create: 'إضافة تاجر', edit: 'تعديل التاجر', password: 'تغيير كلمة المرور', transfer: 'نقل التاجر' }[this.formMode()]; }
  fields(): FormField[] {
    const storeOptions = this.stores().map(store => ({ value: store.id, label: store.name }));
    if (this.formMode() === 'password') return [{ name: 'password', label: 'كلمة المرور الجديدة', type: 'password', required: true, hint: '12 حرفًا على الأقل' }];
    if (this.formMode() === 'transfer') return [{ name: 'storeId', label: 'المتجر', type: 'select', required: true, options: storeOptions }];
    const base: FormField[] = [{ name: 'displayName', label: 'الاسم الظاهر', type: 'text' }, { name: 'status', label: 'الحالة', type: 'select', options: this.statusOptions() }];
    return this.formMode() === 'edit' ? base : [{ name: 'phone', label: 'الهاتف', type: 'text', required: true }, { name: 'password', label: 'كلمة المرور', type: 'password', required: true, hint: '12 حرفًا على الأقل' }, { name: 'storeId', label: 'المتجر', type: 'select', required: true, options: storeOptions }, ...base];
  }
  async save(value: Record<string, string>) {
    const selected = this.selected(); this.submitting.set(true);
    try {
      if (this.formMode() === 'create') await this.merchantsApi.create({ phone: value['phone'].trim(), password: value['password'], storeId: value['storeId'], ...(value['displayName']?.trim() ? { displayName: value['displayName'].trim() } : {}), ...(this.asStatus(value['status']) ? { status: this.asStatus(value['status'])! } : {}) });
      else if (!selected) return;
      else if (this.formMode() === 'edit') await this.merchantsApi.update(selected.accountId, { displayName: value['displayName']?.trim() || null, ...(this.asStatus(value['status']) ? { status: this.asStatus(value['status'])! } : {}) });
      else if (this.formMode() === 'password') await this.merchantsApi.resetPassword(selected.accountId, value['password']);
      else await this.merchantsApi.transferStore(selected.accountId, value['storeId']);
      this.notify.success('تم الحفظ بنجاح'); this.closeForm(); await this.load(this.page);
    } catch (err) { this.notify.error(getApiErrorMessage(err, 'تعذر حفظ التغييرات')); }
    finally { this.submitting.set(false); }
  }
  private statusOptions() { return [{ value: 'ACTIVE', label: 'نشط' }, { value: 'INACTIVE', label: 'غير نشط' }, { value: 'SUSPENDED', label: 'موقوف' }]; }
  private asStatus(value: string | undefined): MerchantStatus | undefined { return value === 'ACTIVE' || value === 'INACTIVE' || value === 'SUSPENDED' ? value : undefined; }
  private async load(page: number) {
    const request = ++this.request; this.loading.set(true); this.page = page;
    try { const result = await this.merchantsApi.list({ page, limit: 20, search: this.search().trim() || undefined, status: this.status() || undefined, storeId: this.storeId() || undefined }); if (request !== this.request) return; const pages = Math.max(1, Math.ceil(result.total / result.limit)); this.rows.set(result.data); this.pagination.set({ page: result.page, limit: result.limit, total: result.total, pages, hasNext: result.page < pages, hasPrev: result.page > 1 }); this.blocked.set(false); }
    catch (err) { if (request !== this.request) return; this.rows.set([]); this.pagination.set(null); this.blocked.set(getApiErrorStatus(err) === 403); if (!this.blocked()) this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError'))); }
    finally { if (request === this.request) this.loading.set(false); }
  }
  private async loadStores() { try { this.stores.set((await this.storesApi.listAllNonArchived()).filter(store => store.status !== 'ARCHIVED')); } catch { this.stores.set([]); } }
}
