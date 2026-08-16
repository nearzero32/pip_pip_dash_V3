import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../i18n/language.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import {
  getApiErrorCode,
  getApiErrorMessage,
  getApiErrorStatus,
} from '../../../../core/http/api-error';
import { MediaApiService } from '../../../../core/media/media-api.service';
import { MediaClientError } from '../../../../core/media/media.models';
import { IRAQ_MAP_FALLBACK, MapCenter, Zone } from '../../zones/zones.models';
import { CatalogLookupService } from '../catalog-lookup.service';
import { MainCategory, Subcategory } from '../catalog-lookup.models';
import { StoreLocationMapComponent } from '../store-location-map/store-location-map';
import { StoreZonePickerComponent } from '../store-zone-picker/store-zone-picker';
import { StoresService } from '../stores.service';
import {
  Store,
  StoreCreateBody,
  StoreLocation,
  StorePatch,
  WEEKDAYS,
  Weekday,
  WorkingHourPeriod,
  normalizeClock,
  sameIdSet,
  sameWorkingHours,
  validateStoreName,
  validateWorkingHoursDraft,
} from '../stores.models';

const ERROR_STEP: Record<string, 1 | 2 | 3 | 4> = {
  STORE_REQUIRES_SUBCATEGORY: 1,
  MAIN_CATEGORY_NOT_FOUND: 1,
  MAIN_CATEGORY_ARCHIVED: 1,
  SUBCATEGORY_NOT_FOUND: 1,
  INVALID_STORE_LOCATION: 2,
  STORE_REQUIRES_SERVICE_ZONE: 2,
  ZONE_NOT_FOUND: 2,
  INVALID_WORKING_HOURS: 3,
  WORKING_HOURS_OVERLAP: 3,
  MEDIA_NOT_FOUND: 4,
  MEDIA_NOT_ATTACHABLE: 4,
  MEDIA_STORAGE_UNAVAILABLE: 4,
};

