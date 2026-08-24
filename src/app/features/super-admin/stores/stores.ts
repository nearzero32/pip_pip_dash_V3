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
import { DetailDialogComponent, DetailDialogAction, DetailSection } from '../../../shared/components/detail-dialog/detail-dialog';
import { SelectControlComponent, type SelectControlOption } from '../../../shared/components/select-control/select-control';
import { ExportButtonComponent } from '../../../shared/components/export-button/export-button';
import { InputControlComponent } from '../../../shared/components/input-control/input-control';
import type { FormField } from '../../../shared/models/form-field.interface';
import { GeographyService } from '../geography/geography.service';
import type { City } from '../geography/geography.models';

type Translation = { locale: string; name: string; address?: string };
type StoreStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type StoreMedia = { assetId: string; url: string | null };
const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
type Weekday = typeof WEEKDAYS[number];
type Store = {
  id: string; name: string; translations: Translation[]; phone: string; address: string;
  status: StoreStatus; displayOrder: number; mainCategory: { id: string; name: string; translations?: Translation[] };
  zoneIds: string[]; subcategoryIds: string[]; location: { latitude: number; longitude: number }; logo: StoreMedia | null; cover: StoreMedia | null;
  orderAcceptanceStatus: 'ACCEPTING' | 'PAUSED'; availability: { isOpen: boolean; isAcceptingOrders: boolean; nextOpeningAt: string | null; nextClosingAt: string | null };
  workingHours: Array<{ dayOfWeek: Weekday; opensAt: string; closesAt: string }>; createdAt: string; updatedAt: string; archivedAt: string | null;
};
type Page<T> = { data: T[]; pagination?: { page: number; limit: number; total: number }; page?: number; limit?: number; total?: number };
type MainCategory = { id: string; name: string; translations: Translation[]; status: string };
type Subcategory = { id: string; name: string; translations: Translation[]; status: string };
type Zone = { id: string; name: string; translations: Translation[]; status: string; boundary?: unknown };

