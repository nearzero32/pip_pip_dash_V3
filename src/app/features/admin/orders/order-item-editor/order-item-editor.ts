import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../i18n/language.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { getApiErrorMessage, getApiErrorStatus, isApiErrorCode } from '../../../../core/http/api-error';
import { ProductCatalogService } from '../../products/product-catalog.service';
import { Product, ProductSize } from '../../products/product-catalog.models';
import { ModifierCatalogService } from '../../products/modifiers/modifier.service';
import { ProductModifierOption, ProductModifiers } from '../../products/modifiers/modifier.models';
import { OrderAddItemBody, OrderReplaceItemBody } from '../orders.models';

@Component({
  selector: 'app-order-item-editor',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-item-editor.html',
  styleUrl: './order-item-editor.css',
})
export class OrderItemEditorComponent implements OnDestroy {
  private productsApi = inject(ProductCatalogService);
  private modifiersApi = inject(ModifierCatalogService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  readonly mode = input<'add' | 'replace'>('add');
  readonly storeId = input.required<string>();
  readonly submitting = input(false);
  readonly uncertain = input(false);
  readonly catalogDenied = input(false);
  readonly closed = output<void>();
  readonly catalogDeniedEvent = output<void>();
  readonly submitted = output<OrderAddItemBody | OrderReplaceItemBody>();

  readonly search = signal('');
  readonly products = signal<Product[]>([]);
  readonly searching = signal(false);
  readonly selected = signal<Product | null>(null);
  readonly sizeId = signal('');
  readonly quantity = signal(1);
  readonly reason = signal('');
  readonly agreed = signal(false);
  readonly modifiers = signal<ProductModifiers | null>(null);
  readonly quantities = signal<Record<string, number>>({});
  readonly formError = signal('');
  readonly catalogBlocked = signal(false);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private searchSeq = 0;
  private productSeq = 0;
  private modifierSeq = 0;

  ngOnDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  titleKey(): string {
    return this.mode() === 'replace' ? 'orders.replaceItem' : 'orders.addItem';
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.requestClose();
  }

  requestClose() {
    if (this.submitting()) return;
    if (this.isDirty() && !window.confirm(this.language.t('orders.discardEditor'))) return;
    this.closed.emit();
  }

  onSearch(value: string) {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadProducts(), 350);
  }

