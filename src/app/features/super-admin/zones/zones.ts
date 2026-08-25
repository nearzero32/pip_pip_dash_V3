import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/http/api.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { LanguageService } from '../../../i18n/language.service';
import { FormDialogComponent } from '../../../shared/components/form-dialog/form-dialog';
import { SelectControlComponent, SelectControlOption } from '../../../shared/components/select-control/select-control';
import { TableComponent } from '../../../shared/components/table/table';
import { InputControlComponent } from '../../../shared/components/input-control/input-control';
import { PageStatsComponent } from '../../../shared/components/page-stats/page-stats';
import { FormField } from '../../../shared/models/form-field.interface';
import { TableColumn } from '../../../shared/models/table-column.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { GeographyService } from '../geography/geography.service';
import { City } from '../geography/geography.models';
type Zone = { id: string; name: string; status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'; boundary: unknown; createdAt: string };
type Page = { data: Zone[] };
@Component({ selector: 'app-super-admin-zones', standalone: true, imports: [CommonModule, TranslatePipe, TableComponent, FormDialogComponent, SelectControlComponent, InputControlComponent, PageStatsComponent], templateUrl: './zones.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class SuperAdminZonesComponent implements OnInit {
  private api = inject(ApiService).client; private geography = inject(GeographyService); private lang = inject(LanguageService); private notify = inject(NotificationService);
  readonly cities = signal<City[]>([]); readonly cityId = signal(''); readonly search = signal(''); readonly statusFilter = signal('ACTIVE'); readonly rows = signal<Zone[]>([]); readonly loading = signal(false); readonly dialog = signal(false); readonly editing = signal<Zone | null>(null); readonly saving = signal(false);
  readonly columns: TableColumn[] = [{ key: 'name', label: this.lang.t('zones.name') }, { key: 'status', label: this.lang.t('geo.status'), type: 'badge' }, { key: 'createdAt', label: this.lang.t('geo.createdAt'), type: 'date' }];
  ngOnInit() { void this.loadCities(); }
  cityOptions(): readonly SelectControlOption[] { return this.cities().map((c) => ({ value: c.id, label: `${c.nameEn} / ${c.nameAr}` })); }
  statusOptions(): readonly SelectControlOption[] { return ['ACTIVE', 'INACTIVE', 'ARCHIVED'].map((value) => ({ value, label: this.lang.t(`status.${value}`) })); }
  fields(): FormField[] { const edit = this.editing(); return [{ name: 'name', label: this.lang.t('zones.name'), type: 'text', required: true }, ...(edit ? [{ name: 'status', label: this.lang.t('geo.status'), type: 'select' as const, required: true, options: [{ value: 'ACTIVE', label: this.lang.t('status.ACTIVE') }, { value: 'INACTIVE', label: this.lang.t('status.INACTIVE') }] }] : []), { name: 'boundary', label: this.lang.t('zones.mapLabel'), type: 'boundary-map' as const, required: true, width: 'full' as const }]; }
  initial() { const row = this.editing(); return row ? { name: row.name, status: row.status, boundary: row.boundary } : null; }
  selectCity(id: string) { this.cityId.set(id); void this.load(); } create() { this.editing.set(null); this.dialog.set(true); } edit(row: Zone) { this.editing.set(row); this.dialog.set(true); }
  selectStatus(status: string) { this.statusFilter.set(status); void this.load(); }
  setSearch(search: string) { this.search.set(search); void this.load(); }
  async save(value: Record<string, unknown>) { if (!this.cityId()) return; this.saving.set(true); try { const current = this.editing(); if (current) await this.api.patch(`/api/v1/dashboard/zones/${current.id}`, { name: String(value['name']).trim(), status: value['status'], boundary: value['boundary'] }, { params: { cityId: this.cityId() } }); else await this.api.post('/api/v1/dashboard/zones', { cityId: this.cityId(), name: String(value['name']).trim(), boundary: value['boundary'] }); this.dialog.set(false); await this.load(); this.notify.success(this.lang.t('common.success')); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } finally { this.saving.set(false); } }
  async archive(row: Zone) { if (!this.cityId()) return; try { await this.api.delete(`/api/v1/dashboard/zones/${row.id}`, { params: { cityId: this.cityId() } }); await this.load(); this.notify.success(this.lang.t('common.success')); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } }
  async restore(row: Zone) { try { await this.api.patch(`/api/v1/dashboard/zones/${row.id}`, { status: 'ACTIVE' }, { params: { cityId: this.cityId() } }); await this.load(); this.notify.success(this.lang.t('common.success')); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } }
  private async loadCities() { try { const cities = (await this.geography.listCities(1, 100)).data.filter((c) => c.status !== 'ARCHIVED'); this.cities.set(cities); if (cities[0]) this.selectCity(cities[0].id); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } }
  private async load() { if (!this.cityId()) return; this.loading.set(true); try { const search = this.search().trim(); const status = this.statusFilter(); const r = await this.api.get<Page>('/api/v1/dashboard/zones', { params: { cityId: this.cityId(), page: 1, limit: 100, ...(search ? { search } : {}), ...(status ? { status } : {}) } }); this.rows.set(r.data.data); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } finally { this.loading.set(false); } }
}
