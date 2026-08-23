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

type Translation = { locale: 'ar' | 'en'; name: string };
type MainCategory = { id: string; name: string; translations: Translation[]; status: string };
type Subcategory = { id: string; name: string; translations: Translation[]; mainCategory: MainCategory; status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'; displayOrder: number };
type Page<T> = { data: T[]; page: number; limit: number; total: number };

@Component({
  selector: 'app-super-admin-subcategories', standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
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

  async ngOnInit() { await this.loadCities(); }
  label(item: { name: string; translations?: Translation[] }) { const locale = this.language.lang(); return item.translations?.find((x) => x.locale === locale)?.name ?? item.name; }
  async selectCity(id: string) { this.cityId.set(id); this.mainId.set(''); this.rows.set([]); if (!id) return; await this.loadMains(); }
  async selectMain(id: string) { this.mainId.set(id); if (id) await this.loadRows(); else this.rows.set([]); }
  create() { this.editing.set(null); this.nameAr.set(''); this.nameEn.set(''); this.status.set('ACTIVE'); this.displayOrder.set(this.rows().reduce((max, row) => Math.max(max, row.displayOrder), 0) + 1); this.open.set(true); }
  edit(row: Subcategory) { this.editing.set(row); this.nameAr.set(row.translations.find((x) => x.locale === 'ar')?.name ?? row.name); this.nameEn.set(row.translations.find((x) => x.locale === 'en')?.name ?? ''); this.status.set(row.status === 'ARCHIVED' ? 'INACTIVE' : row.status); this.displayOrder.set(row.displayOrder); this.open.set(true); }
  async save() { if (!this.mainId() || !this.nameAr().trim() || !this.nameEn().trim()) return; this.saving.set(true); const body = { mainCategoryId: this.mainId(), translations: [{ locale: 'ar', name: this.nameAr().trim() }, { locale: 'en', name: this.nameEn().trim() }], status: this.status(), displayOrder: this.displayOrder() }; try { const row = this.editing(); if (row) await this.api.patch(`/api/v1/dashboard/subcategories/${row.id}`, body, { params: { cityId: this.cityId() } }); else await this.api.post('/api/v1/dashboard/subcategories', body, { params: { cityId: this.cityId() } }); this.open.set(false); await this.loadRows(); this.notify.success(this.language.t('common.success')); } catch (err) { this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError'))); } finally { this.saving.set(false); } }
  private async loadCities() { try { this.cities.set((await this.geography.listCities(1, 100)).data.filter((city) => city.status !== 'ARCHIVED')); } catch (err) { this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError'))); } }
  private async loadMains() { this.loading.set(true); try { this.mains.set((await this.api.get<Page<MainCategory>>('/api/v1/dashboard/main-categories', { params: { cityId: this.cityId(), page: 1, limit: 100 } })).data.data); } finally { this.loading.set(false); } }
  private async loadRows() { this.loading.set(true); try { this.rows.set((await this.api.get<Page<Subcategory>>('/api/v1/dashboard/subcategories', { params: { cityId: this.cityId(), mainCategoryId: this.mainId(), page: 1, limit: 100 } })).data.data); } catch (err) { this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError'))); } finally { this.loading.set(false); } }
}
