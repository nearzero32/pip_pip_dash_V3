import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
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
import { ProductCatalogService } from '../product-catalog.service';
import {
  MutableCatalogStatus,
  StoreCategory,
  StoreCategoryRow,
  StoreCategoryStatus,
  toStoreCategoryRows,
} from '../product-catalog.models';
import { StoreCategoryEditorComponent } from './store-category-editor/store-category-editor';

@Component({
  selector: 'app-store-categories',
  standalone: true,
  imports: [
    FormsModule,
    TableComponent,
    ConfirmationDialogComponent,
    TranslatePipe,
    StoreCategoryEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './store-categories.html',
  styleUrl: './store-categories.css',
})
export class StoreCategoriesComponent implements OnDestroy {
  private api = inject(ProductCatalogService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  readonly storeId = input.required<string>();
  readonly mutationsDisabled = input(false);
  readonly reloadToken = input(0);

  readonly archivedCascade = output<void>();
  readonly storeArchived = output<void>();
  readonly contextChanged = output<StoreCategory[]>();

  readonly rows = signal<StoreCategoryRow[]>([]);
  readonly allLoaded = signal<StoreCategory[]>([]);
  readonly editorContext = signal<StoreCategory[]>([]);
  readonly pagination = signal<PaginationConfig | null>(null);
  readonly isLoading = signal(true);
  readonly blocked = signal(false);
  readonly blockedMessage = signal('');
  readonly search = signal('');
  readonly statusFilter = signal<'' | StoreCategoryStatus>('');
  readonly parentFilter = signal('');
  readonly page = signal(1);
  readonly selected = signal<StoreCategory | null>(null);
  readonly editorOpen = signal(false);
  readonly editing = signal<StoreCategory | null>(null);
  readonly confirmArchive = signal(false);
  readonly mutating = signal(false);
  readonly archiveChildrenError = signal(false);

  columns: TableColumn[] = [];
  private listSeq = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly roots = computed(() =>
    this.editorContext().filter((item) => item.parentCategoryId == null && item.status !== 'ARCHIVED')
  );

  readonly selectedHasChildren = computed(() => {
    const row = this.selected();
    if (!row) return false;
    return this.editorContext().some(
      (item) => item.parentCategoryId === row.id && item.status !== 'ARCHIVED'
    );
  });

  constructor() {
    this.columns = [
      { key: 'displayName', label: this.language.t('catalog.name') },
      {
        key: 'hierarchyLabel',
        label: this.language.t('products.hierarchy'),
        valueMap: {
          'products.storeRoot': this.language.t('products.storeRoot'),
          'products.storeChild': this.language.t('products.storeChild'),
        },
      },
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
    ];

    effect(() => {
      const storeId = this.storeId();
      this.reloadToken();
      this.selected.set(null);
      this.page.set(1);
      if (storeId) void this.loadList(1);
    });
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
    this.statusFilter.set((value || '') as '' | StoreCategoryStatus);
    void this.loadList(1);
  }

  onParentChange(value: string) {
    this.parentFilter.set(value);
    void this.loadList(1);
  }

  onPageChange(page: number) {
    void this.loadList(page);
  }

  onView(row: StoreCategoryRow) {
    this.selected.set(row);
    this.archiveChildrenError.set(false);
  }

  closeDetails() {
    this.selected.set(null);
    this.archiveChildrenError.set(false);
  }

  openCreate() {
    if (this.mutationsDisabled()) return;
    this.editing.set(null);
    this.editorOpen.set(true);
  }

  openEdit() {
    const row = this.selected();
    if (!row || row.status === 'ARCHIVED' || this.mutationsDisabled()) return;
    this.editing.set(row);
    this.editorOpen.set(true);
  }

  async onSaved(row: StoreCategory) {
    this.editorOpen.set(false);
    this.editing.set(null);
    this.selected.set(row);
    await this.loadList(this.page());
  }

  async setStatus(status: MutableCatalogStatus) {
    const row = this.selected();
    if (!row || row.status === 'ARCHIVED' || this.mutationsDisabled()) return;
    this.mutating.set(true);
    try {
      const updated = await this.api.updateStoreCategory(this.storeId(), row.id, { status });
      this.selected.set(updated);
      this.notify.success(this.language.t('products.categoryUpdated'));
      await this.loadList(this.page());
    } catch (err) {
      this.handleMutationError(err);
    } finally {
      this.mutating.set(false);
    }
  }

  async runArchive() {
    const row = this.selected();
    if (!row || this.mutationsDisabled()) return;
    this.mutating.set(true);
    this.archiveChildrenError.set(false);
    try {
      const updated = await this.api.archiveStoreCategory(this.storeId(), row.id);
      this.confirmArchive.set(false);
      this.selected.set(updated);
      this.notify.success(this.language.t('products.categoryArchived'));
      await this.loadList(this.page());
      this.archivedCascade.emit();
    } catch (err) {
      if (isApiErrorCode(err, 'STORE_CATEGORY_HAS_CHILDREN')) {
        this.confirmArchive.set(false);
        this.archiveChildrenError.set(true);
        this.notify.error(this.language.t('products.categoryHasChildren'));
        return;
      }
      this.handleMutationError(err);
    } finally {
      this.mutating.set(false);
    }
  }

  statusLabel(status: StoreCategoryStatus): string {
    return this.language.t(`status.${status}`);
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(this.language.lang() === 'ar' ? 'ar' : 'en-GB');
  }

  private async loadList(page: number) {
    const storeId = this.storeId();
    const seq = ++this.listSeq;
    this.isLoading.set(true);
    this.page.set(page);
    try {
      const parent = this.parentFilter();
      const query = {
        search: this.search().trim() || undefined,
        status: this.statusFilter() || undefined,
        ...(parent === 'roots'
          ? { parentCategoryId: 'null' as const }
          : parent
            ? { parentCategoryId: parent }
            : {}),
      };
      const [loaded, context] = await Promise.all([
        this.api.listAllStoreCategories(storeId, query),
        this.api.listAllStoreCategories(storeId),
      ]);
      if (seq !== this.listSeq || storeId !== this.storeId()) return;
      this.blocked.set(false);
      this.allLoaded.set(loaded);
      this.editorContext.set(context);
      this.contextChanged.emit(context);
      const flattened = toStoreCategoryRows(loaded);
      const limit = 20;
      const total = flattened.length;
      const pages = Math.max(1, Math.ceil(total / limit) || 1);
      const safePage = Math.min(page, pages);
      this.page.set(safePage);
      this.rows.set(flattened.slice((safePage - 1) * limit, safePage * limit));
      this.pagination.set({
        page: safePage,
        limit,
        total,
        pages,
        hasNext: safePage < pages,
        hasPrev: safePage > 1,
      });
      const selected = this.selected();
      if (selected) {
        this.selected.set(loaded.find((item) => item.id === selected.id) ?? selected);
      }
    } catch (err) {
      if (seq !== this.listSeq || storeId !== this.storeId()) return;
      if (getApiErrorStatus(err) === 403) {
        this.blocked.set(true);
        this.blockedMessage.set(
          getApiErrorMessage(err, this.language.t('products.categoriesBlocked'))
        );
        this.rows.set([]);
        this.allLoaded.set([]);
        this.pagination.set(null);
        return;
      }
      if (isApiErrorCode(err, 'STORE_ARCHIVED')) {
        this.storeArchived.emit();
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      if (seq === this.listSeq) this.isLoading.set(false);
    }
  }

  private handleMutationError(err: unknown) {
    if (isApiErrorCode(err, 'STORE_ARCHIVED')) {
      this.notify.error(this.language.t('products.storeArchived'));
      this.storeArchived.emit();
      return;
    }
    this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }
}
