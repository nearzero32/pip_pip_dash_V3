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

@Component({
  selector: 'app-main-categories',
  standalone: true,
  imports: [
    FormsModule,
    TableComponent,
    ConfirmationDialogComponent,
    TranslatePipe,
    MainCategoryEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main-categories.html',
  styleUrl: './main-categories.css',
})
export class MainCategoriesComponent implements OnInit, OnDestroy {
  private catalog = inject(CatalogService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

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
    this.statusFilter.set((value || '') as '' | CatalogStatus);
    void this.loadList(1);
  }

  onPageChange(page: number) {
    void this.loadList(page);
  }

  onView(row: MainCategory) {
    this.selected.set(row);
  }

  closeDetails() {
    this.selected.set(null);
  }

  openCreate() {
    this.editing.set(null);
    this.editorOpen.set(true);
  }

  openEdit() {
    const row = this.selected();
    if (!row || row.status === 'ARCHIVED') return;
    this.editing.set(row);
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
      const updated = await this.catalog.updateMainCategory(row.id, { status });
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
      const updated = await this.catalog.archiveMainCategory(row.id);
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
      const result = await this.catalog.listMainCategories({
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

  private handleMutationError(err: unknown) {
    if (isApiErrorCode(err, 'CITY_NOT_ACTIVE')) {
      this.notify.error(this.language.t('catalog.cityNotActive'));
      return;
    }
    this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }
}
