import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormDialogComponent } from '../../../shared/components/form-dialog/form-dialog';
import { InputControlComponent } from '../../../shared/components/input-control/input-control';
import { SelectControlComponent, SelectControlOption } from '../../../shared/components/select-control/select-control';
import { TableComponent } from '../../../shared/components/table/table';
import { FormField } from '../../../shared/models/form-field.interface';
import { PaginationConfig } from '../../../shared/models/pagination.interface';
import { TableColumn } from '../../../shared/models/table-column.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { LanguageService } from '../../../i18n/language.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { City } from '../geography/geography.models';
import { GeographyService } from '../geography/geography.service';
import { CommissionHistoryItem, StoreCommission, StoreCommissionStatus } from './store-commissions.models';
import { SuperStoreCommissionsService } from './store-commissions.service';

@Component({ selector: 'app-super-store-commissions', standalone: true, imports: [CommonModule, TranslatePipe, TableComponent, FormDialogComponent, SelectControlComponent, InputControlComponent], templateUrl: './store-commissions.html', styleUrl: './store-commissions.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class SuperStoreCommissionsComponent implements OnInit {
  private service = inject(SuperStoreCommissionsService); private geo = inject(GeographyService); private lang = inject(LanguageService); private notify = inject(NotificationService);
  readonly cities = signal<City[]>([]); readonly cityId = signal(''); readonly rows = signal<StoreCommission[]>([]); readonly loading = signal(false); readonly search = signal(''); readonly status = signal<'' | StoreCommissionStatus>(''); readonly pagination = signal<PaginationConfig | null>(null); readonly selected = signal<StoreCommission | null>(null); readonly selectedStoreIds = signal<string[]>([]); readonly history = signal<CommissionHistoryItem[]>([]); readonly historyLoading = signal(false); readonly editorOpen = signal(false); readonly bulkEditorOpen = signal(false); readonly submitting = signal(false);
  private page = 1;
  readonly columns: TableColumn[] = [ { key: 'storeName', label: this.lang.t('commission.store') }, { key: 'platformCommissionRate', label: this.lang.t('commission.rate') }, { key: 'status', label: this.lang.t('commission.status'), type: 'badge' }, { key: 'lastCommissionChangedAt', label: this.lang.t('commission.lastChange'), type: 'date' }, { key: 'lastChangedByEmail', label: this.lang.t('commission.changedBy') } ];
  readonly historyColumns: TableColumn[] = [ { key: 'previousRate', label: this.lang.t('commission.previousRate') }, { key: 'newRate', label: this.lang.t('commission.newRate') }, { key: 'reason', label: this.lang.t('commission.reason') }, { key: 'changedByEmail', label: this.lang.t('commission.changedBy') }, { key: 'changedAt', label: this.lang.t('commission.changedAt'), type: 'date' } ];
  ngOnInit() { void this.loadCities(); }
  cityOptions(): readonly SelectControlOption[] { return this.cities().map((c) => ({ value: c.id, label: `${c.nameEn} / ${c.nameAr}` })); }
  statusOptions(): readonly SelectControlOption[] { return ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].map((value) => ({ value, label: this.lang.t(`status.${value}`) })); }
  selectCity(value: string) { this.cityId.set(value); void this.load(1); }
  setSearch(value: string) { this.search.set(value); void this.load(1); }
  setStatus(value: string) { this.status.set(value as '' | StoreCommissionStatus); void this.load(1); }
  async openDetails(row: StoreCommission) { this.selected.set(row); this.historyLoading.set(true); try { this.history.set((await this.service.history(this.cityId(), row.storeId)).data); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } finally { this.historyLoading.set(false); } }
  fields(): FormField[] { return [{ name: 'platformCommissionRate', label: this.lang.t('commission.rateInput'), type: 'number', required: true }, { name: 'reason', label: this.lang.t('commission.reason'), type: 'textarea', required: true, width: 'full' }, { name: 'note', label: this.lang.t('commission.note'), type: 'textarea', width: 'full' }]; }
  async save(value: Record<string, unknown>) { const row = this.selected(); const rate = Number(value['platformCommissionRate']); if (!row || !Number.isInteger(rate) || rate < 0 || rate > 100) return; this.submitting.set(true); try { const updated = await this.service.update(this.cityId(), row.storeId, { platformCommissionRate: rate, reason: String(value['reason']).trim(), ...(String(value['note'] ?? '').trim() ? { note: String(value['note']).trim() } : {}) }); this.selected.set(updated); this.editorOpen.set(false); await this.load(this.page); await this.openDetails(updated); this.notify.success(this.lang.t('common.success')); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } finally { this.submitting.set(false); } }
  async saveBulk(value: Record<string, unknown>) { const rate = Number(value['platformCommissionRate']); const ids = this.selectedStoreIds(); if (!ids.length || !Number.isInteger(rate) || rate < 0 || rate > 100) return; this.submitting.set(true); try { await Promise.all(ids.map((storeId) => this.service.update(this.cityId(), storeId, { platformCommissionRate: rate, reason: String(value['reason']).trim(), ...(String(value['note'] ?? '').trim() ? { note: String(value['note']).trim() } : {}) }))); this.bulkEditorOpen.set(false); this.selectedStoreIds.set([]); await this.load(this.page); this.notify.success(this.lang.t('common.success')); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } finally { this.submitting.set(false); } }
  private async loadCities() { try { const cities = (await this.geo.listCities(1, 100)).data.filter((c) => c.status !== 'ARCHIVED'); this.cities.set(cities); if (cities[0]) this.selectCity(cities[0].id); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } }
  async load(page: number) { if (!this.cityId()) return; this.loading.set(true); this.page = page; try { const result = await this.service.list(this.cityId(), { page, limit: 20, search: this.search() || undefined, status: this.status() || undefined }); this.rows.set(result.data); this.selectedStoreIds.update((ids) => ids.filter((id) => result.data.some((row) => row.storeId === id))); const pages = Math.max(1, Math.ceil(result.total / result.limit)); this.pagination.set({ page: result.page, limit: result.limit, total: result.total, pages, hasNext: result.page < pages, hasPrev: result.page > 1 }); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } finally { this.loading.set(false); } }
}
