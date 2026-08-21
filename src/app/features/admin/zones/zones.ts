import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
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
import { ZoneMapComponent } from './zone-map/zone-map';
import { ZoneEditorComponent } from './zone-editor/zone-editor';
import { ZonesService } from './zones.service';
import { GeographyService } from '../../super-admin/geography/geography.service';
import { City } from '../../super-admin/geography/geography.models';
import { CityBoundary } from '../../super-admin/geography/geography.models';
import { IRAQ_MAP_FALLBACK, Zone, ZoneStatus } from './zones.models';

@Component({
  selector: 'app-zones',
  standalone: true,
  imports: [
    FormsModule,
    TableComponent,
    ConfirmationDialogComponent,
    TranslatePipe,
    ZoneMapComponent,
    ZoneEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './zones.html',
  styleUrl: './zones.css',
})
export class ZonesComponent implements OnInit, OnDestroy {
  private zonesApi = inject(ZonesService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);
  private auth = inject(AuthService);
  private geography = inject(GeographyService);
  readonly cities = signal<City[]>([]);
  readonly cityId = signal('');
  readonly cityBoundary = signal<CityBoundary | null>(null);

  readonly data = signal<Zone[]>([]);
  readonly pagination = signal<PaginationConfig | null>(null);
  readonly isLoading = signal(true);
  readonly blocked = signal(false);
  readonly blockedMessage = signal('');

  readonly search = signal('');
  readonly statusFilter = signal<'' | ZoneStatus>('');
  readonly page = signal(1);

  readonly mapZones = signal<Zone[]>([]);
  readonly mapLoading = signal(false);
  readonly mapError = signal(false);
  readonly mapCenter = signal(IRAQ_MAP_FALLBACK);
  readonly usedIraqFallback = signal(false);

  readonly selected = signal<Zone | null>(null);
  readonly editorOpen = signal(false);
  readonly editingZone = signal<Zone | null>(null);
  readonly confirmArchive = signal(false);
  readonly mutating = signal(false);

  readonly previewZone = computed(() => {
    const zone = this.selected();
    return zone?.status === 'ARCHIVED' ? zone : null;
  });

  columns: TableColumn[] = [];
  private listSeq = 0;
  private mapSeq = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.columns = [
      { key: 'name', label: this.language.t('zones.name') },
      {
        key: 'status',
        label: this.language.t('geo.status'),
        type: 'badge',
        valueMap: {
          ACTIVE: this.language.t('status.ACTIVE'),
          INACTIVE: this.language.t('status.INACTIVE'),
          ARCHIVED: this.language.t('status.ARCHIVED'),
        },
        badgeClassMap: {
          ACTIVE: 'badge-success',
          INACTIVE: 'badge-default',
          ARCHIVED: 'badge-danger',
        },
      },
      { key: 'createdAt', label: this.language.t('geo.createdAt'), type: 'date' },
      { key: 'updatedAt', label: this.language.t('zones.updatedAt'), type: 'date' },
    ];
    void this.loadCities();
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
    this.statusFilter.set((value || '') as '' | ZoneStatus);
    void this.loadList(1);
  }

  onPageChange(page: number) {
    void this.loadList(page);
  }

  onCityChange(cityId: string) {
    this.cityId.set(cityId); this.selected.set(null);
    void this.resolveCityCenter(); void this.loadList(1); void this.loadMapContext();
  }

  onView(row: Zone) {
    this.selected.set(row);
  }

  onMapSelect(id: string) {
    const fromMap = this.mapZones().find((z) => z.id === id);
    const fromTable = this.data().find((z) => z.id === id);
    this.selected.set(fromMap ?? fromTable ?? null);
  }

  closeDetails() {
    this.selected.set(null);
  }

  openCreate() {
    if (this.mapError()) return;
    this.editingZone.set(null);
    this.editorOpen.set(true);
  }

  openEdit() {
    const zone = this.selected();
    if (!zone || zone.status === 'ARCHIVED' || this.mapError()) return;
    this.editingZone.set(zone);
    this.editorOpen.set(true);
  }

  closeEditor() {
    this.editorOpen.set(false);
    this.editingZone.set(null);
  }

  async onEditorSaved(zone: Zone) {
    this.closeEditor();
    this.selected.set(zone);
    await Promise.all([this.loadList(this.page()), this.loadMapContext()]);
  }

  async setStatus(status: 'ACTIVE' | 'INACTIVE') {
    const zone = this.selected();
    if (!zone || zone.status === 'ARCHIVED') return;
    this.mutating.set(true);
    try {
      const updated = await this.zonesApi.update(this.cityId(), zone.id, { status });
      this.selected.set(updated);
      this.notify.success(this.language.t('zones.statusUpdated'));
      await Promise.all([this.loadList(this.page()), this.loadMapContext()]);
    } catch (err) {
      this.handleMutationError(err);
    } finally {
      this.mutating.set(false);
    }
  }

  async runArchive() {
    const zone = this.selected();
    if (!zone) return;
    this.mutating.set(true);
    try {
      const updated = await this.zonesApi.archive(this.cityId(), zone.id);
      this.confirmArchive.set(false);
      this.selected.set(updated);
      this.notify.success(this.language.t('zones.archived'));
      await Promise.all([this.loadList(this.page()), this.loadMapContext()]);
    } catch (err) {
      this.handleMutationError(err);
    } finally {
      this.mutating.set(false);
    }
  }

  statusLabel(status: ZoneStatus): string {
    return this.language.t(`status.${status}`);
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(this.language.lang() === 'ar' ? 'ar' : 'en-GB');
  }

  private async loadList(page: number) {
    const seq = ++this.listSeq;
    this.isLoading.set(true);
    this.page.set(page);
    try {
      if (!this.cityId()) return;
      const result = await this.zonesApi.list(this.cityId(), {
        page,
        limit: 20,
        search: this.search().trim() || undefined,
        status: this.statusFilter() || undefined,
      });
      if (seq !== this.listSeq) return;
      this.blocked.set(false);
      this.data.set(result.data);
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
          getApiErrorMessage(err, this.language.t('zones.blocked'))
        );
        this.data.set([]);
        this.pagination.set(null);
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      if (seq === this.listSeq) this.isLoading.set(false);
    }
  }

  private async loadMapContext() {
    const seq = ++this.mapSeq;
    this.mapLoading.set(true);
    this.mapError.set(false);
    try {
      const [active, inactive] = await Promise.all([
        this.zonesApi.listAllByStatus(this.cityId(), 'ACTIVE'),
        this.zonesApi.listAllByStatus(this.cityId(), 'INACTIVE'),
      ]);
      if (seq !== this.mapSeq) return;
      this.mapZones.set([...active, ...inactive]);
    } catch {
      if (seq !== this.mapSeq) return;
      this.mapError.set(true);
      this.mapZones.set([]);
    } finally {
      if (seq === this.mapSeq) this.mapLoading.set(false);
    }
  }

  private async resolveCityCenter() {
    const cityId = this.cityId();
    if (!cityId) {
      this.usedIraqFallback.set(true);
      return;
    }
    try {
      const city = await this.zonesApi.getCity(cityId);
      this.cityBoundary.set(city.boundary ?? null);
      this.mapCenter.set({
        longitude: city.longitude,
        latitude: city.latitude,
        zoom: 12,
      });
    } catch {
      this.cityBoundary.set(null);
      this.usedIraqFallback.set(true);
    }
  }

  private async loadCities() {
    try {
      const result = await this.geography.listCities(1, 100);
      this.cities.set(result.data);
      const initial = result.data.find((city) => city.status !== 'ARCHIVED')?.id ?? '';
      if (initial) this.onCityChange(initial);
      else this.isLoading.set(false);
    } catch { this.isLoading.set(false); this.notify.error(this.language.t('common.unexpectedError')); }
  }

  private handleMutationError(err: unknown) {
    if (isApiErrorCode(err, 'ZONE_ARCHIVED')) {
      this.notify.error(this.language.t('zones.archivedError'));
      void this.loadList(this.page());
      void this.loadMapContext();
      return;
    }
    this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }
}
