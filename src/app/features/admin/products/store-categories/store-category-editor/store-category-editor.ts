import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '../../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { TranslatePipe } from '../../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../../i18n/language.service';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { getApiErrorMessage, isApiErrorCode } from '../../../../../core/http/api-error';
import { validateArabicCatalogName } from '../../../catalog/catalog.models';
import { ProductCatalogService } from '../../product-catalog.service';
import {
  MutableCatalogStatus,
  StoreCategory,
  StoreCategoryPatch,
} from '../../product-catalog.models';

@Component({
  selector: 'app-store-category-editor',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './store-category-editor.html',
  styleUrl: './store-category-editor.css',
})
export class StoreCategoryEditorComponent implements OnInit {
  @ViewChild('parentSelect') parentSelect?: ElementRef<HTMLSelectElement>;

  private api = inject(ProductCatalogService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  readonly storeId = input.required<string>();
  readonly category = input<StoreCategory | null>(null);
  readonly roots = input<StoreCategory[]>([]);
  readonly hasNonArchivedChildren = input(false);

  readonly closed = output<void>();
  readonly saved = output<StoreCategory>();
  readonly storeArchived = output<void>();

  readonly name = signal('');
  readonly parentCategoryId = signal<string>('');
  readonly status = signal<MutableCatalogStatus>('ACTIVE');
  readonly displayOrder = signal(0);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly nameError = signal('');
  readonly parentError = signal('');
  readonly confirmDiscard = signal(false);

  readonly isCreate = () => this.category() == null;

  ngOnInit() {
    const category = this.category();
    if (category) {
      this.name.set(category.name);
      this.parentCategoryId.set(category.parentCategoryId ?? '');
      this.status.set(category.status === 'ARCHIVED' ? 'INACTIVE' : category.status);
      this.displayOrder.set(category.displayOrder);
    }
  }

  parentChoices(): StoreCategory[] {
    const id = this.category()?.id;
    return this.roots().filter((root) => root.id !== id && root.status !== 'ARCHIVED');
  }

  parentLocked(): boolean {
    return !this.isCreate() && this.category()?.parentCategoryId == null && this.hasNonArchivedChildren();
  }

  requestClose() {
    if (this.saving()) return;
    if (this.isDirty()) {
      this.confirmDiscard.set(true);
      return;
    }
    this.closed.emit();
  }

  setDisplayOrder(value: number | string) {
    const n = typeof value === 'number' ? value : Number(value);
    this.displayOrder.set(Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0);
  }

  setStatus(value: string) {
    if (value === 'ACTIVE' || value === 'INACTIVE') this.status.set(value);
  }

  setParent(value: string) {
    this.parentCategoryId.set(value);
    this.parentError.set('');
  }

  async submit() {
    if (this.saving()) return;
    const nameError = validateArabicCatalogName(this.name());
    if (nameError) {
      this.nameError.set(this.language.t(nameError));
      return;
    }
    this.nameError.set('');
    this.parentError.set('');
    this.error.set('');
    this.saving.set(true);
    try {
      if (this.isCreate()) {
        const parent = this.parentCategoryId();
        const row = await this.api.createStoreCategory(this.storeId(), {
          name: this.name().trim(),
          status: this.status(),
          displayOrder: this.displayOrder(),
          ...(parent ? { parentCategoryId: parent } : {}),
        });
        this.notify.success(this.language.t('products.categoryCreated'));
        this.saved.emit(row);
        return;
      }
      const current = this.category()!;
      const patch = this.buildPatch(current);
      if (!patch) {
        this.notify.success(this.language.t('catalog.noChanges'));
        this.closed.emit();
        return;
      }
      const row = await this.api.updateStoreCategory(this.storeId(), current.id, patch);
      this.notify.success(this.language.t('products.categoryUpdated'));
      this.saved.emit(row);
    } catch (err) {
      if (isApiErrorCode(err, 'STORE_ARCHIVED')) {
        this.notify.error(this.language.t('products.storeArchived'));
        this.storeArchived.emit();
        return;
      }
      if (isApiErrorCode(err, 'STORE_CATEGORY_NAME_CONFLICT')) {
        this.nameError.set(this.language.t('products.categoryNameConflict'));
        return;
      }
      if (isApiErrorCode(err, 'STORE_CATEGORY_HIERARCHY_INVALID')) {
        this.parentError.set(this.language.t('products.hierarchyInvalid'));
        queueMicrotask(() => this.parentSelect?.nativeElement.focus());
        return;
      }
      this.error.set(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.saving.set(false);
    }
  }

  private buildPatch(current: StoreCategory): StoreCategoryPatch | null {
    const patch: StoreCategoryPatch = {};
    const name = this.name().trim();
    if (name !== current.name) patch.name = name;
    const nextParent = this.parentCategoryId() || null;
    if (nextParent !== current.parentCategoryId) patch.parentCategoryId = nextParent;
    if (this.status() !== current.status) patch.status = this.status();
    if (this.displayOrder() !== current.displayOrder) patch.displayOrder = this.displayOrder();
    return Object.keys(patch).length ? patch : null;
  }

  private isDirty(): boolean {
    const current = this.category();
    if (!current) {
      return Boolean(this.name().trim() || this.parentCategoryId() || this.displayOrder() !== 0);
    }
    return this.buildPatch(current) != null;
  }
}
