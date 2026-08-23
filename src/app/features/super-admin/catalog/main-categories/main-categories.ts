import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/http/api.service';
import { MediaApiService } from '../../../../core/media/media-api.service';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../i18n/language.service';
import { FormDialogComponent } from '../../../../shared/components/form-dialog/form-dialog';
import { SelectControlComponent, SelectControlOption } from '../../../../shared/components/select-control/select-control';
import { TableComponent } from '../../../../shared/components/table/table';
import { ConfirmationDialogComponent } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { FormField } from '../../../../shared/models/form-field.interface';
import { TableColumn } from '../../../../shared/models/table-column.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { GeographyService } from '../../geography/geography.service';
import { City } from '../../geography/geography.models';

type Category = { id: string; name: string; translations: { locale: string; name: string }[]; status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'; displayOrder: number; image?: { url: string | null } };
type Page = { data: Category[]; page: number; limit: number; total: number };

@Component({ selector: 'app-super-main-categories', standalone: true, imports: [CommonModule, TranslatePipe, TableComponent, FormDialogComponent, ConfirmationDialogComponent, SelectControlComponent], templateUrl: './main-categories.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class SuperAdminMainCategoriesComponent implements OnInit {
  private api = inject(ApiService).client; private geography = inject(GeographyService); private media = inject(MediaApiService); private lang = inject(LanguageService); private notify = inject(NotificationService);
  readonly cities = signal<City[]>([]); readonly cityId = signal(''); readonly rows = signal<Category[]>([]); readonly loading = signal(false); readonly dialog = signal(false); readonly editing = signal<Category | null>(null); readonly saving = signal(false); readonly search = signal(''); readonly status = signal(''); readonly archiveTarget = signal<Category | null>(null);
  readonly columns: TableColumn[] = [{ key: 'image.url', label: this.lang.t('catalog.image'), type: 'image' }, { key: 'name', label: this.lang.t('catalog.name') }, { key: 'status', label: this.lang.t('geo.status'), type: 'badge' }, { key: 'displayOrder', label: this.lang.t('catalog.displayOrder') }];
  ngOnInit() { void this.loadCities(); }
  cityOptions(): readonly SelectControlOption[] { return this.cities().map((c) => ({ value: c.id, label: `${c.nameEn} / ${c.nameAr}` })); }
  statusOptions(): readonly SelectControlOption[] { return ['ACTIVE', 'INACTIVE', 'ARCHIVED'].map((value) => ({ value, label: this.lang.t(`status.${value}`) })); }
  fields(): FormField[] { return [{ name: 'nameAr', label: this.lang.t('geo.nameAr'), type: 'text', required: true }, { name: 'nameEn', label: this.lang.t('geo.nameEn'), type: 'text', required: true }, { name: 'status', label: this.lang.t('geo.status'), type: 'select', required: true, defaultValue: 'ACTIVE', options: [{ value: 'ACTIVE', label: this.lang.t('status.ACTIVE') }, { value: 'INACTIVE', label: this.lang.t('status.INACTIVE') }] }, { name: 'displayOrder', label: this.lang.t('catalog.displayOrder'), type: 'number', required: true, defaultValue: this.rows().length + 1 }, { name: 'image', label: this.lang.t('catalog.image'), type: 'file', required: !this.editing(), width: 'full' }]; }
  initial() { const row = this.editing(); return row ? { nameAr: row.translations.find((x) => x.locale === 'ar')?.name ?? row.name, nameEn: row.translations.find((x) => x.locale === 'en')?.name ?? '', status: row.status === 'ARCHIVED' ? 'INACTIVE' : row.status, displayOrder: row.displayOrder } : null; }
  selectCity(id: string) { this.cityId.set(id); void this.load(); }
  setSearch(value: string) { this.search.set(value); void this.load(); }
  setStatus(value: string) { this.status.set(value); void this.load(); }
  create() { this.editing.set(null); this.dialog.set(true); }
  edit(row: Category) { this.editing.set(row); this.dialog.set(true); }
  async save(value: Record<string, unknown>) { const cityId = this.cityId(), file = value['image']; if (!cityId || (!this.editing() && !(file instanceof File))) return; this.saving.set(true); try { const imageAssetId = file instanceof File ? (await this.media.uploadImage(file, 'CATEGORY_IMAGE', cityId)).id : undefined; const body = { translations: [{ locale: 'ar', name: String(value['nameAr']).trim() }, { locale: 'en', name: String(value['nameEn']).trim() }], status: value['status'], displayOrder: Number(value['displayOrder']), ...(imageAssetId ? { imageAssetId } : {}) }; const current = this.editing(); if (current) await this.api.patch(`/api/v1/dashboard/main-categories/${current.id}`, body, { params: { cityId } }); else await this.api.post('/api/v1/dashboard/main-categories', { cityId, ...body, imageAssetId }); this.dialog.set(false); await this.load(); this.notify.success(this.lang.t('common.success')); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } finally { this.saving.set(false); } }
  async archive(row: Category) { if (!this.cityId()) return; this.saving.set(true); try { await this.api.delete(`/api/v1/dashboard/main-categories/${row.id}`, { params: { cityId: this.cityId() } }); await this.load(); this.notify.success(this.lang.t('common.success')); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } finally { this.saving.set(false); } }
  async confirmArchive() { const row = this.archiveTarget(); if (!row) return; this.archiveTarget.set(null); await this.archive(row); }
  private async loadCities() { try { const page = await this.geography.listCities(1, 100); this.cities.set(page.data.filter((c) => c.status !== 'ARCHIVED')); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } }
  private async load() { if (!this.cityId()) return; this.loading.set(true); try { const response = await this.api.get<Page>('/api/v1/dashboard/main-categories', { params: { cityId: this.cityId(), page: 1, limit: 100, ...(this.search().trim() ? { search: this.search().trim() } : {}), ...(this.status() ? { status: this.status() } : {}) } }); this.rows.set(response.data.data); } catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); } finally { this.loading.set(false); } }
}
