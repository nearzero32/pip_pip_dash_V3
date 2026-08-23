import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/http/api.service';
import { LanguageService } from '../../../../i18n/language.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { NotificationService } from '../../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { GeographyService } from '../../geography/geography.service';
import type { City } from '../../geography/geography.models';
import { TableComponent } from '../../../../shared/components/table/table';
import { FormDialogComponent } from '../../../../shared/components/form-dialog/form-dialog';
import type { TableColumn } from '../../../../shared/models/table-column.interface';
import type { FormField } from '../../../../shared/models/form-field.interface';

type Translation = { locale: 'ar' | 'en'; name: string };
type MainCategory = { id: string; name: string; translations: Translation[]; status: string };
type Subcategory = { id: string; name: string; translations: Translation[]; mainCategory: MainCategory; status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'; displayOrder: number };
type Page<T> = { data: T[]; page: number; limit: number; total: number };

@Component({
  selector: 'app-super-admin-subcategories', standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, TableComponent, FormDialogComponent],
  templateUrl: './subcategories.html', styleUrl: './subcategories.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminSubcategoriesComponent {
  private api = inject(ApiService).client;
  private geography = inject(GeographyService);
  readonly language = inject(LanguageService);
  private notify = inject(NotificationService);
  readonly cities = signal<City[]>([]); readonly mains = signal<MainCategory[]>([]); readonly rows = signal<Subcategory[]>([]);
  readonly cityId = signal(''); readonly mainId = signal(''); readonly editing = signal<Subcategory | null>(null); readonly open = signal(false); readonly loading = signal(false); readonly saving = signal(false);
  readonly nameAr = signal(''); readonly nameEn = signal(''); readonly status = signal<'ACTIVE' | 'INACTIVE'>('ACTIVE'); readonly displayOrder = signal(1);
  readonly columns: TableColumn[] = [
    { key: 'name', label: this.language.t('geo.nameAr') },
    { key: 'displayOrder', label: this.language.t('catalog.displayOrder') },
    { key: 'status', label: this.language.t('geo.status'), type: 'badge', badgeClassMap: { ACTIVE: 'badge-success', INACTIVE: 'badge-warning', ARCHIVED: 'badge-danger' }, valueMap: { ACTIVE: this.language.t('status.ACTIVE'), INACTIVE: this.language.t('status.INACTIVE'), ARCHIVED: this.language.t('status.ARCHIVED') } },
  ];
  readonly fields = signal<FormField[]>([]);
  readonly initialData = signal<Record<string, unknown>>({});

  async ngOnInit() { await this.loadCities(); }
  cityLabel(city: City) { return this.language.lang() === 'en' ? city.nameEn : city.nameAr; }
  label(item: { name: string; translations?: Translation[] }) { const locale = this.language.lang(); return item.translations?.find((x) => x.locale === locale)?.name ?? item.name; }
  async selectCity(id: string) { this.cityId.set(id); this.mainId.set(''); this.rows.set([]); if (!id) return; await this.loadMains(); }
  async selectMain(id: string) { this.mainId.set(id); if (id) await this.loadRows(); else this.rows.set([]); }
  create() { this.editing.set(null); this.displayOrder.set(this.rows().reduce((max, row) => Math.max(max, row.displayOrder), 0) + 1); this.initialData.set({ nameAr: '', nameEn: '', status: 'ACTIVE', displayOrder: this.displayOrder() }); this.fields.set(this.buildFields()); this.open.set(true); }
  edit(row: Subcategory) { this.editing.set(row); this.initialData.set({ nameAr: row.translations.find((x) => x.locale === 'ar')?.name ?? row.name, nameEn: row.translations.find((x) => x.locale === 'en')?.name ?? '', status: row.status === 'ARCHIVED' ? 'INACTIVE' : row.status, displayOrder: row.displayOrder }); this.fields.set(this.buildFields()); this.open.set(true); }
  async save(value: Record<string, unknown>) { const nameAr = String(value['nameAr'] ?? '').trim(), nameEn = String(value['nameEn'] ?? '').trim(); if (!this.mainId() || !nameAr || !nameEn) return; this.saving.set(true); const body = { mainCategoryId: this.mainId(), translations: [{ locale: 'ar', name: nameAr }, { locale: 'en', name: nameEn }], status: value['status'], displayOrder: Number(value['displayOrder']) }; try { const row = this.editing(); if (row) await this.api.patch(`/api/v1/super-admin/subcategories/${row.id}`, body, { params: { cityId: this.cityId() } }); else await this.api.post('/api/v1/super-admin/subcategories', { cityId: this.cityId(), ...body }); this.open.set(false); await this.loadRows(); this.notify.success(this.language.t('common.success')); } catch (err) { this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError'))); } finally { this.saving.set(false); } }
  private buildFields(): FormField[] { return [{ name: 'nameAr', label: this.language.t('geo.nameAr'), type: 'text', required: true, step: 0 }, { name: 'nameEn', label: this.language.t('geo.nameEn'), type: 'text', required: true, step: 0 }, { name: 'status', label: this.language.t('geo.status'), type: 'select', required: true, options: [{ value: 'ACTIVE', label: this.language.t('status.ACTIVE') }, { value: 'INACTIVE', label: this.language.t('status.INACTIVE') }], step: 1 }, { name: 'displayOrder', label: this.language.t('catalog.displayOrder'), type: 'number', required: true, step: 1 }]; }
  private async loadCities() { try { this.cities.set((await this.geography.listCities(1, 100)).data.filter((city) => city.status !== 'ARCHIVED')); } catch (err) { this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError'))); } }
  private async loadMains() { this.loading.set(true); try { this.mains.set((await this.api.get<Page<MainCategory>>('/api/v1/dashboard/main-categories', { params: { cityId: this.cityId(), page: 1, limit: 100 } })).data.data); } finally { this.loading.set(false); } }
  private async loadRows() { this.loading.set(true); try { this.rows.set((await this.api.get<Page<Subcategory>>('/api/v1/super-admin/subcategories', { params: { cityId: this.cityId(), mainCategoryId: this.mainId(), page: 1, limit: 100 } })).data.data); } catch (err) { this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError'))); } finally { this.loading.set(false); } }
}
