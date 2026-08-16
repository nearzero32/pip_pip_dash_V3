import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableComponent } from '../../../shared/components/table/table';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog';
import { TableColumn } from '../../../shared/models/table-column.interface';
import { PaginationConfig } from '../../../shared/models/pagination.interface';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { LanguageService } from '../../../i18n/language.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  getApiErrorMessage,
  getApiErrorStatus,
  isApiErrorCode,
} from '../../../core/http/api-error';
import { ZonesService } from '../zones/zones.service';
import { IRAQ_MAP_FALLBACK, MapCenter, Zone } from '../zones/zones.models';
import { StoreMapComponent } from './store-map/store-map';
import { StoreZoneAssignmentComponent } from './store-zone-assignment/store-zone-assignment';
import { StoreEditorComponent } from './store-editor/store-editor';
import { StoresService } from './stores.service';
import {
  MutableStoreStatus,
  OrderAcceptanceStatus,
  Store,
  StoreRow,
  StoreStatus,
  Weekday,
  WorkingHourPeriod,
  groupWorkingHours,
  isOvernightPeriod,
  toStoreRow,
} from './stores.models';

@Component({
  selector: 'app-stores',
  standalone: true,
  imports: [
    FormsModule,
    TableComponent,
    ConfirmationDialogComponent,
    TranslatePipe,
    StoreMapComponent,
    StoreZoneAssignmentComponent,
    StoreEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stores.html',
  styleUrl: './stores.css',
})
export class StoresComponent implements OnInit, OnDestroy {
  private storesApi = inject(StoresService);
  private zonesApi = inject(ZonesService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly stores = signal<StoreRow[]>([]);
  readonly pagination = signal<PaginationConfig | null>(null);
  readonly isLoading = signal(true);
  readonly blocked = signal(false);
  readonly blockedMessage = signal('');

  readonly search = signal('');
  readonly statusFilter = signal<'' | StoreStatus>('');
  readonly zoneFilter = signal('');
  readonly page = signal(1);

  readonly zones = signal<Zone[]>([]);
  readonly zonesLoading = signal(false);
  readonly zonesError = signal(false);
  readonly extraZones = signal<Record<string, Zone>>({});
  readonly mapCenter = signal<MapCenter>(IRAQ_MAP_FALLBACK);

  readonly selectedStore = signal<Store | null>(null);
  readonly detailsLoading = signal(false);

  readonly assignmentOpen = signal(false);
  readonly selectedZoneIds = signal<string[]>([]);
  readonly savingAssignment = signal(false);
  readonly assignmentError = signal('');

  readonly statusUpdating = signal(false);
  readonly acceptanceUpdating = signal(false);
  readonly archiving = signal(false);
  readonly confirmArchive = signal(false);

  readonly editorOpen = signal(false);
  readonly editingStore = signal<Store | null>(null);

  readonly filterZones = computed(() =>
    this.zones()
      .filter((zone) => zone.status !== 'ARCHIVED')
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  readonly assignableZones = computed(() =>
    this.zones().filter((zone) => zone.status === 'ACTIVE' || zone.status === 'INACTIVE')
  );

  readonly activeZones = computed(() => this.zones().filter((zone) => zone.status === 'ACTIVE'));

  readonly selectedServiceZones = computed(() => {
    const store = this.selectedStore();
    if (!store) return [];
    return store.zoneIds
      .map((id) => this.zoneById(id))
      .filter((zone): zone is Zone => zone != null);
  });

  readonly mapZonesForStore = computed(() => {
    const extra = this.selectedServiceZones().filter(
      (zone) => !this.zones().some((item) => item.id === zone.id)
    );
    return [...this.zones(), ...extra];
  });

  readonly hoursByDay = computed(() => {
    const store = this.selectedStore();
    return store ? groupWorkingHours(store.workingHours) : [];
  });

  columns: TableColumn[] = [];
  private listSeq = 0;
  private detailsSeq = 0;
  private zonesInFlight: Promise<Zone[]> | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.columns = [
      { key: 'name', label: this.language.t('stores.name') },
      { key: 'mainCategory.name', label: this.language.t('stores.mainCategory') },
      {
        key: 'status',
        label: this.language.t('geo.status'),
        type: 'badge',
        valueMap: {
          DRAFT: this.language.t('status.DRAFT'),
          ACTIVE: this.language.t('status.ACTIVE'),
          INACTIVE: this.language.t('status.INACTIVE'),
          ARCHIVED: this.language.t('status.ARCHIVED'),
        },
        badgeClassMap: {
          DRAFT: 'badge-default',
          ACTIVE: 'badge-success',
          INACTIVE: 'badge-default',
          ARCHIVED: 'badge-danger',
        },
      },
      {
        key: 'orderAcceptanceStatus',
        label: this.language.t('stores.orderAcceptance'),
        type: 'badge',
        valueMap: {
          ACCEPTING: this.language.t('stores.ACCEPTING'),
          PAUSED: this.language.t('stores.PAUSED'),
        },
        badgeClassMap: {
          ACCEPTING: 'badge-success',
          PAUSED: 'badge-default',
        },
      },
      { key: 'serviceZoneCount', label: this.language.t('stores.serviceZoneCount') },
      {
        key: 'scheduleState',
        label: this.language.t('stores.scheduleAvailability'),
        type: 'badge',
        valueMap: {
          OPEN: this.language.t('stores.scheduleOpen'),
          CLOSED: this.language.t('stores.scheduleClosed'),
        },
        badgeClassMap: {
          OPEN: 'badge-success',
          CLOSED: 'badge-default',
        },
      },
      { key: 'createdAt', label: this.language.t('geo.createdAt'), type: 'date' },
    ];
    void this.resolveCityCenter();
    void this.loadZones();
    void this.loadList(1);
  }

  ngOnDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  onSearchInput(value: string) {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadList(1), 350);
  }

  onStatusChange(value: string) {
    this.statusFilter.set((value || '') as '' | StoreStatus);
    void this.loadList(1);
  }

  onZoneFilterChange(value: string) {
    this.zoneFilter.set(value);
    void this.loadList(1);
  }

  onPageChange(page: number) {
    void this.loadList(page);
  }

  onView(row: StoreRow) {
    this.selectedStore.set(row);
    void this.loadDetails(row.id);
  }

  closeDetails() {
    this.selectedStore.set(null);
    this.assignmentOpen.set(false);
  }

  openCreate() {
    this.editingStore.set(null);
    this.editorOpen.set(true);
  }

  openEdit() {
    const store = this.selectedStore();
    if (!store || store.status === 'ARCHIVED') return;
    this.editingStore.set(store);
    this.editorOpen.set(true);
  }

  openProducts() {
    const store = this.selectedStore();
    if (!store || store.status === 'ARCHIVED') return;
    void this.router.navigate(['/products'], { queryParams: { storeId: store.id } });
  }

  closeEditor() {
    this.editorOpen.set(false);
    this.editingStore.set(null);
  }

  async onEditorSaved(store: Store) {
    this.closeEditor();
    this.selectedStore.set(store);
    await this.loadList(this.page());
  }

  openAssignment() {
    const store = this.selectedStore();
    if (!store || store.status === 'ARCHIVED') return;
    const assignable = new Set(this.assignableZones().map((zone) => zone.id));
    this.selectedZoneIds.set(store.zoneIds.filter((id) => assignable.has(id)));
    this.assignmentError.set('');
    this.assignmentOpen.set(true);
  }

  closeAssignment() {
    this.assignmentOpen.set(false);
    this.assignmentError.set('');
  }

  onAssignmentSelection(ids: string[]) {
    this.selectedZoneIds.set(ids);
    this.assignmentError.set('');
  }

  async saveAssignment(ids: string[]) {
    const store = this.selectedStore();
    if (!store || ids.length < 1) {
      this.assignmentError.set(this.language.t('stores.needZone'));
      return;
    }
    this.savingAssignment.set(true);
    this.assignmentError.set('');
    try {
      const updated = await this.storesApi.update(store.id, { zoneIds: ids });
      this.selectedStore.set(updated);
      this.assignmentOpen.set(false);
      this.notify.success(this.language.t('stores.zonesUpdated'));
      await this.loadList(this.page());
    } catch (err) {
      this.assignmentError.set(
        getApiErrorMessage(err, this.language.t('common.unexpectedError'))
      );
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.savingAssignment.set(false);
    }
  }

  async setStatus(status: MutableStoreStatus) {
    const store = this.selectedStore();
    if (!store || store.status === 'ARCHIVED') return;
    this.statusUpdating.set(true);
    try {
      const updated = await this.storesApi.update(store.id, { status });
      this.selectedStore.set(updated);
      this.notify.success(this.language.t('stores.statusUpdated'));
      await this.loadList(this.page());
    } catch (err) {
      this.handleMutationError(err);
    } finally {
      this.statusUpdating.set(false);
    }
  }

  async setAcceptance(orderAcceptanceStatus: OrderAcceptanceStatus) {
    const store = this.selectedStore();
    if (!store || store.status === 'ARCHIVED') return;
    this.acceptanceUpdating.set(true);
    try {
      const updated = await this.storesApi.update(store.id, { orderAcceptanceStatus });
      this.selectedStore.set(updated);
      this.notify.success(this.language.t('stores.acceptanceUpdated'));
      await this.loadList(this.page());
    } catch (err) {
      this.handleMutationError(err);
    } finally {
      this.acceptanceUpdating.set(false);
    }
  }

  async runArchive() {
    const store = this.selectedStore();
    if (!store || store.status === 'ARCHIVED') return;
    this.archiving.set(true);
    try {
      const updated = await this.storesApi.archive(store.id);
      this.confirmArchive.set(false);
      this.selectedStore.set(updated);
      this.notify.success(this.language.t('stores.archived'));
      await this.loadList(this.page());
    } catch (err) {
      this.handleMutationError(err);
    } finally {
      this.archiving.set(false);
    }
  }

  zoneName(zoneId: string): string {
    return this.zoneById(zoneId)?.name ?? zoneId;
  }

  zoneStatus(zoneId: string): string {
    const zone = this.zoneById(zoneId);
    return zone ? this.language.t(`status.${zone.status}`) : '—';
  }

  weekdayLabel(day: Weekday): string {
    return this.language.t(`stores.weekday.${day}`);
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(this.language.lang() === 'ar' ? 'ar' : 'en-GB');
  }

  overnight(period: WorkingHourPeriod): boolean {
    return isOvernightPeriod(period);
  }

  statusLabel(status: StoreStatus): string {
    return this.language.t(`status.${status}`);
  }

  acceptanceLabel(status: OrderAcceptanceStatus): string {
    return this.language.t(`stores.${status}`);
  }

  private zoneById(id: string): Zone | undefined {
    return this.zones().find((zone) => zone.id === id) ?? this.extraZones()[id];
  }

  private async loadList(page: number) {
    const seq = ++this.listSeq;
    this.isLoading.set(true);
    this.page.set(page);
    try {
      const result = await this.storesApi.list({
        page,
        limit: 20,
        search: this.search().trim() || undefined,
        status: this.statusFilter() || undefined,
        zoneId: this.zoneFilter() || undefined,
      });
      if (seq !== this.listSeq) return;
      this.blocked.set(false);
      this.stores.set(result.data.map(toStoreRow));
      const pages = Math.max(1, Math.ceil(result.total / result.limit) || 1);
      this.pagination.set({
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages,
        hasNext: result.page < pages,
        hasPrev: result.page > 1,
      });
    } catch (err) {
      if (seq !== this.listSeq) return;
      if (getApiErrorStatus(err) === 403) {
        this.blocked.set(true);
        this.blockedMessage.set(
          getApiErrorMessage(err, this.language.t('stores.blocked'))
        );
        this.stores.set([]);
        this.pagination.set(null);
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      if (seq === this.listSeq) this.isLoading.set(false);
    }
  }

  private async loadDetails(storeId: string) {
    const seq = ++this.detailsSeq;
    this.detailsLoading.set(true);
    try {
      const store = await this.storesApi.get(storeId);
      if (seq !== this.detailsSeq) return;
      this.selectedStore.set(store);
      await this.resolveMissingZones(store.zoneIds);
    } catch (err) {
      if (seq !== this.detailsSeq) return;
      if (isApiErrorCode(err, 'STORE_NOT_FOUND') || getApiErrorStatus(err) === 404) {
        this.selectedStore.set(null);
        this.notify.error(this.language.t('stores.notFound'));
        void this.loadList(this.page());
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      if (seq === this.detailsSeq) this.detailsLoading.set(false);
    }
  }

  private async loadZones() {
    if (this.zonesInFlight) {
      this.zones.set(await this.zonesInFlight);
      return;
    }
    this.zonesLoading.set(true);
    this.zonesError.set(false);
    this.zonesInFlight = Promise.all([
      this.zonesApi.listAllByStatus('ACTIVE'),
      this.zonesApi.listAllByStatus('INACTIVE'),
    ]).then(([active, inactive]) => [...active, ...inactive]);
    try {
      this.zones.set(await this.zonesInFlight);
    } catch {
      this.zonesError.set(true);
      this.zones.set([]);
      this.zonesInFlight = null;
    } finally {
      this.zonesLoading.set(false);
    }
  }

  private async resolveMissingZones(zoneIds: string[]) {
    const known = new Set([
      ...this.zones().map((zone) => zone.id),
      ...Object.keys(this.extraZones()),
    ]);
    const missing = zoneIds.filter((id) => !known.has(id));
    if (!missing.length) return;
    const extra = { ...this.extraZones() };
    await Promise.all(
      missing.map(async (id) => {
        try {
          extra[id] = await this.zonesApi.get(id);
        } catch {
          /* archived or foreign: keep id-only display */
        }
      })
    );
    this.extraZones.set(extra);
  }

  private async resolveCityCenter() {
    const cityId = this.auth.identity()?.cityId;
    if (!cityId) return;
    try {
      const city = await this.zonesApi.getCity(cityId);
      this.mapCenter.set({
        longitude: city.longitude,
        latitude: city.latitude,
        zoom: 12,
      });
    } catch {
      /* keep Iraq fallback */
    }
  }

  private handleMutationError(err: unknown) {
    if (isApiErrorCode(err, 'STORE_NOT_FOUND')) {
      this.selectedStore.set(null);
      this.notify.error(this.language.t('stores.notFound'));
      void this.loadList(this.page());
      return;
    }
    this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }
}