@Component({
  selector: 'app-store-editor',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ConfirmationDialogComponent,
    StoreLocationMapComponent,
    StoreZonePickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './store-editor.html',
  styleUrl: './store-editor.css',
})
export class StoreEditorComponent implements OnInit, OnDestroy {
  private catalog = inject(CatalogLookupService);
  private storesApi = inject(StoresService);
  private media = inject(MediaApiService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  readonly store = input<Store | null>(null);
  readonly assignableZones = input<Zone[]>([]);
  readonly activeZones = input<Zone[]>([]);
  readonly fallbackCenter = input<MapCenter>(IRAQ_MAP_FALLBACK);
  readonly zonesError = input(false);

  readonly closed = output<void>();
  readonly saved = output<Store>();

  readonly step = signal<1 | 2 | 3 | 4>(1);
  readonly name = signal('');
  readonly phone = signal('');
  readonly address = signal('');
  readonly displayOrder = signal(0);
  readonly mainCategoryId = signal('');
  readonly subcategoryIds = signal<string[]>([]);
  readonly location = signal<StoreLocation | null>(null);
  readonly insideActiveHint = signal<boolean | null>(null);
  readonly zoneIds = signal<string[]>([]);
  readonly workingHours = signal<WorkingHourPeriod[]>([]);
  readonly logoFile = signal<File | null>(null);
  readonly coverFile = signal<File | null>(null);
  readonly removeCover = signal(false);
  readonly saving = signal(false);
  readonly submitError = signal('');
  readonly stepError = signal('');
  readonly catalogBlocked = signal(false);
  readonly catalogBlockedMessage = signal('');
  readonly mains = signal<MainCategory[]>([]);
  readonly subs = signal<Subcategory[]>([]);
  readonly subsLoading = signal(false);
  readonly confirmDiscard = signal(false);

  readonly weekdays = WEEKDAYS;
  readonly isCreate = computed(() => this.store() == null);
  readonly selectedMain = computed(
    () => this.mains().find((item) => item.id === this.mainCategoryId()) ?? null
  );
  readonly hoursGroups = computed(() =>
    WEEKDAYS.map((day) => ({
      day,
      items: this.workingHours()
        .map((period, index) => ({ period, index }))
        .filter((item) => item.period.dayOfWeek === day),
    }))
  );

  private logoPreviewUrl: string | null = null;
  private coverPreviewUrl: string | null = null;
  private original: Store | null = null;
  private subSeq = 0;

  readonly logoPreview = signal<string | null>(null);
  readonly coverPreview = signal<string | null>(null);

  ngOnInit() {
    const store = this.store();
    this.original = store;
    if (store) {
      this.name.set(store.name);
      this.phone.set(store.phone);
      this.address.set(store.address);
      this.displayOrder.set(store.displayOrder);
      this.mainCategoryId.set(store.mainCategory.id);
      this.subcategoryIds.set([...store.subcategoryIds]);
      this.location.set({ ...store.location });
      this.zoneIds.set([...store.zoneIds]);
      this.workingHours.set(store.workingHours.map((period) => ({ ...period })));
      this.logoPreview.set(store.logo?.url ?? null);
      this.coverPreview.set(store.cover?.url ?? null);
    }
    void this.loadMains();
    if (store) void this.loadSubs(store.mainCategory.id);
  }

  ngOnDestroy() {
    this.revokePreviews();
  }

  requestClose() {
    if (this.saving()) return;
    if (this.isDirty()) {
      this.confirmDiscard.set(true);
      return;
    }
    this.closed.emit();
  }

  discard() {
    this.confirmDiscard.set(false);
    this.closed.emit();
  }

  goNext() {
    if (this.saving()) return;
    const current = this.step();
    const error = this.validateStep(current);
    if (error) {
      this.stepError.set(this.language.t(error));
      return;
    }
    this.stepError.set('');
    this.step.set((current + 1) as 2 | 3 | 4);
  }

  goPrev() {
    if (this.saving()) return;
    const current = this.step();
    if (current > 1) this.step.set((current - 1) as 1 | 2 | 3);
  }

  goStep(step: 1 | 2 | 3 | 4) {
    if (this.saving()) return;
    this.step.set(step);
  }

  onMainCategoryChange(id: string) {
    this.mainCategoryId.set(id);
    this.subcategoryIds.set([]);
    void this.loadSubs(id);
  }

  toggleSubcategory(id: string) {
    const current = this.subcategoryIds();
    this.subcategoryIds.set(
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  onLocation(point: StoreLocation & { insideActive: boolean }) {
    this.location.set({ latitude: point.latitude, longitude: point.longitude });
    this.insideActiveHint.set(point.insideActive);
  }

  onZones(ids: string[]) {
    this.zoneIds.set(ids);
  }

  setDisplayOrder(value: number | string) {
    const n = typeof value === 'number' ? value : Number(value);
    this.displayOrder.set(Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0);
  }

  addPeriod(day: Weekday) {
    this.workingHours.set([
      ...this.workingHours(),
      { dayOfWeek: day, opensAt: '09:00', closesAt: '17:00' },
    ]);
  }

  removePeriod(index: number) {
    this.workingHours.set(this.workingHours().filter((_, i) => i !== index));
  }

  setPeriodTime(index: number, field: 'opensAt' | 'closesAt', value: string) {
    const next = this.workingHours().map((period, i) =>
      i === index ? { ...period, [field]: value } : period
    );
    this.workingHours.set(next);
  }

  onLogoFile(file: File | undefined) {
    if (!file) return;
    this.logoFile.set(file);
    if (this.logoPreviewUrl) URL.revokeObjectURL(this.logoPreviewUrl);
    this.logoPreviewUrl = URL.createObjectURL(file);
    this.logoPreview.set(this.logoPreviewUrl);
  }

  onCoverFile(file: File | undefined) {
    if (!file) return;
    this.removeCover.set(false);
    this.coverFile.set(file);
    if (this.coverPreviewUrl) URL.revokeObjectURL(this.coverPreviewUrl);
    this.coverPreviewUrl = URL.createObjectURL(file);
    this.coverPreview.set(this.coverPreviewUrl);
  }

  clearCover() {
    this.coverFile.set(null);
    this.removeCover.set(true);
    if (this.coverPreviewUrl) URL.revokeObjectURL(this.coverPreviewUrl);
    this.coverPreviewUrl = null;
    this.coverPreview.set(null);
  }

  async submit() {
    if (this.saving()) return;
    for (const step of [1, 2, 3, 4] as const) {
      const error = this.validateStep(step);
      if (error) {
        this.step.set(step);
        this.stepError.set(this.language.t(error));
        return;
      }
    }
    this.stepError.set('');
    this.submitError.set('');
    this.saving.set(true);
    const createdAssets: string[] = [];
    try {
      if (this.isCreate()) {
        const created = await this.createStore(createdAssets);
        this.notify.success(this.language.t('stores.created'));
        this.saved.emit(created);
        return;
      }
      const patched = await this.patchStore(createdAssets);
      if (!patched) {
        this.notify.success(this.language.t('stores.noChanges'));
        this.closed.emit();
        return;
      }
      this.notify.success(this.language.t('stores.updated'));
      this.saved.emit(patched);
    } catch (err) {
      await Promise.all(createdAssets.map((id) => this.media.bestEffortDelete(id)));
      this.handleSubmitError(err);
    } finally {
      this.saving.set(false);
    }
  }

  weekdayLabel(day: Weekday): string {
    return this.language.t(`stores.weekday.${day}`);
  }

  coordText(): string {
    const location = this.location();
    if (!location) return this.language.t('stores.locationUnset');
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }

  private async createStore(createdAssets: string[]): Promise<Store> {
    const logo = await this.media.uploadImage(this.logoFile()!, 'STORE_LOGO');
    createdAssets.push(logo.id);
    let coverId: string | undefined;
    if (this.coverFile()) {
      const cover = await this.media.uploadImage(this.coverFile()!, 'STORE_IMAGE');
      createdAssets.push(cover.id);
      coverId = cover.id;
    }
    const location = this.location()!;
    const body: StoreCreateBody = {
      mainCategoryId: this.mainCategoryId(),
      name: this.name().trim(),
      phone: this.phone().trim(),
      address: this.address().trim(),
      latitude: location.latitude,
      longitude: location.longitude,
      logoAssetId: logo.id,
      ...(coverId ? { coverAssetId: coverId } : {}),
      displayOrder: this.displayOrder(),
      zoneIds: this.zoneIds(),
      subcategoryIds: this.usableSelectedSubIds(),
      workingHours: this.normalizedHours(),
    };
    return this.storesApi.create(body);
  }

  private async patchStore(createdAssets: string[]): Promise<Store | null> {
    const original = this.original!;
    const patch: StorePatch = {};
    if (this.name().trim() !== original.name) patch.name = this.name().trim();
    if (this.phone().trim() !== original.phone) patch.phone = this.phone().trim();
    if (this.address().trim() !== original.address) patch.address = this.address().trim();
    if (this.displayOrder() !== original.displayOrder) patch.displayOrder = this.displayOrder();

    const mainChanged = this.mainCategoryId() !== original.mainCategory.id;
    const subsChanged = !sameIdSet(this.subcategoryIds(), original.subcategoryIds);
    if (mainChanged) {
      patch.mainCategoryId = this.mainCategoryId();
      patch.subcategoryIds = this.usableSelectedSubIds();
    } else if (subsChanged) {
      patch.subcategoryIds = this.usableSelectedSubIds();
    }

    const location = this.location()!;
    if (
      location.latitude !== original.location.latitude ||
      location.longitude !== original.location.longitude
    ) {
      patch.latitude = location.latitude;
      patch.longitude = location.longitude;
    }

    if (!sameIdSet(this.zoneIds(), original.zoneIds)) patch.zoneIds = this.zoneIds();
    if (!sameWorkingHours(this.normalizedHours(), original.workingHours)) {
      patch.workingHours = this.normalizedHours();
    }

    if (this.logoFile()) {
      const logo = await this.media.uploadImage(this.logoFile()!, 'STORE_LOGO');
      createdAssets.push(logo.id);
      patch.logoAssetId = logo.id;
    }
    if (this.coverFile()) {
      const cover = await this.media.uploadImage(this.coverFile()!, 'STORE_IMAGE');
      createdAssets.push(cover.id);
      patch.coverAssetId = cover.id;
    } else if (this.removeCover() && original.cover) {
      patch.coverAssetId = null;
    }

    if (Object.keys(patch).length === 0) return null;
    return this.storesApi.update(original.id, patch);
  }

  private usableSelectedSubIds(): string[] {
    const usable = new Set(this.subs().map((item) => item.id));
    return this.subcategoryIds().filter((id) => usable.has(id));
  }

  private normalizedHours(): WorkingHourPeriod[] {
    return this.workingHours().map((period) => ({
      dayOfWeek: period.dayOfWeek,
      opensAt: normalizeClock(period.opensAt) ?? period.opensAt,
      closesAt: normalizeClock(period.closesAt) ?? period.closesAt,
    }));
  }

  private validateStep(step: 1 | 2 | 3 | 4): string | null {
    if (step === 1) {
      const nameError = validateStoreName(this.name());
      if (nameError) return nameError;
      if (!this.phone().trim() || this.phone().trim().length < 8) return 'stores.phoneRequired';
      if (!this.address().trim()) return 'stores.addressRequired';
      if (!Number.isInteger(this.displayOrder()) || this.displayOrder() < 0) {
        return 'stores.displayOrderInvalid';
      }
      if (this.catalogBlocked()) return 'stores.catalogBlocked';
      if (!this.mainCategoryId()) return 'stores.mainRequired';
      if (this.subs().length === 0) return 'stores.noSubcategories';
      const usable = this.usableSelectedSubIds();
      const original = this.original;
      const membershipChanging =
        !original ||
        this.mainCategoryId() !== original.mainCategory.id ||
        !sameIdSet(this.subcategoryIds(), original.subcategoryIds);
      if ((this.isCreate() || membershipChanging) && usable.length < 1) {
        return 'stores.needSubcategory';
      }
    }
    if (step === 2) {
      if (this.activeZones().length === 0) return 'stores.noActiveZones';
      if (!this.location()) return 'stores.locationRequired';
      if (this.zoneIds().length < 1) return 'stores.needZone';
    }
    if (step === 3) {
      const hoursError = validateWorkingHoursDraft(this.workingHours());
      if (hoursError === 'equal') return 'stores.hoursEqual';
      if (hoursError === 'overlap') return 'stores.hoursOverlap';
      if (hoursError === 'invalid') return 'stores.hoursInvalid';
    }
    if (step === 4) {
      if (this.isCreate() && !this.logoFile()) return 'stores.logoRequired';
      if (!this.isCreate() && !this.original?.logo && !this.logoFile()) return 'stores.logoRequired';
      if (this.logoFile() && this.coverFile() && this.logoFile() === this.coverFile()) {
        return 'stores.mediaMustDiffer';
      }
    }
    return null;
  }

  private isDirty(): boolean {
    if (this.isCreate()) {
      return Boolean(
        this.name() ||
          this.phone() ||
          this.address() ||
          this.mainCategoryId() ||
          this.location() ||
          this.logoFile() ||
          this.coverFile() ||
          this.zoneIds().length ||
          this.workingHours().length
      );
    }
    const original = this.original!;
    const location = this.location();
    return (
      this.name().trim() !== original.name ||
      this.phone().trim() !== original.phone ||
      this.address().trim() !== original.address ||
      this.displayOrder() !== original.displayOrder ||
      this.mainCategoryId() !== original.mainCategory.id ||
      !sameIdSet(this.subcategoryIds(), original.subcategoryIds) ||
      !location ||
      location.latitude !== original.location.latitude ||
      location.longitude !== original.location.longitude ||
      !sameIdSet(this.zoneIds(), original.zoneIds) ||
      !sameWorkingHours(this.normalizedHours(), original.workingHours) ||
      Boolean(this.logoFile()) ||
      Boolean(this.coverFile()) ||
      this.removeCover()
    );
  }

  private async loadMains() {
    try {
      this.mains.set(await this.catalog.listUsableMainCategories());
    } catch (err) {
      if (getApiErrorStatus(err) === 403) {
        this.catalogBlocked.set(true);
        this.catalogBlockedMessage.set(
          getApiErrorMessage(err, this.language.t('stores.catalogBlocked'))
        );
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }

  private async loadSubs(mainCategoryId: string) {
    if (!mainCategoryId) {
      this.subs.set([]);
      return;
    }
    const seq = ++this.subSeq;
    this.subsLoading.set(true);
    try {
      const rows = await this.catalog.listUsableSubcategories(mainCategoryId);
      if (seq !== this.subSeq) return;
      this.subs.set(rows);
    } catch (err) {
      if (seq !== this.subSeq) return;
      if (getApiErrorStatus(err) === 403) {
        this.catalogBlocked.set(true);
        this.catalogBlockedMessage.set(
          getApiErrorMessage(err, this.language.t('stores.catalogBlocked'))
        );
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      if (seq === this.subSeq) this.subsLoading.set(false);
    }
  }

  private handleSubmitError(err: unknown) {
    if (err instanceof MediaClientError) {
      this.step.set(4);
      const key = `stores.media.${err.code}`;
      this.submitError.set(this.language.t(key));
      this.notify.error(this.language.t(key));
      return;
    }
    const code = getApiErrorCode(err);
    if (code && ERROR_STEP[code]) this.step.set(ERROR_STEP[code]);
    const mapped = code ? this.language.t(`stores.error.${code}`) : '';
    const message =
      mapped && mapped !== `stores.error.${code}`
        ? mapped
        : getApiErrorMessage(err, this.language.t('common.unexpectedError'));
    this.submitError.set(message);
    this.notify.error(message);
  }

  private revokePreviews() {
    if (this.logoPreviewUrl) URL.revokeObjectURL(this.logoPreviewUrl);
    if (this.coverPreviewUrl) URL.revokeObjectURL(this.coverPreviewUrl);
    this.logoPreviewUrl = null;
    this.coverPreviewUrl = null;
  }
}
