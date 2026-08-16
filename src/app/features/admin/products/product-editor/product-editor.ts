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
  getApiErrorMessage,
  getApiErrorStatus,
  isApiErrorCode,
} from '../../../../core/http/api-error';
import { MediaApiService } from '../../../../core/media/media-api.service';
import { MediaClientError } from '../../../../core/media/media.models';
import { validateArabicCatalogName } from '../../catalog/catalog.models';
import { ProductCatalogService } from '../product-catalog.service';
import {
  Product,
  ProductAvailabilityInput,
  ProductCorePatch,
  ProductCreateBody,
  ProductImageDraft,
  ProductImageInput,
  ProductPricingMode,
  ProductSizeCreateInput,
  ProductSizeDraft,
  StoreCategory,
  categoryOptionLabel,
  isSizedProduct,
  liveSizes,
  normalizeProductClock,
  parseIqdInteger,
  validateProductAvailability,
} from '../product-catalog.models';
import { ProductImagesEditorComponent } from '../product-images-editor/product-images-editor';
import { ProductPricingEditorComponent } from '../product-pricing-editor/product-pricing-editor';
import { ProductAvailabilityEditorComponent } from '../product-availability-editor/product-availability-editor';

type EditorStep = 1 | 2 | 3 | 4;
type EditSection = 'basic' | 'images' | 'pricing' | 'availability';

