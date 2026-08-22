import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableComponent } from '../../../../shared/components/table/table';
import { ConfirmationDialogComponent } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { TableColumn } from '../../../../shared/models/table-column.interface';
import { PaginationConfig } from '../../../../shared/models/pagination.interface';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../i18n/language.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import {
  getApiErrorMessage,
  getApiErrorStatus,
  isApiErrorCode,
} from '../../../../core/http/api-error';
import { CatalogService } from '../catalog.service';
import { CatalogStatus, MainCategory, MutableCatalogStatus } from '../catalog.models';
import { MainCategoryEditorComponent } from './main-category-editor/main-category-editor';
import { FormDialogComponent } from '../../../../shared/components/form-dialog/form-dialog';
import { FormField } from '../../../../shared/models/form-field.interface';
import { MediaApiService } from '../../../../core/media/media-api.service';
import { GeographyService } from '../../../super-admin/geography/geography.service';
import { City } from '../../../super-admin/geography/geography.models';

@Component({
  selector: 'app-main-categories',
  standalone: true,
  imports: [
    FormsModule,
    TableComponent,
    ConfirmationDialogComponent,
    TranslatePipe,
    FormDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main-categories.html',
  styleUrl: './main-categories.css',
})
export class MainCategoriesComponent implements OnInit, OnDestroy {
  private catalog = inject(CatalogService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);
  private geography = inject(GeographyService);
  private media = inject(MediaApiService);

  readonly cities = signal<City[]>([]);
  readonly cityId = signal('');

  readonly data = signal<MainCategory[]>([]);
  readonly pagination = signal<PaginationConfig | null>(null);
  readonly isLoading = signal(true);
  readonly blocked = signal(false);
  readonly blockedMessage = signal('');
  readonly search = signal('');
  readonly statusFilter = signal<'' | CatalogStatus>('');
  readonly page = signal(1);
  readonly selected = signal<MainCategory | null>(null);
  readonly editorOpen = signal(false);
  readonly editing = signal<MainCategory | null>(null);
  readonly confirmArchive = signal(false);
  readonly mutating = signal(false);
  readonly fields = signal<FormField[]>([]);

  columns: TableColumn[] = [];
  private listSeq = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.columns = [
      { key: 'image.url', label: this.language.t('catalog.image'), type: 'image' },
      { key: 'name', label: this.language.t('catalog.name') },
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
      { key: 'displayOrder', label: this.language.t('catalog.displayOrder') },
      { key: 'createdAt', label: this.language.t('geo.createdAt'), type: 'date' },
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
    this.statusFilter.set((value || '') as '' | CatalogStatus);
    void this.loadList(1);
  }

  onPageChange(page: number) {
    void this.loadList(page);
  }

  onCityChange(cityId: string) {
    this.cityId.set(cityId);
    this.selected.set(null);
    void this.loadList(1);
  }

  onView(row: MainCategory) {
    this.selected.set(row);
  }

  closeDetails() {
    this.selected.set(null);
  }

  openCreate() {
    this.editing.set(null);
    this.fields.set(this.buildFields(true, this.suggestDisplayOrder()));
    this.editorOpen.set(true);
  }

  openEdit() {
    const row = this.selected();
    if (!row || row.status === 'ARCHIVED') return;
    this.editing.set(row);
    this.fields.set(this.buildFields(false));
    this.editorOpen.set(true);
  }

  async onSaved(row: MainCategory) {
    this.editorOpen.set(false);
    this.editing.set(null);
    this.selected.set(row);
    await this.loadList(this.page());
  }

  async setStatus(status: MutableCatalogStatus) {
    const row = this.selected();
    if (!row || row.status === 'ARCHIVED') return;
    this.mutating.set(true);
    try {
      const updated = await this.catalog.updateMainCategory(row.id, this.cityId(), { status });
      this.selected.set(updated);
      this.notify.success(this.language.t('catalog.mainUpdated'));
      await this.loadList(this.page());
    } catch (err) {
      this.handleMutationError(err);
    } finally {
      this.mutating.set(false);
    }
  }

  async runArchive() {
    const row = this.selected();
    if (!row) return;
    this.mutating.set(true);
    try {
      const updated = await this.catalog.archiveMainCategory(row.id, this.cityId());
      this.confirmArchive.set(false);
      this.selected.set(updated);
      this.notify.success(this.language.t('catalog.mainArchived'));
      await this.loadList(this.page());
    } catch (err) {
      this.handleMutationError(err);
    } finally {
      this.mutating.set(false);
    }
  }

  statusLabel(status: CatalogStatus): string {
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
      if (!this.cityId()) {
        this.data.set([]);
        this.pagination.set(null);
        return;
      }
      const result = await this.catalog.listMainCategories({
        cityId: this.cityId(),
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
        this.blockedMessage.set(getApiErrorMessage(err, this.language.t('catalog.blocked')));
        this.data.set([]);
        this.pagination.set(null);
        return;
      }
      if (isApiErrorCode(err, 'CITY_NOT_ACTIVE')) {
        this.blocked.set(true);
        this.blockedMessage.set(this.language.t('catalog.cityNotActive'));
        this.data.set([]);
        this.pagination.set(null);
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      if (seq === this.listSeq) this.isLoading.set(false);
    }
  }

  async saveForm(value: Record<string, unknown>) {
    this.mutating.set(true);
    const original = this.editing();
    const file = value['image'] instanceof File ? value['image'] : null;
    try {
      let imageAssetId: string | undefined;
      if (file) imageAssetId = (await this.media.uploadImage(file, 'CATEGORY_IMAGE', this.cityId())).id;
      let row: MainCategory;
      if (original) {
        row = await this.catalog.updateMainCategory(original.id, this.cityId(), {
          name: String(value['name']).trim(), status: value['status'] as MutableCatalogStatus,
          displayOrder: Number(value['displayOrder']), ...(imageAssetId ? { imageAssetId } : {}),
        });
      } else {
        if (!imageAssetId) return;
        row = await this.catalog.createMainCategory({ cityId: this.cityId(), name: String(value['name']).trim(), imageAssetId, status: value['status'] as MutableCatalogStatus, displayOrder: Number(value['displayOrder']) });
      }
      await this.onSaved(row);
    } catch (err) { this.handleMutationError(err); }
    finally { this.mutating.set(false); }
  }

  private async loadCities() {
    try {
      const result = await this.geography.listCities(1, 100);
      this.cities.set(result.data);
      const initial = result.data.find((city) => city.status !== 'ARCHIVED')?.id ?? '';
      if (initial) this.onCityChange(initial);
      else this.isLoading.set(false);
    } catch {
      this.isLoading.set(false);
      this.notify.error(this.language.t('common.unexpectedError'));
    }
  }

  private suggestDisplayOrder(): number {
    const highest = this.data().reduce(
      (max, category) => Math.max(max, category.displayOrder),
      0,
    );
    return highest + 1;
  }

  private buildFields(create: boolean, displayOrder?: number): FormField[] {
    return [
      { name: 'name', label: this.language.t('catalog.name'), type: 'text', required: true, step: 0 },
      {
        name: 'status', label: this.language.t('geo.status'), type: 'select', required: true,
        step: 0, defaultValue: create ? 'ACTIVE' : undefined,
        options: [{ value: 'ACTIVE', label: this.language.t('status.ACTIVE') }, { value: 'INACTIVE', label: this.language.t('status.INACTIVE') }],
      },
      {
        name: 'displayOrder', label: this.language.t('catalog.displayOrder'), type: 'number',
        required: true, step: 0, defaultValue: create ? displayOrder : undefined,
        hint: create ? 'Suggested next order. You can change it before saving.' : undefined,
      },
      { name: 'image', label: this.language.t('catalog.image'), type: 'file', required: create, width: 'full', step: 1 },
    ];
  }

  private handleMutationError(err: unknown) {
    if (isApiErrorCode(err, 'CITY_NOT_ACTIVE')) {
      this.notify.error(this.language.t('catalog.cityNotActive'));
      return;
    }
    this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }
}
