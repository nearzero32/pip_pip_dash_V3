import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableComponent } from '../../../shared/components/table/table';
import { FormDialogComponent } from '../../../shared/components/form-dialog/form-dialog';
import { TableColumn } from '../../../shared/models/table-column.interface';
import { PaginationConfig } from '../../../shared/models/pagination.interface';
import { FormField } from '../../../shared/models/form-field.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { getApiErrorMessage, getApiErrorStatus } from '../../../core/http/api-error';
import { CommissionHistoryItem, StoreCommission, StoreCommissionStatus } from './store-commissions.models';
import { StoreCommissionsService } from './store-commissions.service';

@Component({ selector: 'app-store-commissions', standalone: true, imports: [DatePipe, FormsModule, TableComponent, FormDialogComponent], changeDetection: ChangeDetectionStrategy.OnPush, templateUrl: './store-commissions.html', styleUrl: './store-commissions.css' })
export class StoreCommissionsComponent implements OnInit, OnDestroy {
  private api = inject(StoreCommissionsService); private notify = inject(NotificationService);
  readonly rows = signal<StoreCommission[]>([]); readonly pagination = signal<PaginationConfig | null>(null); readonly loading = signal(true); readonly blocked = signal(false); readonly search = signal(''); readonly status = signal<'' | StoreCommissionStatus>(''); readonly selected = signal<StoreCommission | null>(null); readonly history = signal<CommissionHistoryItem[]>([]); readonly historyLoading = signal(false); readonly editorOpen = signal(false); readonly submitting = signal(false);
  columns: TableColumn[] = []; historyColumns: TableColumn[] = []; private page = 1; private timer: ReturnType<typeof setTimeout> | null = null; private request = 0;
  ngOnInit() { this.columns = [{ key: 'storeName', label: 'المتجر' }, { key: 'platformCommissionRate', label: 'النسبة %' }, { key: 'status', label: 'حالة المتجر', type: 'badge', badgeClassMap: { ACTIVE: 'badge-success', DRAFT: 'badge-warning', INACTIVE: 'badge-default', ARCHIVED: 'badge-danger' } }, { key: 'lastCommissionChangedAt', label: 'آخر تغيير', type: 'date' }, { key: 'lastChangedByEmail', label: 'آخر تعديل بواسطة' }]; this.historyColumns = [{ key: 'previousRate', label: 'النسبة السابقة %' }, { key: 'newRate', label: 'النسبة الجديدة %' }, { key: 'reason', label: 'السبب' }, { key: 'changedByEmail', label: 'بواسطة' }, { key: 'changedAt', label: 'التاريخ', type: 'date' }]; void this.load(1); }
  ngOnDestroy() { if (this.timer) clearTimeout(this.timer); }
  onSearch(value: string) { this.search.set(value); if (this.timer) clearTimeout(this.timer); this.timer = setTimeout(() => void this.load(1), 350); }
  onStatus(value: string) { this.status.set(value as '' | StoreCommissionStatus); void this.load(1); }
  onPage(page: number) { void this.load(page); }
  async openDetails(row: StoreCommission) { this.selected.set(row); this.history.set([]); this.historyLoading.set(true); try { this.history.set((await this.api.history(row.storeId)).data); } catch (err) { this.notify.error(getApiErrorMessage(err, 'تعذر تحميل السجل')); } finally { this.historyLoading.set(false); } }
  closeDetails() { this.selected.set(null); this.history.set([]); }
  openEditor() { if (this.selected()) this.editorOpen.set(true); }
  closeEditor() { this.editorOpen.set(false); }
  fields(): FormField[] { return [{ name: 'platformCommissionRate', label: 'نسبة عمولة المنصة (%)', type: 'number', required: true }, { name: 'reason', label: 'سبب التغيير', type: 'textarea', required: true }, { name: 'note', label: 'ملاحظة', type: 'textarea' }]; }
  async save(value: Record<string, string>) { const selected = this.selected(); const rate = Number(value['platformCommissionRate']); if (!selected || !Number.isInteger(rate) || rate < 0 || rate > 100) { this.notify.error('أدخل نسبة صحيحة من 0 إلى 100'); return; } this.submitting.set(true); try { const updated = await this.api.update(selected.storeId, { platformCommissionRate: rate, reason: value['reason'].trim(), ...(value['note']?.trim() ? { note: value['note'].trim() } : {}) }); this.selected.set(updated); this.editorOpen.set(false); this.notify.success('تم تحديث النسبة'); await this.load(this.page); await this.openDetails(updated); } catch (err) { this.notify.error(getApiErrorMessage(err, 'تعذر تحديث النسبة')); } finally { this.submitting.set(false); } }
  private async load(page: number) { const request = ++this.request; this.loading.set(true); this.page = page; try { const result = await this.api.list({ page, limit: 20, search: this.search().trim() || undefined, status: this.status() || undefined }); if (request !== this.request) return; const pages = Math.max(1, Math.ceil(result.total / result.limit)); this.rows.set(result.data); this.pagination.set({ page: result.page, limit: result.limit, total: result.total, pages, hasNext: result.page < pages, hasPrev: result.page > 1 }); this.blocked.set(false); } catch (err) { if (request !== this.request) return; this.rows.set([]); this.pagination.set(null); this.blocked.set(getApiErrorStatus(err) === 403); if (!this.blocked()) this.notify.error(getApiErrorMessage(err, 'تعذر تحميل نسب المتاجر')); } finally { if (request === this.request) this.loading.set(false); } }
}
