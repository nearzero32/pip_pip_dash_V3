import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/http/api.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { LanguageService } from '../../../i18n/language.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { MediaApiService } from '../../../core/media/media-api.service';
import { FormDialogComponent } from '../../../shared/components/form-dialog/form-dialog';
import type { FormField } from '../../../shared/models/form-field.interface';
import { GeographyService } from '../geography/geography.service';
import type { City } from '../geography/geography.models';

type Translation = { locale: string; name: string; address?: string };
type StoreStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type Store = {
  id: string; name: string; translations: Translation[]; phone: string; address: string;
  status: StoreStatus; displayOrder: number; mainCategory: { id: string; name: string; translations?: Translation[] };
  zoneIds: string[]; subcategoryIds: string[]; location: { latitude: number; longitude: number }; updatedAt: string;
};
type Page<T> = { data: T[]; pagination?: { page: number; limit: number; total: number }; page?: number; limit?: number; total?: number };
type MainCategory = { id: string; name: string; translations: Translation[]; status: string };
type Subcategory = { id: string; name: string; translations: Translation[]; status: string };
type Zone = { id: string; name: string; translations: Translation[]; status: string };

@Component({
  selector: 'app-super-admin-stores',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, FormDialogComponent],
  templateUrl: './stores.html',
  styleUrl: './stores.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminStoresComponent {
  private readonly api = inject(ApiService).client;
  private readonly geography = inject(GeographyService);
  private readonly media = inject(MediaApiService);
  readonly language = inject(LanguageService);
  private readonly notify = inject(NotificationService);

  readonly cities = signal<City[]>([]);
  readonly cityId = signal('');
  readonly rows = signal<Store[]>([]);
  readonly loading = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly search = signal('');
  readonly status = signal<'' | StoreStatus>('');
  readonly createOpen = signal(false);
  readonly editing = signal<Store | null>(null);
  readonly saving = signal(false);
  readonly mains = signal<MainCategory[]>([]);
  readonly subs = signal<Subcategory[]>([]);
  readonly zones = signal<Zone[]>([]);
  readonly nameAr = signal(''); readonly nameEn = signal('');
  readonly addressAr = signal(''); readonly addressEn = signal('');
  readonly phone = signal(''); readonly latitude = signal<number | null>(null); readonly longitude = signal<number | null>(null);
  readonly displayOrder = signal(1); readonly mainCategoryId = signal(''); readonly subcategoryIds = signal<string[]>([]); readonly zoneIds = signal<string[]>([]);
  readonly logoFile = signal<File | null>(null); readonly formError = signal('');
  readonly fields = signal<FormField[]>([]);
  readonly formInitialData = signal<Record<string, unknown>>({});
  readonly pageSize = 25;
  readonly hasPrevious = computed(() => this.page() > 1);
  readonly hasNext = computed(() => this.page() * this.pageSize < this.total());

  async ngOnInit() { await this.loadCities(); }

  cityLabel(city: City) { return this.language.lang() === 'en' ? city.nameEn : city.nameAr; }
  storeLabel(store: { name: string; translations: Translation[] }) { return this.localized(store.name, store.translations); }
  categoryLabel(category: Store['mainCategory']) { return this.localized(category.name, category.translations ?? []); }

  async selectCity(cityId: string) {
    this.cityId.set(cityId); this.page.set(1); this.rows.set([]); this.total.set(0);
    if (cityId) await Promise.all([this.load(), this.loadCreateOptions()]);
  }

  async applyFilters() { this.page.set(1); await this.load(); }
  async previous() { if (!this.hasPrevious()) return; this.page.update((value) => value - 1); await this.load(); }
  async next() { if (!this.hasNext()) return; this.page.update((value) => value + 1); await this.load(); }

  async setStatus(store: Store, status: Exclude<StoreStatus, 'ARCHIVED'>) {
    if (!this.cityId()) return;
    try {
      await this.api.patch(`/api/v1/super-admin/stores/${store.id}`, { status }, { params: { cityId: this.cityId() } });
      await this.load();
      this.notify.success(this.language.t('common.success'));
    } catch (error) { this.notify.error(apiErrorMessage(error, this.language.t('common.unexpectedError'))); }
  }

  async archive(store: Store) {
    if (!this.cityId()) return;
    try {
      await this.api.delete(`/api/v1/super-admin/stores/${store.id}`, { params: { cityId: this.cityId() } });
      await this.load();
      this.notify.success(this.language.t('common.success'));
    } catch (error) { this.notify.error(apiErrorMessage(error, this.language.t('common.unexpectedError'))); }
  }

  openCreate() {
    if (!this.cityId()) return;
    this.nameAr.set(''); this.nameEn.set(''); this.addressAr.set(''); this.addressEn.set(''); this.phone.set('');
    this.latitude.set(null); this.longitude.set(null); this.mainCategoryId.set(''); this.subcategoryIds.set([]); this.zoneIds.set([]);
    this.editing.set(null); this.logoFile.set(null); this.formError.set(''); this.displayOrder.set(this.rows().reduce((max, store) => Math.max(max, store.displayOrder), 0) + 1);
    this.formInitialData.set({ displayOrder: this.displayOrder(), subcategoryIds: [], zoneIds: [] }); this.fields.set(this.buildFields(true)); this.createOpen.set(true);
  }

  openEdit(store: Store) {
    this.editing.set(store); this.nameAr.set(store.translations.find((item) => item.locale === 'ar')?.name ?? store.name); this.nameEn.set(store.translations.find((item) => item.locale === 'en')?.name ?? '');
    this.addressAr.set(store.translations.find((item) => item.locale === 'ar')?.address ?? store.address); this.addressEn.set(store.translations.find((item) => item.locale === 'en')?.address ?? '');
    this.phone.set(store.phone); this.latitude.set(store.location.latitude); this.longitude.set(store.location.longitude); this.displayOrder.set(store.displayOrder);
    this.zoneIds.set([...store.zoneIds]); this.subcategoryIds.set([...store.subcategoryIds]); this.logoFile.set(null); this.formError.set('');
    void this.loadSubcategories(store.mainCategory.id);
    this.formInitialData.set({ nameAr: this.nameAr(), nameEn: this.nameEn(), addressAr: this.addressAr(), addressEn: this.addressEn(), phone: store.phone, latitude: store.location.latitude, longitude: store.location.longitude, displayOrder: store.displayOrder, mainCategoryId: store.mainCategory.id, subcategoryIds: store.subcategoryIds, zoneIds: store.zoneIds });
    this.fields.set(this.buildFields(false)); this.createOpen.set(true);
  }

  async selectMainCategory(mainCategoryId: string) {
    this.mainCategoryId.set(mainCategoryId); this.subcategoryIds.set([]);
    if (!mainCategoryId || !this.cityId()) { this.subs.set([]); return; }
    try {
      const result = await this.api.get<Page<Subcategory>>('/api/v1/dashboard/subcategories', { params: { cityId: this.cityId(), mainCategoryId, page: 1, limit: 100, status: 'ACTIVE' } });
      this.subs.set(result.data.data ?? []);
    } catch (error) { this.notify.error(apiErrorMessage(error, this.language.t('common.unexpectedError'))); }
  }

  async onFormFieldChange(change: { fieldName: string; value: unknown }) {
    if (change.fieldName !== 'mainCategoryId') return;
    await this.loadSubcategories(String(change.value ?? ''));
    this.fields.set(this.buildFields(this.editing() == null));
  }

  toggleSubcategory(id: string, checked: boolean) { this.subcategoryIds.update((ids) => checked ? [...new Set([...ids, id])] : ids.filter((value) => value !== id)); }
  toggleZone(id: string, checked: boolean) { this.zoneIds.update((ids) => checked ? [...new Set([...ids, id])] : ids.filter((value) => value !== id)); }
  chooseLogo(event: Event) { this.logoFile.set((event.target as HTMLInputElement).files?.[0] ?? null); }

  async save(value: Record<string, unknown>) {
    const cityId = this.cityId(); const logo = value['logoFile'] as File | null;
    const isCreate = this.editing() == null;
    const nameAr = String(value['nameAr'] ?? '').trim(), nameEn = String(value['nameEn'] ?? '').trim(), addressAr = String(value['addressAr'] ?? '').trim(), addressEn = String(value['addressEn'] ?? '').trim();
    const subcategoryIds = Array.isArray(value['subcategoryIds']) ? value['subcategoryIds'].map(String) : [], zoneIds = Array.isArray(value['zoneIds']) ? value['zoneIds'].map(String) : [];
    if (!cityId || (isCreate && !logo) || !nameAr || !nameEn || !addressAr || !addressEn || !String(value['phone'] ?? '').trim() || !value['mainCategoryId'] || !subcategoryIds.length || !zoneIds.length || value['latitude'] == null || value['longitude'] == null) {
      this.formError.set(this.language.t('common.requiredFields')); return;
    }
    this.saving.set(true); this.formError.set(''); let logoAssetId: string | null = null;
    try {
      if (logo) { const asset = await this.media.uploadImage(logo, 'STORE_LOGO', cityId); logoAssetId = asset.id; }
      const body = {
        mainCategoryId: String(value['mainCategoryId']), phone: String(value['phone']).trim(), latitude: Number(value['latitude']), longitude: Number(value['longitude']),
        displayOrder: Number(value['displayOrder']), zoneIds, subcategoryIds,
        translations: [{ locale: 'ar', name: nameAr, address: addressAr }, { locale: 'en', name: nameEn, address: addressEn }],
        ...(logoAssetId ? { logoAssetId } : {}),
        ...(isCreate ? { status: 'ACTIVE' as const, orderAcceptanceStatus: 'ACCEPTING' as const, workingHours: [] } : {}),
      };
      const editing = this.editing();
      if (editing) await this.api.patch(`/api/v1/super-admin/stores/${editing.id}`, body, { params: { cityId } });
      else await this.api.post('/api/v1/super-admin/stores', { cityId, ...body, logoAssetId });
      this.createOpen.set(false); await this.load(); this.notify.success(this.language.t(editing ? 'stores.updated' : 'stores.created'));
    } catch (error) {
      if (logoAssetId) await this.media.bestEffortDelete(logoAssetId, cityId);
      this.formError.set(apiErrorMessage(error, this.language.t('common.unexpectedError')));
    } finally { this.saving.set(false); }
  }

  private localized(fallback: string, translations: Translation[]) {
    return translations.find((item) => item.locale === this.language.lang())?.name ?? fallback;
  }

  private buildFields(isCreate: boolean): FormField[] {
    return [
      { name: 'nameAr', label: this.language.t('geo.nameAr'), type: 'text', required: true, step: 0 }, { name: 'nameEn', label: this.language.t('geo.nameEn'), type: 'text', required: true, step: 0 },
      { name: 'addressAr', label: this.language.t('stores.address'), type: 'text', required: true, step: 0 }, { name: 'addressEn', label: 'Address (EN)', type: 'text', required: true, step: 0 },
      { name: 'phone', label: this.language.t('stores.phone'), type: 'text', required: true, step: 0 }, { name: 'displayOrder', label: this.language.t('catalog.displayOrder'), type: 'number', required: true, step: 0 },
      { name: 'mainCategoryId', label: this.language.t('stores.mainCategory'), type: 'select', required: true, options: this.mains().map((item) => ({ value: item.id, label: this.categoryLabel(item) })), step: 1 },
      { name: 'subcategoryIds', label: this.language.t('stores.subcategories'), type: 'multiselect', required: true, options: this.subs().map((item) => ({ value: item.id, label: this.storeLabel(item) })), step: 1, width: 'full' },
      { name: 'zoneIds', label: this.language.t('nav.zones'), type: 'multiselect', required: true, options: this.zones().map((item) => ({ value: item.id, label: this.storeLabel(item) })), step: 1, width: 'full' },
      { name: 'locationMap', label: this.language.t('geo.mapLabel'), type: 'map', latitudeField: 'latitude', longitudeField: 'longitude', step: 2 }, { name: 'latitude', label: this.language.t('geo.latitude'), type: 'number', required: true, step: 2 }, { name: 'longitude', label: this.language.t('geo.longitude'), type: 'number', required: true, step: 2 },
      { name: 'logoFile', label: this.language.t('stores.logo'), type: 'file', required: isCreate, width: 'full', step: 3 },
    ];
  }

  private async loadSubcategories(mainCategoryId: string) {
    if (!mainCategoryId || !this.cityId()) { this.subs.set([]); return; }
    const result = await this.api.get<Page<Subcategory>>('/api/v1/dashboard/subcategories', { params: { cityId: this.cityId(), mainCategoryId, page: 1, limit: 100, status: 'ACTIVE' } });
    this.subs.set(result.data.data ?? []);
  }

  private async loadCities() {
    try { this.cities.set((await this.geography.listCities(1, 100)).data.filter((city) => city.status !== 'ARCHIVED')); }
    catch (error) { this.notify.error(apiErrorMessage(error, this.language.t('common.unexpectedError'))); }
  }

  private async load() {
    const cityId = this.cityId(); if (!cityId) return;
    this.loading.set(true);
    try {
      const result = await this.api.get<Page<Store>>('/api/v1/super-admin/stores', { params: {
        cityId, page: this.page(), limit: this.pageSize,
        ...(this.search().trim() ? { search: this.search().trim() } : {}),
        ...(this.status() ? { status: this.status() } : {}),
      } });
      this.rows.set(result.data.data ?? []);
      this.total.set(result.data.pagination?.total ?? result.data.total ?? 0);
    } catch (error) {
      this.rows.set([]); this.total.set(0);
      this.notify.error(apiErrorMessage(error, this.language.t('common.unexpectedError')));
    } finally { this.loading.set(false); }
  }

  private async loadCreateOptions() {
    const cityId = this.cityId(); if (!cityId) return;
    try {
      const [mains, zones] = await Promise.all([
        this.api.get<Page<MainCategory>>('/api/v1/dashboard/main-categories', { params: { cityId, page: 1, limit: 100, status: 'ACTIVE' } }),
        this.api.get<Page<Zone>>('/api/v1/dashboard/zones', { params: { cityId, page: 1, limit: 100, status: 'ACTIVE' } }),
      ]);
      this.mains.set(mains.data.data ?? []); this.zones.set(zones.data.data ?? []);
    } catch (error) { this.notify.error(apiErrorMessage(error, this.language.t('common.unexpectedError'))); }
  }
}
