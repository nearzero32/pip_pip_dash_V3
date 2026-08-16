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
  PRODUCT_WEEKDAYS,
  Product,
  ProductAvailabilityWindow,
  ProductSize,
  StoreCategory,
  StoreCategoryStatus,
} from '../product-catalog.models';

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

  readonly product = input.required<Product>();
  readonly categories = input<StoreCategory[]>([]);
  readonly mutationsDisabled = input(false);
  readonly mutating = input(false);

  readonly closed = output<void>();
  readonly statusChange = output<'ACTIVE' | 'INACTIVE'>();
  readonly availabilityChange = output<boolean>();
  readonly archive = output<void>();
  readonly edit = output<void>();

  readonly selectedImageId = signal<string | null>(null);

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
