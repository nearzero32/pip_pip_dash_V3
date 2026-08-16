import {
  ChangeDetectionStrategy,
  Component,
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
import { getApiErrorMessage, isApiErrorCode } from '../../../../core/http/api-error';
import { ProductCatalogService } from '../product-catalog.service';
import {
  MutableCatalogStatus,
  Product,
  ProductPricingMode,
  ProductSize,
  ProductSizeDraft,
  ProductSizePatch,
  liveSizes,
  parseIqdInteger,
} from '../product-catalog.models';
import { validateArabicCatalogName } from '../../catalog/catalog.models';

@Component({
  selector: 'app-product-pricing-editor',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-pricing-editor.html',
  styleUrl: './product-pricing-editor.css',
})
export class ProductPricingEditorComponent {
  private api = inject(ProductCatalogService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  readonly editorMode = input.required<'create' | 'edit'>();
  readonly storeId = input.required<string>();
  readonly product = input<Product | null>(null);
  readonly pricingMode = input<ProductPricingMode>('base');
  readonly basePrice = input('');
  readonly sizeDrafts = input<ProductSizeDraft[]>([]);
  readonly disabled = input(false);

  readonly pricingModeChange = output<ProductPricingMode>();
  readonly basePriceChange = output<string>();
  readonly sizeDraftsChange = output<ProductSizeDraft[]>();
  readonly productChange = output<Product>();
  readonly storeArchived = output<void>();
  readonly productGone = output<void>();

  readonly error = signal('');
  readonly nameError = signal('');
  readonly saving = signal(false);
  readonly addName = signal('');
  readonly addPrice = signal('');
  readonly addAvailable = signal(true);
  readonly addOrder = signal(0);
  readonly replacementId = signal('');
  readonly lastBasePrice = signal('');
  readonly pendingArchive = signal<ProductSize | null>(null);
  readonly pendingDefaultLoss = signal<ProductSize | null>(null);

  readonly live = computed(() => {
    const product = this.product();
    return product ? liveSizes(product) : [];
  });
  readonly archived = computed(() => {
    const product = this.product();
    return product ? product.sizes.filter((size) => size.status === 'ARCHIVED') : [];
  });
  readonly isBase = computed(() => this.live().length === 0);
  readonly activeOthers = computed(() => {
    const pending = this.pendingArchive() ?? this.pendingDefaultLoss();
    return this.live().filter(
      (size) => size.status === 'ACTIVE' && size.id !== pending?.id
    );
  });

  setMode(mode: ProductPricingMode) {
    if (this.disabled() || this.editorMode() !== 'create') return;
    this.pricingModeChange.emit(mode);
    if (mode === 'sizes' && this.sizeDrafts().length === 0) {
      this.sizeDraftsChange.emit([this.blankSize(true, 0)]);
    }
  }

  addDraft() {
    const drafts = this.sizeDrafts();
    this.sizeDraftsChange.emit([...drafts, this.blankSize(drafts.length === 0, drafts.length)]);
  }

  removeDraft(key: string) {
    const next = this.sizeDrafts().filter((size) => size.key !== key);
    if (next.length === 1) next[0] = { ...next[0], isDefault: true, status: 'ACTIVE' };
    else if (next.length && !next.some((size) => size.isDefault && size.status === 'ACTIVE')) {
      const active = next.find((size) => size.status === 'ACTIVE') ?? next[0];
      next.forEach((size, i) => {
        next[i] = { ...size, isDefault: size.key === active.key, status: size.key === active.key ? 'ACTIVE' : size.status };
      });
    }
    this.sizeDraftsChange.emit(next);
  }

  patchDraft(key: string, patch: Partial<ProductSizeDraft>) {
    this.sizeDraftsChange.emit(
      this.sizeDrafts().map((size) => (size.key === key ? { ...size, ...patch } : size))
    );
  }

  setDraftDefault(key: string) {
    this.sizeDraftsChange.emit(
      this.sizeDrafts().map((size) => ({
        ...size,
        isDefault: size.key === key,
        status: size.key === key ? 'ACTIVE' : size.status,
      }))
    );
  }

  async addSize() {
    const product = this.product();
    if (!product || this.saving() || this.disabled()) return;
    const nameError = validateArabicCatalogName(this.addName());
    if (nameError) {
      this.nameError.set(this.language.t(nameError));
      return;
    }
    const price = parseIqdInteger(this.addPrice());
    if (price == null) {
      this.error.set(this.language.t('products.invalidPrice'));
      return;
    }
    const first = this.isBase();
    this.saving.set(true);
    this.error.set('');
    this.nameError.set('');
    try {
      const updated = await this.api.addProductSize(this.storeId(), product.id, {
        name: this.addName().trim(),
        price,
        isDefault: first ? true : false,
        isAvailable: this.addAvailable(),
        status: 'ACTIVE',
        displayOrder: this.addOrder(),
        ...(first ? { transitionFromBasePrice: true } : {}),
      });
      this.addName.set('');
      this.addPrice.set('');
      this.productChange.emit(updated);
      this.notify.success(this.language.t('products.sizeSaved'));
    } catch (err) {
      this.handleSizeError(err);
    } finally {
      this.saving.set(false);
    }
  }

  async saveRow(size: ProductSize, name: string, priceRaw: string, orderRaw: string) {
    const price = parseIqdInteger(priceRaw);
    if (price == null) {
      this.error.set(this.language.t('products.invalidPrice'));
      return;
    }
    await this.saveSize(size, { name, price, displayOrder: Number(orderRaw) || 0 });
  }

  async saveSize(size: ProductSize, patch: ProductSizePatch) {
    const product = this.product();
    if (!product || this.saving() || this.disabled()) return;
    if (patch.name) {
      const nameError = validateArabicCatalogName(patch.name);
      if (nameError) {
        this.nameError.set(this.language.t(nameError));
        return;
      }
    }
    if (
      (patch.isDefault === false && size.isDefault) ||
      (patch.status === 'INACTIVE' && size.isDefault)
    ) {
      this.pendingDefaultLoss.set(size);
      this.pendingPatch.set(patch);
      return;
    }
    await this.sendSizePatch(size.id, patch);
  }

  private pendingPatch = signal<ProductSizePatch | null>(null);

  async confirmDefaultReplacement() {
    const size = this.pendingDefaultLoss();
    const patch = this.pendingPatch();
    const replacement = this.replacementId();
    if (!size || !patch || !replacement) {
      this.error.set(this.language.t('products.needReplacement'));
      return;
    }
    this.pendingDefaultLoss.set(null);
    await this.sendSizePatch(size.id, { ...patch, replacementDefaultSizeId: replacement });
    this.pendingPatch.set(null);
    this.replacementId.set('');
  }

  requestArchive(size: ProductSize) {
    this.pendingArchive.set(size);
    this.lastBasePrice.set('');
    this.replacementId.set('');
  }

  async confirmArchive() {
    const product = this.product();
    const size = this.pendingArchive();
    if (!product || !size || this.saving()) return;
    const remaining = this.live().filter((item) => item.id !== size.id);
    let body: { replacementDefaultSizeId?: string; basePrice?: number } | undefined;
    if (remaining.length === 0) {
      const basePrice = parseIqdInteger(this.lastBasePrice());
      if (basePrice == null) {
        this.error.set(this.language.t('products.invalidPrice'));
        return;
      }
      body = { basePrice };
    } else if (size.isDefault) {
      if (!this.replacementId()) {
        this.error.set(this.language.t('products.needReplacement'));
        return;
      }
      body = { replacementDefaultSizeId: this.replacementId() };
    }
    this.saving.set(true);
    try {
      const updated = await this.api.archiveProductSize(this.storeId(), product.id, size.id, body);
      this.pendingArchive.set(null);
      this.productChange.emit(updated);
      this.notify.success(this.language.t('products.sizeArchived'));
    } catch (err) {
      this.handleSizeError(err);
    } finally {
      this.saving.set(false);
    }
  }

  async setDefault(size: ProductSize) {
    await this.sendSizePatch(size.id, { isDefault: true });
  }

  async toggleAvailable(size: ProductSize) {
    await this.sendSizePatch(size.id, { isAvailable: !size.isAvailable });
  }

  async toggleStatus(size: ProductSize) {
    const status: MutableCatalogStatus = size.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await this.saveSize(size, { status });
  }

  statusLabel(status: string): string {
    return this.language.t(`status.${status}`);
  }

  private async sendSizePatch(sizeId: string, patch: ProductSizePatch) {
    const product = this.product();
    if (!product || this.saving() || this.disabled()) return;
    this.saving.set(true);
    this.error.set('');
    this.nameError.set('');
    try {
      const updated = await this.api.updateProductSize(this.storeId(), product.id, sizeId, patch);
      this.productChange.emit(updated);
      this.notify.success(this.language.t('products.sizeSaved'));
    } catch (err) {
      this.handleSizeError(err);
    } finally {
      this.saving.set(false);
    }
  }

  private handleSizeError(err: unknown) {
    if (isApiErrorCode(err, 'STORE_ARCHIVED')) {
      this.storeArchived.emit();
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_ARCHIVED') || isApiErrorCode(err, 'PRODUCT_NOT_FOUND')) {
      this.productGone.emit();
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_SIZE_NOT_FOUND')) {
      this.notify.error(this.language.t('products.sizeNotFound'));
      this.productGone.emit();
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_SIZE_NAME_CONFLICT')) {
      this.nameError.set(this.language.t('products.sizeNameConflict'));
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_REQUIRES_DEFAULT_SIZE')) {
      this.error.set(this.language.t('products.requiresDefault'));
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_PRICE_WITH_SIZES')) {
      this.error.set(this.language.t('products.priceWithSizes'));
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_REQUIRES_PRICE')) {
      this.error.set(this.language.t('products.requiresPrice'));
      return;
    }
    this.error.set(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }

  private blankSize(isDefault: boolean, order: number): ProductSizeDraft {
    return {
      key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: '',
      price: '',
      isDefault,
      isAvailable: true,
      status: 'ACTIVE',
      displayOrder: order,
    };
  }
}