  async loadProducts() {
    if (this.catalogDenied() || this.catalogBlocked()) return;
    const seq = ++this.searchSeq;
    this.searching.set(true);
    try {
      const page = await this.productsApi.listProducts(this.storeId(), {
        search: this.search().trim() || undefined,
        status: 'ACTIVE',
        page: 1,
        limit: 20,
      });
      if (seq !== this.searchSeq) return;
      this.products.set(page.data);
    } catch (err) {
      if (seq !== this.searchSeq) return;
      if (getApiErrorStatus(err) === 403) {
        this.catalogBlocked.set(true);
        this.catalogDeniedEvent.emit();
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      if (seq === this.searchSeq) this.searching.set(false);
    }
  }

  async selectProduct(product: Product) {
    const seq = ++this.productSeq;
    this.selected.set(product);
    this.sizeId.set('');
    this.quantities.set({});
    this.modifiers.set(null);
    try {
      const detail = await this.productsApi.getProduct(this.storeId(), product.id);
      if (seq !== this.productSeq) return;
      this.selected.set(detail);
      const usable = this.usableSizes(detail);
      const def = usable.find((size) => size.isDefault) ?? usable[0];
      if (detail.basePrice == null && def) this.sizeId.set(def.id);
      await this.loadModifiers(detail.id, seq);
    } catch (err) {
      if (seq !== this.productSeq) return;
      if (getApiErrorStatus(err) === 403) {
        this.catalogBlocked.set(true);
        this.catalogDeniedEvent.emit();
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }

  usableSizes(product: Product): ProductSize[] {
    return product.sizes.filter((size) => size.status === 'ACTIVE' && size.isAvailable);
  }

  usableOptions(): ProductModifierOption[] {
    const config = this.modifiers();
    if (!config?.group || config.group.status === 'ARCHIVED') return [];
    return config.options.filter(
      (option) =>
        option.optionStatus === 'ACTIVE' && option.optionIsAvailable && option.isAvailable
    );
  }

  optionQty(optionId: string): number {
    return this.quantities()[optionId] ?? 0;
  }

  setOptionQty(option: ProductModifierOption, raw: number) {
    const next = Math.max(0, Math.min(option.maxQuantity, Math.floor(raw) || 0));
    this.quantities.update((map) => ({ ...map, [option.modifierOptionId]: next }));
  }

  selectedModifierTotal(): number {
    return this.usableOptions().reduce((sum, option) => sum + this.optionQty(option.modifierOptionId), 0);
  }

  unitPreview(): number {
    const product = this.selected();
    if (!product) return 0;
    let base = product.basePrice ?? 0;
    if (product.basePrice == null) {
      const size = this.usableSizes(product).find((row) => row.id === this.sizeId());
      base = size?.price ?? 0;
    }
    const extras = this.usableOptions().reduce((sum, option) => {
      const qty = this.optionQty(option.modifierOptionId);
      return sum + (qty > 0 ? option.price * qty : 0);
    }, 0);
    return (base + extras) * this.quantity();
  }

  submit() {
    const product = this.selected();
    if (!product) {
      this.formError.set('orders.pickProduct');
      return;
    }
    if (!product.isAvailable) {
      this.formError.set('orders.productUnavailable');
      return;
    }
    if (product.basePrice == null && !this.sizeId()) {
      this.formError.set('orders.sizeRequired');
      return;
    }
    const quantity = this.quantity();
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      this.formError.set('orders.quantityInvalid');
      return;
    }
    const group = this.modifiers()?.group;
    if (group && group.status !== 'ARCHIVED') {
      const total = this.selectedModifierTotal();
      if (total < group.minSelect || total > group.maxSelect) {
        this.formError.set('orders.modifierLimits');
        return;
      }
    }
    const reason = this.reason().trim();
    if (!reason) {
      this.formError.set('orders.reasonRequired');
      return;
    }
    if (reason.length > 1000) {
      this.formError.set('orders.reasonTooLong');
      return;
    }
    if (this.mode() === 'replace' && !this.agreed()) {
      this.formError.set('orders.agreementRequired');
      return;
    }
    this.formError.set('');
    const selections = this.usableOptions()
      .filter((option) => this.optionQty(option.modifierOptionId) >= 1)
      .map((option) => ({
        modifierOptionId: option.modifierOptionId,
        quantity: this.optionQty(option.modifierOptionId),
      }));
    const body: OrderAddItemBody = {
      productId: product.id,
      quantity,
      reason,
      ...(product.basePrice == null ? { sizeId: this.sizeId() } : {}),
      ...(selections.length ? { modifierSelections: selections } : {}),
    };
    if (this.mode() === 'replace') {
      this.submitted.emit({ ...body, customerAgreedByPhone: true });
      return;
    }
    this.submitted.emit(body);
  }

  mapLoadError(err: unknown): string {
    if (isApiErrorCode(err, 'ORDER_ITEM_UNAVAILABLE')) return this.language.t('orders.itemUnavailable');
    if (isApiErrorCode(err, 'INVALID_MODIFIER_SELECTION')) return this.language.t('orders.invalidModifiers');
    if (isApiErrorCode(err, 'PRODUCT_SIZE_REQUIRED')) return this.language.t('orders.sizeRequired');
    if (isApiErrorCode(err, 'PRODUCT_SIZE_NOT_FOUND')) return this.language.t('orders.sizeNotFound');
    if (isApiErrorCode(err, 'PRODUCT_SIZE_NOT_APPLICABLE')) return this.language.t('orders.sizeNotApplicable');
    return getApiErrorMessage(err, this.language.t('common.unexpectedError'));
  }

  async refreshSelected() {
    const product = this.selected();
    if (!product) return;
    await this.selectProduct(product);
  }

  private async loadModifiers(productId: string, productSeq: number) {
    const seq = ++this.modifierSeq;
    try {
      const config = await this.modifiersApi.getProductModifiers(this.storeId(), productId);
      if (seq !== this.modifierSeq || productSeq !== this.productSeq) return;
      this.modifiers.set(config);
      const next: Record<string, number> = {};
      for (const option of config.options) {
        if (
          option.isDefault &&
          option.optionStatus === 'ACTIVE' &&
          option.optionIsAvailable &&
          option.isAvailable
        ) {
          next[option.modifierOptionId] = 1;
        }
      }
      this.quantities.set(next);
    } catch (err) {
      if (seq !== this.modifierSeq || productSeq !== this.productSeq) return;
      if (getApiErrorStatus(err) === 403) {
        this.catalogBlocked.set(true);
        this.catalogDeniedEvent.emit();
        return;
      }
      this.modifiers.set(null);
    }
  }

  private isDirty(): boolean {
    return !!(this.selected() || this.reason().trim() || this.search().trim());
  }
}