type Position = readonly [number, number];
const pointInRing = (point: Position, ring: readonly Position[]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!, [xj, yj] = ring[j]!;
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const boundaryContains = (boundary: unknown, point: Position): boolean | null => {
  try {
    const geometry = typeof boundary === 'string' ? JSON.parse(boundary) : boundary as { type?: string; coordinates?: unknown };
    const coordinates = geometry?.coordinates;
    const polygonContains = (polygon: unknown) => Array.isArray(polygon) && Array.isArray(polygon[0]) && pointInRing(point, polygon[0] as Position[]);
    if (geometry?.type === 'Polygon') return polygonContains(coordinates);
    if (geometry?.type === 'MultiPolygon' && Array.isArray(coordinates)) return coordinates.some(polygonContains);
  } catch { /* Let the server remain the authority if a boundary cannot be read. */ }
  return null;
};

@Component({
  selector: 'app-super-admin-stores',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, FormDialogComponent, DetailDialogComponent, SelectControlComponent, ExportButtonComponent, InputControlComponent],
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
  readonly workHoursCopyActions = [{
    step: 2,
    label: this.language.t('stores.copyMondayHours'),
    sourceFields: ['MONDAY_open', 'MONDAY_close'],
    targetGroups: WEEKDAYS.slice(1).map((day) => [`${day}_open`, `${day}_close`]),
  }];

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
  readonly detailStore = signal<Store | null>(null);
  readonly formInitialData = signal<Record<string, unknown>>({});
  readonly pageSize = 25;
  readonly hasPrevious = computed(() => this.page() > 1);
  readonly hasNext = computed(() => this.page() * this.pageSize < this.total());

  async ngOnInit() { await this.loadCities(); }

  cityLabel(city: City) { return this.language.lang() === 'en' ? city.nameEn : city.nameAr; }
  cityOptions(): readonly SelectControlOption[] { return this.cities().map((city) => ({ value: city.id, label: this.cityLabel(city) })); }
  statusOptions(): readonly SelectControlOption[] {
    return (['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const).map((value) => ({ value, label: this.language.t(`status.${value}`) }));
  }
  storeLabel(store: { name: string; translations: Translation[] }) { return this.localized(store.name, store.translations); }
  categoryLabel(category: Store['mainCategory']) { return this.localized(category.name, category.translations ?? []); }

  async selectCity(cityId: string) {
    this.cityId.set(cityId); this.page.set(1); this.rows.set([]); this.total.set(0);
    if (cityId) await Promise.all([this.load(), this.loadCreateOptions()]);
  }

  async applyFilters() { this.page.set(1); await this.load(); }
  onStatusChanged(status: string) { this.status.set(status as '' | StoreStatus); void this.applyFilters(); }
  async previous() { if (!this.hasPrevious()) return; this.page.update((value) => value - 1); await this.load(); }
  async next() { if (!this.hasNext()) return; this.page.update((value) => value + 1); await this.load(); }

  async setStatus(store: Store, status: Exclude<StoreStatus, 'ARCHIVED'>) {
    if (!this.cityId()) return;
    if (store.status === 'ARCHIVED' && !store.logo?.assetId) { this.openEdit(store); return; }
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
    this.formInitialData.set({ nameAr: this.nameAr(), nameEn: this.nameEn(), addressAr: this.addressAr(), addressEn: this.addressEn(), phone: store.phone, latitude: store.location.latitude, longitude: store.location.longitude, displayOrder: store.displayOrder, mainCategoryId: store.mainCategory.id, subcategoryIds: store.subcategoryIds, zoneIds: store.zoneIds, ...Object.fromEntries(store.workingHours.flatMap((period) => [[`${period.dayOfWeek}_open`, period.opensAt], [`${period.dayOfWeek}_close`, period.closesAt]])) });
    this.fields.set(this.buildFields(false)); this.createOpen.set(true);
  }
  openDetails(store: Store) { this.detailStore.set(store); }
  readonly detailActions = computed<readonly DetailDialogAction[]>(() => {
    const store = this.detailStore();
    if (!store) return [];
    return [
      { id: 'edit', label: this.language.t('common.edit') },
      ...(store.status !== 'ACTIVE' ? [{ id: 'restore', label: this.language.t('common.restore'), tone: 'neutral' as const }] : []),
    ];
  });
  async onDetailAction(action: string) {
    const store = this.detailStore();
    if (!store) return;
    if (action === 'restore') { await this.setStatus(store, 'ACTIVE'); this.detailStore.set(null); return; }
    if (action !== 'edit') return;
    this.detailStore.set(null);
    this.openEdit(store);
  }
  detailSections(): DetailSection[] {
    const store = this.detailStore();
    if (!store) return [];
    return [
      { title: this.language.t('details.store'), items: [{ label: this.language.t('stores.phone'), value: store.phone }, { label: this.language.t('stores.address'), value: store.address }, { label: this.language.t('geo.status'), value: this.language.t(`status.${store.status}`) }, { label: this.language.t('stores.orderAcceptance'), value: store.orderAcceptanceStatus }, { label: this.language.t('catalog.displayOrder'), value: store.displayOrder }] },
      { title: this.language.t('details.categoryCoverage'), items: [{ label: this.language.t('stores.mainCategory'), value: this.categoryLabel(store.mainCategory) }, { label: this.language.t('stores.subcategories'), value: store.subcategoryIds.length }, { label: this.language.t('nav.zones'), value: store.zoneIds.length }, { label: this.language.t('geo.latitude'), value: store.location.latitude }, { label: this.language.t('geo.longitude'), value: store.location.longitude }] },
      { title: this.language.t('stores.workingHours'), items: store.workingHours.length ? store.workingHours.map((period) => ({ label: this.language.t(`stores.weekday.${period.dayOfWeek}`), value: `${period.opensAt} – ${period.closesAt}` })) : [{ label: this.language.t('stores.workingHours'), value: this.language.t('common.noData') }] },
      { title: this.language.t('products.availability'), items: [{ label: this.language.t('products.availability'), value: store.availability.isOpen ? this.language.t('common.yes') : this.language.t('common.no') }, { label: this.language.t('stores.orderAcceptance'), value: store.availability.isAcceptingOrders ? this.language.t('common.yes') : this.language.t('common.no') }, { label: this.language.t('stores.updatedAt'), value: store.updatedAt }, { label: this.language.t('geo.createdAt'), value: store.createdAt }, ...(store.archivedAt ? [{ label: this.language.t('stores.archivedAt'), value: store.archivedAt }] : []), ...(store.cover?.url ? [{ label: this.language.t('stores.cover'), value: this.language.t('common.view'), url: store.cover.url }] : [])] },
    ];
  }

  async selectMainCategory(mainCategoryId: string) {
    this.mainCategoryId.set(mainCategoryId); this.subcategoryIds.set([]);
    if (!mainCategoryId || !this.cityId()) { this.subs.set([]); return; }
    try {
      const result = await this.api.get<Page<Subcategory>>('/api/v1/super-admin/subcategories', { params: { cityId: this.cityId(), mainCategoryId, page: 1, limit: 100, status: 'ACTIVE' } });
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
    const phoneRaw = String(value['phone'] ?? '').replace(/[\s()-]/g, '');
    const phone = /^0\d{9,10}$/.test(phoneRaw) ? `+964${phoneRaw.slice(1)}` : phoneRaw;
    const workingHours: Array<{ dayOfWeek: Weekday; opensAt: string; closesAt: string }> = [];
    for (const day of WEEKDAYS) {
      const opensAt = String(value[`${day}_open`] ?? '').trim(), closesAt = String(value[`${day}_close`] ?? '').trim();
      if (!opensAt && !closesAt) continue;
      if (!opensAt || !closesAt) {
        this.formError.set(`Please provide both opening and closing times for ${day.toLowerCase()}.`);
        return;
      }
      workingHours.push({ dayOfWeek: day, opensAt, closesAt });
    }
    const restoringArchived = this.editing()?.status === 'ARCHIVED';
    if (!cityId || ((isCreate || (restoringArchived && !this.editing()?.logo?.assetId)) && !logo) || !nameAr || !nameEn || !addressAr || !addressEn || !String(value['phone'] ?? '').trim() || !value['mainCategoryId'] || !subcategoryIds.length || !zoneIds.length || value['latitude'] == null || value['longitude'] == null) {
      this.formError.set(this.language.t('common.requiredFields')); return;
    }
    const point: Position = [Number(value['longitude']), Number(value['latitude'])];
    const zoneResults = this.zones().filter((zone) => zone.status === 'ACTIVE').map((zone) => boundaryContains(zone.boundary, point));
    if (zoneResults.some((result) => result !== null) && !zoneResults.some((result) => result === true)) {
      const message = this.language.t('stores.error.INVALID_STORE_LOCATION');
      this.formError.set(message); this.notify.error(message); return;
    }
    this.saving.set(true); this.formError.set(''); let logoAssetId: string | null = null;
    try {
      if (logo) { const asset = await this.media.uploadImage(logo, 'STORE_LOGO', cityId); logoAssetId = asset.id; }
      const editing = this.editing();
      const body = {
        mainCategoryId: String(value['mainCategoryId']), phone, latitude: Number(value['latitude']), longitude: Number(value['longitude']),
        displayOrder: Number(value['displayOrder']), zoneIds, subcategoryIds,
        translations: [{ locale: 'ar', name: nameAr, address: addressAr }, { locale: 'en', name: nameEn, address: addressEn }],
        ...(logoAssetId ? { logoAssetId } : {}),
        ...(isCreate ? { status: 'ACTIVE' as const, orderAcceptanceStatus: 'ACCEPTING' as const } : restoringArchived ? { status: 'ACTIVE' as const } : {}),
        workingHours,
      };
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
      { name: 'mainCategoryId', label: this.language.t('stores.mainCategory'), type: 'select', required: true, options: this.mains().map((item) => ({ value: item.id, label: this.categoryLabel(item) })), step: 1, resetWhen: ['subcategoryIds'] },
      { name: 'subcategoryIds', label: this.language.t('stores.subcategories'), type: 'multiselect', required: true, options: this.subs().map((item) => ({ value: item.id, label: this.storeLabel(item) })), step: 1, width: 'full' },
      { name: 'zoneIds', label: this.language.t('nav.zones'), type: 'multiselect', required: true, options: this.zones().map((item) => ({ value: item.id, label: this.storeLabel(item) })), step: 1, width: 'full' },
      ...WEEKDAYS.flatMap((day) => [{ name: `${day}_open`, label: `${this.language.t(`stores.weekday.${day}`)} — Open`, type: 'time' as const, step: 2 }, { name: `${day}_close`, label: `${this.language.t(`stores.weekday.${day}`)} — Close`, type: 'time' as const, step: 2 }]),
      { name: 'locationMap', label: this.language.t('geo.mapLabel'), type: 'map', latitudeField: 'latitude', longitudeField: 'longitude', step: 3 }, { name: 'latitude', label: this.language.t('geo.latitude'), type: 'number', required: true, step: 3 }, { name: 'longitude', label: this.language.t('geo.longitude'), type: 'number', required: true, step: 3 },
      { name: 'logoFile', label: this.language.t('stores.logo'), type: 'file', required: isCreate || (this.editing()?.status === 'ARCHIVED' && !this.editing()?.logo?.assetId), width: 'full', step: 4 },
    ];
  }

  private async loadSubcategories(mainCategoryId: string) {
    if (!mainCategoryId || !this.cityId()) { this.subs.set([]); return; }
    const result = await this.api.get<Page<Subcategory>>('/api/v1/super-admin/subcategories', { params: { cityId: this.cityId(), mainCategoryId, page: 1, limit: 100, status: 'ACTIVE' } });
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
