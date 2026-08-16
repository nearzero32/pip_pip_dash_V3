import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../i18n/language.service';
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from '../../../../core/http/api-error';
import {
  PRODUCT_WEEKDAYS,
  Product,
  ProductAvailabilityWindow,
  ProductSize,
  StoreCategory,
  StoreCategoryStatus,
} from '../product-catalog.models';
import { ModifierCatalogService } from '../modifiers/modifier.service';
import { ProductModifiers } from '../modifiers/modifier.models';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-details.html',
  styleUrl: './product-details.css',
})
export class ProductDetailsComponent {
  private language = inject(LanguageService);
  private modifiersApi = inject(ModifierCatalogService);

  readonly product = input.required<Product>();
  readonly storeId = input.required<string>();
  readonly categories = input<StoreCategory[]>([]);
  readonly mutationsDisabled = input(false);
  readonly mutating = input(false);
  readonly modifierReload = input(0);

  readonly closed = output<void>();
  readonly statusChange = output<'ACTIVE' | 'INACTIVE'>();
  readonly availabilityChange = output<boolean>();
  readonly archive = output<void>();
  readonly edit = output<void>();
  readonly manageModifiers = output<void>();

  readonly selectedImageId = signal<string | null>(null);
  readonly modifierSummary = signal<ProductModifiers | null>(null);
  readonly modifierSummaryError = signal('');
  private summarySeq = 0;

  readonly activeImage = computed(() => {
    const product = this.product();
    const id = this.selectedImageId();
    return product.images.find((image) => image.id === id) ?? product.images[0] ?? null;
  });

  readonly windowsByDay = computed(() =>
    PRODUCT_WEEKDAYS.map((day) => ({
      day,
      windows: this.product().availability.filter((window) => window.dayOfWeek === day),
    })).filter((group) => group.windows.length > 0)
  );

  constructor() {
    effect(() => {
      const product = this.product();
      const primary = product.images.find((image) => image.isPrimary);
      this.selectedImageId.set(primary?.id ?? product.images[0]?.id ?? null);
    });
    effect(() => {
      const product = this.product();
      const storeId = this.storeId();
      this.modifierReload();
      if (storeId && product.id) void this.loadModifierSummary(storeId, product.id);
    });
  }

  configuredCount(): number {
    return this.modifierSummary()?.options.length ?? 0;
  }

  private async loadModifierSummary(storeId: string, productId: string) {
    const seq = ++this.summarySeq;
    try {
      const summary = await this.modifiersApi.getProductModifiers(storeId, productId);
      if (seq !== this.summarySeq) return;
      this.modifierSummary.set(summary);
      this.modifierSummaryError.set('');
    } catch (err) {
      if (seq !== this.summarySeq) return;
      this.modifierSummary.set(null);
      if (getApiErrorStatus(err) === 403) {
        this.modifierSummaryError.set('');
        return;
      }
      this.modifierSummaryError.set(
        getApiErrorMessage(err, this.language.t('common.unexpectedError'))
      );
    }
  }

  selectImage(id: string) {
    this.selectedImageId.set(id);
  }

  categoryLabel(): string {
    const id = this.product().categoryId;
    if (!id) return this.language.t('products.uncategorized');
    const match = this.categories().find((item) => item.id === id);
    return match?.name ?? this.language.t('products.categoryUnavailable');
  }

  statusLabel(status: StoreCategoryStatus): string {
    return this.language.t(`status.${status}`);
  }

  weekdayLabel(day: string): string {
    return this.language.t(`stores.weekday.${day}`);
  }

  formatIqd(amount: number): string {
    const formatted = amount.toLocaleString(this.language.lang() === 'ar' ? 'ar-IQ' : 'en-US');
    return this.language.lang() === 'ar' ? `${formatted} د.ع` : `${formatted} IQD`;
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(this.language.lang() === 'ar' ? 'ar' : 'en-GB');
  }

  description(): string {
    const value = this.product().description?.trim();
    return value || this.language.t('products.noDescription');
  }

  isSized(): boolean {
    return this.product().basePrice == null && this.product().sizes.length > 0;
  }

  visibleSizes(): ProductSize[] {
    return this.product().sizes.slice().sort((a, b) => a.displayOrder - b.displayOrder);
  }

  windowLabel(window: ProductAvailabilityWindow): string {
    return `${window.opensAt} – ${window.closesAt}`;
  }
}
