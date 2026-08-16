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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TableComponent } from '../../../shared/components/table/table';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog';
import { TableColumn } from '../../../shared/models/table-column.interface';
import { PaginationConfig } from '../../../shared/models/pagination.interface';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { LanguageService } from '../../../i18n/language.service';
import { NotificationService } from '../../../shared/services/notification.service';
import {
  getApiErrorMessage,
  getApiErrorStatus,
  isApiErrorCode,
} from '../../../core/http/api-error';
import { StoresService } from '../stores/stores.service';
import { Store } from '../stores/stores.models';
import { ProductCatalogService } from './product-catalog.service';
import {
  Product,
  ProductRow,
  StoreCategory,
  StoreCategoryStatus,
  primaryImageUrl,
} from './product-catalog.models';
import { StoreCategoriesComponent } from './store-categories/store-categories';
import { ProductDetailsComponent } from './product-details/product-details';
import { ProductEditorComponent } from './product-editor/product-editor';
import { ModifierGroupsComponent } from './modifiers/modifier-groups/modifier-groups';
import { ProductModifiersComponent } from './modifiers/product-modifiers/product-modifiers';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CatalogTab = 'products' | 'categories' | 'modifiers';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TableComponent,
    ConfirmationDialogComponent,
    TranslatePipe,
    StoreCategoriesComponent,
    ProductDetailsComponent,
    ProductEditorComponent,
    ModifierGroupsComponent,
    ProductModifiersComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class ProductsComponent implements OnInit, OnDestroy {
  private storesApi = inject(StoresService);
  private catalog = inject(ProductCatalogService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly stores = signal<Store[]>([]);
  readonly storesLoading = signal(true);
  readonly storesBlocked = signal(false);
  readonly storesBlockedMessage = signal('');
  readonly storeUnavailable = signal(false);

  readonly selectedStoreId = signal('');
  readonly selectedStore = computed(
    () => this.stores().find((store) => store.id === this.selectedStoreId()) ?? null
  );
  readonly storeArchived = computed(() => this.selectedStore()?.status === 'ARCHIVED');

  readonly activeTab = signal<CatalogTab>('products');
  readonly categoryReload = signal(0);
  readonly modifierReload = signal(0);
  readonly categoryContext = signal<StoreCategory[]>([]);

  readonly products = signal<ProductRow[]>([]);
  readonly pagination = signal<PaginationConfig | null>(null);
  readonly isLoading = signal(false);
  readonly productsBlocked = signal(false);
  readonly productsBlockedMessage = signal('');
  readonly search = signal('');
  readonly statusFilter = signal<'' | StoreCategoryStatus>('');
  readonly categoryFilter = signal('');
  readonly page = signal(1);
  readonly selectedProduct = signal<Product | null>(null);
  readonly mutating = signal(false);
  readonly confirmArchive = signal(false);
  readonly editorOpen = signal(false);
  readonly editingProduct = signal<Product | null>(null);
  readonly modifiersOpen = signal(false);

  columns: TableColumn[] = [];
  private listSeq = 0;
  private contextSeq = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private querySub: { unsubscribe(): void } | null = null;

  readonly categoryOptions = computed(() =>
    this.categoryContext()
      .filter((item) => item.status !== 'ARCHIVED')
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
  );

  ngOnInit() {
    this.columns = [
      { key: 'primaryImageUrl', label: this.language.t('products.image'), type: 'image' },
      { key: 'name', label: this.language.t('catalog.name') },
      { key: 'categoryLabel', label: this.language.t('products.storeCategory') },
      { key: 'pricingLabel', label: this.language.t('products.price') },
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
      { key: 'availableLabel', label: this.language.t('products.availability') },
      { key: 'displayOrder', label: this.language.t('catalog.displayOrder') },
    ];
    void this.loadStores().then(() => {
      this.querySub = this.route.queryParamMap.subscribe((params) => {
        const raw = params.get('storeId') ?? '';
        if (raw && UUID_RE.test(raw) && raw !== this.selectedStoreId()) {
          this.applyStoreId(raw, false);
        }
      });
    });
  }

  ngOnDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.querySub?.unsubscribe();
  }

  onStoreChange(storeId: string) {
    this.applyStoreId(storeId, true);
  }

  setTab(tab: CatalogTab) {
    this.activeTab.set(tab);
  }

  onSearchInput(value: string) {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadProducts(1), 350);
  }

  onStatusChange(value: string) {
    this.statusFilter.set((value || '') as '' | StoreCategoryStatus);
    void this.loadProducts(1);
  }

  onCategoryFilterChange(value: string) {
    this.categoryFilter.set(value);
    void this.loadProducts(1);
  }

  onPageChange(page: number) {
    void this.loadProducts(page);
  }

  onView(row: ProductRow) {
    void this.openProduct(row.id);
  }

  closeDetails() {
    this.selectedProduct.set(null);
  }

  openCreate() {
    if (this.productsBlocked() || this.storeArchived() || !this.selectedStoreId()) return;
    this.editingProduct.set(null);
    this.editorOpen.set(true);
  }

  openEdit() {
    const product = this.selectedProduct();
    if (!product || product.status === 'ARCHIVED' || this.storeArchived()) return;
    this.editingProduct.set(product);
    this.editorOpen.set(true);
  }

  async onEditorSaved(product: Product) {
    this.editorOpen.set(false);
    this.editingProduct.set(null);
    this.selectedProduct.set(product);
    await this.loadProducts(this.page());
  }

  async onProductPatched(product: Product) {
    this.selectedProduct.set(product);
    this.editingProduct.set(product);
    await this.loadProducts(this.page());
  }

  openModifiers() {
    if (!this.selectedProduct()) return;
    this.modifiersOpen.set(true);
  }

  closeModifiers() {
    this.modifiersOpen.set(false);
  }

  closeEditor() {
    this.editorOpen.set(false);
    this.editingProduct.set(null);
  }

  onModifiersChanged() {
    this.modifierReload.update((n) => n + 1);
  }

  onCategoryContext(categories: StoreCategory[]) {
    this.categoryContext.set(categories);
    this.products.set(this.products().map((row) => this.toRow(row, categories)));
  }

  onCategoryArchived() {
    void this.loadCategoryContext(this.selectedStoreId());
    void this.loadProducts(this.page());
  }

  async onStoreArchived() {
    await this.loadStores();
    const current = this.selectedStore();
    if (!current || current.status === 'ARCHIVED') {
      this.notify.error(this.language.t('products.storeArchived'));
    }
  }

  async setProductStatus(status: 'ACTIVE' | 'INACTIVE') {
    const product = this.selectedProduct();
    const storeId = this.selectedStoreId();
    if (!product || product.status === 'ARCHIVED') return;
    this.mutating.set(true);
    try {
      const updated = await this.catalog.updateProductStatus(storeId, product.id, { status });
      this.selectedProduct.set(updated);
      this.notify.success(this.language.t('products.productUpdated'));
      await this.loadProducts(this.page());
    } catch (err) {
      this.handleProductMutation(err);
    } finally {
      this.mutating.set(false);
    }
  }

  async setProductAvailable(isAvailable: boolean) {
    const product = this.selectedProduct();
    const storeId = this.selectedStoreId();
    if (!product || product.status === 'ARCHIVED') return;
    this.mutating.set(true);
    try {
      const updated = await this.catalog.updateProductAvailabilityFlag(storeId, product.id, { isAvailable });
      this.selectedProduct.set(updated);
      this.notify.success(this.language.t('products.productUpdated'));
      await this.loadProducts(this.page());
    } catch (err) {
      this.handleProductMutation(err);
    } finally {
      this.mutating.set(false);
    }
  }

  async runArchive() {
    const product = this.selectedProduct();
    const storeId = this.selectedStoreId();
    if (!product) return;
    this.mutating.set(true);
    try {
      const updated = await this.catalog.archiveProduct(storeId, product.id);
      this.confirmArchive.set(false);
      this.selectedProduct.set(updated);
      this.notify.success(this.language.t('products.productArchived'));
      await this.loadProducts(this.page());
    } catch (err) {
      this.handleProductMutation(err);
    } finally {
      this.mutating.set(false);
    }
  }

  private applyStoreId(storeId: string, syncQuery: boolean) {
    this.selectedStoreId.set(storeId);
    this.selectedProduct.set(null);
    this.editorOpen.set(false);
    this.editingProduct.set(null);
    this.modifiersOpen.set(false);
    this.page.set(1);
    this.search.set('');
    this.statusFilter.set('');
    this.categoryFilter.set('');
    this.products.set([]);
    this.categoryContext.set([]);
    this.storeUnavailable.set(false);
    if (syncQuery) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: storeId ? { storeId } : {},
        replaceUrl: true,
      });
    }
    if (!storeId) return;
    const match = this.stores().find((store) => store.id === storeId);
    if (!match) {
      this.storeUnavailable.set(true);
      return;
    }
    void this.loadCategoryContext(storeId);
    void this.loadProducts(1);
    this.categoryReload.update((n) => n + 1);
    this.modifierReload.update((n) => n + 1);
  }

  private async loadStores() {
    this.storesLoading.set(true);
    try {
      const stores = await this.storesApi.listAllNonArchived();
      this.storesBlocked.set(false);
      this.stores.set(stores);
      const requested = this.route.snapshot.queryParamMap.get('storeId') ?? this.selectedStoreId();
      if (requested && UUID_RE.test(requested)) {
        if (!stores.some((store) => store.id === requested)) {
          this.storeUnavailable.set(true);
          this.selectedStoreId.set(requested);
          return;
        }
        if (this.selectedStoreId() !== requested) this.applyStoreId(requested, false);
      }
    } catch (err) {
      if (getApiErrorStatus(err) === 403) {
        this.storesBlocked.set(true);
        this.storesBlockedMessage.set(
          getApiErrorMessage(err, this.language.t('products.storesBlocked'))
        );
        this.stores.set([]);
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.storesLoading.set(false);
    }
  }

  private async loadCategoryContext(storeId: string) {
    const seq = ++this.contextSeq;
    try {
      const categories = await this.catalog.listAllStoreCategories(storeId);
      if (seq !== this.contextSeq || storeId !== this.selectedStoreId()) return;
      this.categoryContext.set(categories);
      this.products.set(this.products().map((row) => this.toRow(row, categories)));
    } catch (err) {
      if (seq !== this.contextSeq || storeId !== this.selectedStoreId()) return;
      if (getApiErrorStatus(err) === 403) {
        this.categoryContext.set([]);
        return;
      }
      if (isApiErrorCode(err, 'STORE_ARCHIVED')) {
        await this.onStoreArchived();
      }
    }
  }

  private async loadProducts(page: number) {
    const storeId = this.selectedStoreId();
    if (!storeId || this.storeUnavailable()) return;
    const seq = ++this.listSeq;
    this.isLoading.set(true);
    this.page.set(page);
    try {
      const categoryId = this.categoryFilter();
      const result = await this.catalog.listProducts(storeId, {
        page,
        limit: 20,
        search: this.search().trim() || undefined,
        status: this.statusFilter() || undefined,
        ...(categoryId === 'uncategorized'
          ? { categoryId: 'null' }
          : categoryId
            ? { categoryId }
            : {}),
      });
      if (seq !== this.listSeq || storeId !== this.selectedStoreId()) return;
      this.productsBlocked.set(false);
      this.products.set(result.data.map((item) => this.toRow(item, this.categoryContext())));
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
      if (seq !== this.listSeq || storeId !== this.selectedStoreId()) return;
      if (getApiErrorStatus(err) === 403) {
        this.productsBlocked.set(true);
        this.productsBlockedMessage.set(
          getApiErrorMessage(err, this.language.t('products.productsBlocked'))
        );
        this.products.set([]);
        this.pagination.set(null);
        return;
      }
      if (isApiErrorCode(err, 'STORE_ARCHIVED')) {
        await this.onStoreArchived();
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      if (seq === this.listSeq) this.isLoading.set(false);
    }
  }

  private async openProduct(productId: string) {
    const storeId = this.selectedStoreId();
    try {
      const product = await this.catalog.getProduct(storeId, productId);
      this.selectedProduct.set(product);
    } catch (err) {
      if (isApiErrorCode(err, 'PRODUCT_NOT_FOUND') || getApiErrorStatus(err) === 404) {
        this.selectedProduct.set(null);
        this.notify.error(this.language.t('products.notFound'));
        void this.loadProducts(this.page());
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }

  private toRow(product: Product, categories: StoreCategory[]): ProductRow {
    return {
      ...product,
      primaryImageUrl: primaryImageUrl(product),
      categoryLabel: this.resolveCategoryName(product.categoryId, categories),
      pricingLabel: this.pricingLabel(product),
      availableLabel: this.language.t(product.isAvailable ? 'products.available' : 'products.unavailable'),
    };
  }

  private resolveCategoryName(categoryId: string | null, categories: StoreCategory[]): string {
    if (!categoryId) return this.language.t('products.uncategorized');
    const match = categories.find((item) => item.id === categoryId);
    return match?.name ?? this.language.t('products.categoryUnavailable');
  }

  private pricingLabel(product: Product): string {
    if (product.basePrice != null && product.sizes.length === 0) {
      const formatted = product.basePrice.toLocaleString(
        this.language.lang() === 'ar' ? 'ar-IQ' : 'en-US'
      );
      return this.language.lang() === 'ar' ? `${formatted} د.ع` : `${formatted} IQD`;
    }
    return this.language.t('products.sizesCount', { n: product.sizes.length });
  }

  private handleProductMutation(err: unknown) {
    if (isApiErrorCode(err, 'PRODUCT_NOT_FOUND')) {
      this.selectedProduct.set(null);
      this.notify.error(this.language.t('products.notFound'));
      void this.loadProducts(this.page());
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_NAME_CONFLICT')) {
      this.notify.error(this.language.t('products.nameConflict'));
      return;
    }
    if (isApiErrorCode(err, 'STORE_ARCHIVED')) {
      void this.onStoreArchived();
      return;
    }
    this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }
}