@Component({
  selector: 'app-product-editor',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ConfirmationDialogComponent,
    ProductImagesEditorComponent,
    ProductPricingEditorComponent,
    ProductAvailabilityEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-editor.html',
  styleUrl: './product-editor.css',
})
export class ProductEditorComponent implements OnInit, OnDestroy {
  private api = inject(ProductCatalogService);
  private media = inject(MediaApiService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  readonly storeId = input.required<string>();
  readonly product = input<Product | null>(null);
  readonly categories = input<StoreCategory[]>([]);
  readonly closed = output<void>();
  readonly saved = output<Product>();
  readonly productChange = output<Product>();
  readonly storeArchived = output<void>();

  readonly isCreate = computed(() => this.product() == null);
  readonly step = signal<EditorStep>(1);
  readonly section = signal<EditSection>('basic');
  readonly name = signal('');
  readonly description = signal('');
  readonly categoryId = signal('');
  readonly displayOrder = signal(0);
  readonly basePrice = signal('');
  readonly pricingMode = signal<ProductPricingMode>('base');
  readonly sizeDrafts = signal<ProductSizeDraft[]>([]);
  readonly images = signal<ProductImageDraft[]>([]);
  readonly windows = signal<ProductAvailabilityInput[]>([]);
  readonly saving = signal(false);
  readonly nameError = signal('');
  readonly stepError = signal('');
  readonly submitError = signal('');
  readonly confirmDiscard = signal(false);
  readonly liveProduct = signal<Product | null>(null);

  readonly categoryChoices = computed(() =>
    this.categories()
      .filter((item) => item.status !== 'ARCHIVED')
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
  );

  private original: Product | null = null;
  private generation = 0;

  ngOnInit() {
    const product = this.product();
    this.original = product;
    this.liveProduct.set(product);
    if (product) {
      this.name.set(product.name);
      this.description.set(product.description ?? '');
      this.categoryId.set(product.categoryId ?? '');
      this.displayOrder.set(product.displayOrder);
      this.basePrice.set(product.basePrice != null ? String(product.basePrice) : '');
      this.pricingMode.set(isSizedProduct(product) ? 'sizes' : 'base');
      this.images.set(
        product.images
          .slice()
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((image) => ({
            key: image.id,
            assetId: image.assetId,
            file: null,
            previewUrl: image.url,
            isPrimary: image.isPrimary,
            isNew: false,
          })),
      );
      this.windows.set(
        product.availability.map((window) => ({
          dayOfWeek: window.dayOfWeek,
          opensAt: window.opensAt,
          closesAt: window.closesAt,
        })),
      );
    }
  }

  ngOnDestroy() {
    this.revokeNewImages(this.images());
  }

  categoryLabel(category: StoreCategory): string {
    const status = this.language.t(`status.${category.status}`);
    return `${categoryOptionLabel(category)} (${status})`;
  }

  requestClose() {
    if (this.saving()) return;
    if (this.isDirty()) {
      this.confirmDiscard.set(true);
      return;
    }
    this.closed.emit();
  }

  goNext() {
    if (this.saving()) return;
    const error = this.validateStep(this.step());
    if (error) {
      this.stepError.set(this.language.t(error));
      return;
    }
    this.stepError.set('');
    this.step.set((this.step() + 1) as 2 | 3 | 4);
  }

  goPrev() {
    if (this.saving()) return;
    if (this.step() > 1) this.step.set((this.step() - 1) as 1 | 2 | 3);
  }

  goStep(step: EditorStep) {
    if (this.saving()) return;
    this.step.set(step);
  }

  setImages(images: ProductImageDraft[]) {
    const removed = this.images().filter((image) => !images.some((item) => item.key === image.key));
    this.revokeNewImages(removed);
    this.images.set(images);
  }

  onProductUpdated(product: Product) {
    if (this.storeId() !== product.storeId) return;
    this.liveProduct.set(product);
    this.original = product;
    this.productChange.emit(product);
    if (product.basePrice != null) this.basePrice.set(String(product.basePrice));
  }

  async submitCreate() {
    if (this.saving() || !this.isCreate()) return;
    for (const step of [1, 2, 3, 4] as const) {
      const error = this.validateStep(step);
      if (error) {
        this.step.set(step);
        this.stepError.set(this.language.t(error));
        return;
      }
    }
    this.saving.set(true);
    this.submitError.set('');
    const gen = ++this.generation;
    const created: string[] = [];
    try {
      const images = await this.uploadNewImages(created);
      const body = this.buildCreateBody(images);
      const product = await this.api.createProduct(this.storeId(), body);
      if (gen !== this.generation) return;
      this.notify.success(this.language.t('products.created'));
      this.saved.emit(product);
    } catch (err) {
      await Promise.all(created.map((id) => this.media.bestEffortDelete(id)));
      this.handleError(err, err instanceof MediaClientError ? 'images' : 'basic');
    } finally {
      if (gen === this.generation) this.saving.set(false);
    }
  }

  async saveBasic() {
    const original = this.liveProduct() ?? this.original;
    if (!original || this.saving()) return;
    const nameError = validateArabicCatalogName(this.name());
    if (nameError) {
      this.nameError.set(this.language.t(nameError));
      this.section.set('basic');
      return;
    }
    const patch = this.buildCorePatch(original);
    if (!patch) {
      this.notify.success(this.language.t('catalog.noChanges'));
      return;
    }
    this.saving.set(true);
    this.nameError.set('');
    this.submitError.set('');
    const gen = ++this.generation;
    try {
      const product = await this.api.updateProductCore(this.storeId(), original.id, patch);
      if (gen !== this.generation) return;
      this.onProductUpdated(product);
      this.notify.success(this.language.t('products.basicSaved'));
    } catch (err) {
      this.handleError(err, 'basic');
    } finally {
      if (gen === this.generation) this.saving.set(false);
    }
  }

  async saveImages() {
    const original = this.liveProduct() ?? this.original;
    if (!original || this.saving()) return;
    const imageError = this.validateImages();
    if (imageError) {
      this.section.set('images');
      this.submitError.set(this.language.t(imageError));
      return;
    }
    this.saving.set(true);
    this.submitError.set('');
    const gen = ++this.generation;
    const created: string[] = [];
    try {
      const images = await this.uploadNewImages(created);
      const product = await this.api.replaceProductImages(this.storeId(), original.id, images);
      if (gen !== this.generation) return;
      this.images.set(
        product.images.map((image) => ({
          key: image.id,
          assetId: image.assetId,
          file: null,
          previewUrl: image.url,
          isPrimary: image.isPrimary,
          isNew: false,
        })),
      );
      this.onProductUpdated(product);
      this.notify.success(this.language.t('products.imagesSaved'));
    } catch (err) {
      await Promise.all(created.map((id) => this.media.bestEffortDelete(id)));
      this.handleError(err, 'images');
    } finally {
      if (gen === this.generation) this.saving.set(false);
    }
  }

  async saveAvailability() {
    const original = this.liveProduct() ?? this.original;
    if (!original || this.saving()) return;
    const windows = this.normalizedWindows();
    const availError = validateProductAvailability(windows);
    if (availError) {
      this.section.set('availability');
      this.submitError.set(this.language.t(this.availKey(availError)));
      return;
    }
    this.saving.set(true);
    this.submitError.set('');
    const gen = ++this.generation;
    try {
      const product = await this.api.replaceProductAvailability(
        this.storeId(),
        original.id,
        windows,
      );
      if (gen !== this.generation) return;
      this.windows.set(windows);
      this.onProductUpdated(product);
      this.notify.success(this.language.t('products.availabilitySaved'));
    } catch (err) {
      this.handleError(err, 'availability');
    } finally {
      if (gen === this.generation) this.saving.set(false);
    }
  }

  showBasePrice(): boolean {
    const product = this.liveProduct();
    return !!product && liveSizes(product).length === 0;
  }

  setDisplayOrder(value: string | number) {
    const n = typeof value === 'number' ? value : Number(value);
    this.displayOrder.set(Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0);
  }

  private validateStep(step: EditorStep): string | null {
    if (step === 1) {
      const nameError = validateArabicCatalogName(this.name());
      if (nameError) {
        this.nameError.set(this.language.t(nameError));
        return nameError;
      }
      this.nameError.set('');
      if (this.description().length > 2000) return 'products.descriptionTooLong';
    }
    if (step === 2) return this.validatePricing();
    if (step === 3) return this.validateImages();
    if (step === 4) {
      const availError = validateProductAvailability(this.normalizedWindows());
      if (availError) return this.availKey(availError);
    }
    return null;
  }

  private validatePricing(): string | null {
    if (this.pricingMode() === 'base') {
      if (parseIqdInteger(this.basePrice()) == null) return 'products.invalidPrice';
      return null;
    }
    const drafts = this.sizeDrafts();
    if (!drafts.length) return 'products.needSize';
    const defaults = drafts.filter((size) => size.isDefault && size.status === 'ACTIVE');
    if (defaults.length !== 1) return 'products.requiresDefault';
    for (const size of drafts) {
      const nameError = validateArabicCatalogName(size.name);
      if (nameError) return nameError;
      if (parseIqdInteger(size.price) == null) return 'products.invalidPrice';
      if (size.isDefault && size.status !== 'ACTIVE') return 'products.defaultInactive';
    }
    return null;
  }

  private validateImages(): string | null {
    const images = this.images();
    if (images.length < 1) return 'products.needImage';
    if (images.length > 10) return 'products.maxImages';
    const primaries = images.filter((image) => image.isPrimary);
    if (primaries.length !== 1) return 'products.needPrimary';
    return null;
  }

  private buildCreateBody(images: ProductImageInput[]): ProductCreateBody {
    const description = this.description().trim();
    const categoryId = this.categoryId() || null;
    const windows = this.normalizedWindows();
    const body: ProductCreateBody = {
      name: this.name().trim(),
      description: description ? description : null,
      categoryId,
      displayOrder: this.displayOrder(),
      images,
      ...(windows.length ? { availability: windows } : {}),
    };
    if (this.pricingMode() === 'base') {
      body.basePrice = parseIqdInteger(this.basePrice())!;
    } else {
      body.basePrice = null;
      body.sizes = this.sizeDrafts().map(
        (size, index): ProductSizeCreateInput => ({
          name: size.name.trim(),
          price: parseIqdInteger(size.price)!,
          isDefault: size.isDefault,
          isAvailable: size.isAvailable,
          status: size.status,
          displayOrder: size.displayOrder || index,
        }),
      );
    }
    return body;
  }

  private buildCorePatch(original: Product): ProductCorePatch | null {
    const patch: ProductCorePatch = {};
    const name = this.name().trim();
    if (name !== original.name) patch.name = name;
    const description = this.description().trim() || null;
    if (description !== original.description) patch.description = description;
    const categoryId = this.categoryId() || null;
    if (categoryId !== original.categoryId) patch.categoryId = categoryId;
    if (this.displayOrder() !== original.displayOrder) patch.displayOrder = this.displayOrder();
    if (liveSizes(original).length === 0) {
      const price = parseIqdInteger(this.basePrice());
      if (price != null && price !== original.basePrice) patch.basePrice = price;
    }
    return Object.keys(patch).length ? patch : null;
  }

  private async uploadNewImages(created: string[]): Promise<ProductImageInput[]> {
    const result: ProductImageInput[] = [];
    let order = 0;
    for (const image of this.images()) {
      let assetId = image.assetId;
      if (image.isNew && image.file) {
        const asset = await this.media.uploadImage(image.file, 'PRODUCT_IMAGE');
        created.push(asset.id);
        assetId = asset.id;
      }
      if (!assetId) throw new MediaClientError('MEDIA_NOT_READY', 'Missing asset');
      result.push({
        assetId,
        isPrimary: image.isPrimary,
        displayOrder: order,
      });
      order += 1;
    }
    return result;
  }

  private normalizedWindows(): ProductAvailabilityInput[] {
    return this.windows().map((window) => ({
      dayOfWeek: window.dayOfWeek,
      opensAt: normalizeProductClock(window.opensAt) ?? window.opensAt,
      closesAt: normalizeProductClock(window.closesAt) ?? window.closesAt,
    }));
  }

  private availKey(code: 'invalid' | 'overnight' | 'overlap'): string {
    if (code === 'overnight') return 'products.availabilityOvernight';
    if (code === 'overlap') return 'products.availabilityOverlap';
    return 'products.availabilityInvalid';
  }

  private handleError(err: unknown, section: EditSection) {
    this.section.set(section);
    if (err instanceof MediaClientError) {
      this.submitError.set(this.language.t(`stores.media.${err.code}`));
      return;
    }
    if (getApiErrorStatus(err) === 403) {
      this.submitError.set(
        this.language.t(section === 'images' ? 'products.mediaDenied' : 'products.updateDenied'),
      );
      return;
    }
    if (isApiErrorCode(err, 'STORE_ARCHIVED')) {
      this.storeArchived.emit();
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_ARCHIVED') || isApiErrorCode(err, 'PRODUCT_NOT_FOUND')) {
      this.notify.error(this.language.t('products.notFound'));
      this.closed.emit();
      return;
    }
    const map: Record<string, string> = {
      PRODUCT_NAME_CONFLICT: 'products.nameConflict',
      PRODUCT_REQUIRES_IMAGE: 'products.needImage',
      PRODUCT_IMAGE_LIMIT_EXCEEDED: 'products.maxImages',
      PRODUCT_REQUIRES_PRIMARY_IMAGE: 'products.needPrimary',
      MEDIA_NOT_ATTACHABLE: 'products.mediaNotAttachable',
      STORE_CATEGORY_NOT_FOUND: 'products.categoryNotFound',
      STORE_CATEGORY_ARCHIVED: 'products.categoryArchivedErr',
      PRODUCT_REQUIRES_DEFAULT_SIZE: 'products.requiresDefault',
      PRODUCT_PRICE_WITH_SIZES: 'products.priceWithSizes',
      PRODUCT_REQUIRES_PRICE: 'products.requiresPrice',
      PRODUCT_AVAILABILITY_OVERLAP: 'products.availabilityOverlap',
      INVALID_PRODUCT_AVAILABILITY: 'products.availabilityInvalid',
    };
    for (const [code, key] of Object.entries(map)) {
      if (isApiErrorCode(err, code)) {
        if (code === 'PRODUCT_NAME_CONFLICT') this.nameError.set(this.language.t(key));
        this.submitError.set(this.language.t(key));
        return;
      }
    }
    this.submitError.set(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }

  private isDirty(): boolean {
    if (this.isCreate()) {
      return Boolean(
        this.name().trim() ||
        this.description().trim() ||
        this.images().length ||
        this.sizeDrafts().length ||
        this.windows().length,
      );
    }
    return true;
  }

  private revokeNewImages(images: ProductImageDraft[]) {
    for (const image of images) {
      if (image.isNew && image.previewUrl) URL.revokeObjectURL(image.previewUrl);
    }
  }
}
