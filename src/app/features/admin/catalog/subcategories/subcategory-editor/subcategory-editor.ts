import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
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
import { MediaApiService } from '../../../../../core/media/media-api.service';
import { MediaClientError } from '../../../../../core/media/media.models';
import { CatalogService } from '../../catalog.service';
import {
  MainCategory,
  MutableCatalogStatus,
  Subcategory,
  SubcategoryPatch,
  validateArabicCatalogName,
} from '../../catalog.models';

@Component({
  selector: 'app-subcategory-editor',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subcategory-editor.html',
  styleUrl: './subcategory-editor.css',
})
export class SubcategoryEditorComponent implements OnInit, OnDestroy {
  private catalog = inject(CatalogService);
  private media = inject(MediaApiService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  readonly subcategory = input<Subcategory | null>(null);
  readonly parents = input<MainCategory[]>([]);
  readonly closed = output<void>();
  readonly saved = output<Subcategory>();

  readonly mainCategoryId = signal('');
  readonly name = signal('');
  readonly status = signal<MutableCatalogStatus>('ACTIVE');
  readonly displayOrder = signal(0);
  readonly imageFile = signal<File | null>(null);
  readonly removeImage = signal(false);
  readonly preview = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly nameError = signal('');
  readonly confirmDiscard = signal(false);

  private previewUrl: string | null = null;
  private original: Subcategory | null = null;

  readonly isCreate = () => this.subcategory() == null;

  ngOnInit() {
    const row = this.subcategory();
    this.original = row;
    if (row) {
      this.mainCategoryId.set(row.mainCategory.id);
      this.name.set(row.name);
      this.status.set(row.status === 'ARCHIVED' ? 'INACTIVE' : row.status);
      this.displayOrder.set(row.displayOrder);
      this.preview.set(row.image?.url ?? null);
    }
  }

  ngOnDestroy() {
    this.revoke();
  }

  requestClose() {
    if (this.saving()) return;
    if (this.isDirty()) {
      this.confirmDiscard.set(true);
      return;
    }
    this.closed.emit();
  }

  onFile(file: File | undefined) {
    if (!file) return;
    this.removeImage.set(false);
    this.imageFile.set(file);
    this.revoke();
    this.previewUrl = URL.createObjectURL(file);
    this.preview.set(this.previewUrl);
  }

  clearImage() {
    this.imageFile.set(null);
    this.removeImage.set(true);
    this.revoke();
    this.preview.set(null);
  }

  setDisplayOrder(value: number | string) {
    const n = typeof value === 'number' ? value : Number(value);
    this.displayOrder.set(Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0);
  }

  setStatus(value: string) {
    if (value === 'ACTIVE' || value === 'INACTIVE') this.status.set(value);
  }

  async submit() {
    if (this.saving()) return;
    if (!this.mainCategoryId()) {
      this.error.set(this.language.t('catalog.parentRequired'));
      return;
    }
    const nameError = validateArabicCatalogName(this.name());
    if (nameError) {
      this.nameError.set(this.language.t(nameError));
      return;
    }
    this.nameError.set('');
    this.error.set('');
    this.saving.set(true);
    const created: string[] = [];
    try {
      let imageAssetId: string | undefined;
      if (this.imageFile()) {
        const asset = await this.media.uploadImage(this.imageFile()!, 'CATEGORY_IMAGE');
        created.push(asset.id);
        imageAssetId = asset.id;
      }
      if (this.isCreate()) {
        const row = await this.catalog.createSubcategory({
          mainCategoryId: this.mainCategoryId(),
          name: this.name().trim(),
          ...(imageAssetId ? { imageAssetId } : {}),
          status: this.status(),
          displayOrder: this.displayOrder(),
        });
        this.notify.success(this.language.t('catalog.subCreated'));
        this.saved.emit(row);
        return;
      }
      const original = this.original!;
      const patch: SubcategoryPatch = {};
      if (this.mainCategoryId() !== original.mainCategory.id) {
        patch.mainCategoryId = this.mainCategoryId();
      }
      if (this.name().trim() !== original.name) patch.name = this.name().trim();
      if (this.status() !== original.status) patch.status = this.status();
      if (this.displayOrder() !== original.displayOrder) patch.displayOrder = this.displayOrder();
      if (imageAssetId) patch.imageAssetId = imageAssetId;
      else if (this.removeImage() && original.image) patch.imageAssetId = null;
      if (Object.keys(patch).length === 0) {
        this.notify.success(this.language.t('catalog.noChanges'));
        this.closed.emit();
        return;
      }
      const row = await this.catalog.updateSubcategory(original.id, patch);
      this.notify.success(this.language.t('catalog.subUpdated'));
      this.saved.emit(row);
    } catch (err) {
      await Promise.all(created.map((id) => this.media.bestEffortDelete(id)));
      this.handleError(err);
    } finally {
      this.saving.set(false);
    }
  }

  parentStatus(id: string): string {
    const parent = this.parents().find((item) => item.id === id);
    return parent ? this.language.t(`status.${parent.status}`) : '';
  }

  private isDirty(): boolean {
    if (this.isCreate()) {
      return Boolean(this.name() || this.mainCategoryId() || this.imageFile());
    }
    const original = this.original!;
    return (
      this.mainCategoryId() !== original.mainCategory.id ||
      this.name().trim() !== original.name ||
      this.status() !== original.status ||
      this.displayOrder() !== original.displayOrder ||
      Boolean(this.imageFile()) ||
      this.removeImage()
    );
  }

  private handleError(err: unknown) {
    if (err instanceof MediaClientError) {
      this.error.set(this.language.t(`stores.media.${err.code}`));
      return;
    }
    if (isApiErrorCode(err, 'SUBCATEGORY_NAME_CONFLICT')) {
      this.nameError.set(this.language.t('catalog.subNameConflict'));
      return;
    }
    if (isApiErrorCode(err, 'MEDIA_NOT_ATTACHABLE')) {
      this.error.set(this.language.t('catalog.mediaNotAttachable'));
      return;
    }
    if (isApiErrorCode(err, 'MAIN_CATEGORY_ARCHIVED') || isApiErrorCode(err, 'MAIN_CATEGORY_NOT_FOUND')) {
      this.error.set(this.language.t('catalog.parentUnavailable'));
      return;
    }
    if (isApiErrorCode(err, 'CITY_NOT_ACTIVE')) {
      this.error.set(this.language.t('catalog.cityNotActive'));
      return;
    }
    this.error.set(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }

  private revoke() {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
  }
}
