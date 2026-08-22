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
import { getApiErrorCode, getApiErrorMessage, isApiErrorCode } from '../../../../../core/http/api-error';
import { MediaApiService } from '../../../../../core/media/media-api.service';
import { MediaClientError } from '../../../../../core/media/media.models';
import { CatalogService } from '../../catalog.service';
import {
  MainCategory,
  MainCategoryPatch,
  MutableCatalogStatus,
} from '../../catalog.models';

@Component({
  selector: 'app-main-category-editor',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main-category-editor.html',
  styleUrl: './main-category-editor.css',
})
export class MainCategoryEditorComponent implements OnInit, OnDestroy {
  private catalog = inject(CatalogService);
  private media = inject(MediaApiService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  readonly category = input<MainCategory | null>(null);
  readonly cityId = input.required<string>();
  readonly closed = output<void>();
  readonly saved = output<MainCategory>();

  readonly nameAr = signal('');
  readonly nameEn = signal('');
  readonly status = signal<MutableCatalogStatus>('ACTIVE');
  readonly displayOrder = signal(0);
  readonly imageFile = signal<File | null>(null);
  readonly preview = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly nameError = signal('');
  readonly confirmDiscard = signal(false);

  private previewUrl: string | null = null;
  private original: MainCategory | null = null;

  readonly isCreate = () => this.category() == null;

  ngOnInit() {
    const category = this.category();
    this.original = category;
    if (category) {
      this.nameAr.set(category.translations.find((item) => item.locale === 'ar')?.name ?? category.name);
      this.nameEn.set(category.translations.find((item) => item.locale === 'en')?.name ?? '');
      this.status.set(category.status === 'ARCHIVED' ? 'INACTIVE' : category.status);
      this.displayOrder.set(category.displayOrder);
      this.preview.set(category.image.url);
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
    this.imageFile.set(file);
    this.revoke();
    this.previewUrl = URL.createObjectURL(file);
    this.preview.set(this.previewUrl);
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
    if (!this.nameAr().trim() || !this.nameEn().trim()) {
      this.nameError.set(this.language.t('catalog.nameRequired'));
      return;
    }
    if (this.isCreate() && !this.imageFile()) {
      this.error.set(this.language.t('catalog.imageRequired'));
      return;
    }
    this.nameError.set('');
    this.error.set('');
    this.saving.set(true);
    const created: string[] = [];
    try {
      if (this.isCreate()) {
        const asset = await this.media.uploadImage(this.imageFile()!, 'CATEGORY_IMAGE', this.cityId());
        created.push(asset.id);
        const row = await this.catalog.createMainCategory({
          cityId: this.cityId(), translations: this.translations(),
          imageAssetId: asset.id,
          status: this.status(),
          displayOrder: this.displayOrder(),
        });
        this.notify.success(this.language.t('catalog.mainCreated'));
        this.saved.emit(row);
        return;
      }
      const original = this.original!;
      const patch: MainCategoryPatch = {};
      if (JSON.stringify(this.translations()) !== JSON.stringify(original.translations)) patch.translations = this.translations();
      if (this.status() !== original.status) patch.status = this.status();
      if (this.displayOrder() !== original.displayOrder) patch.displayOrder = this.displayOrder();
      if (this.imageFile()) {
        const asset = await this.media.uploadImage(this.imageFile()!, 'CATEGORY_IMAGE', this.cityId());
        created.push(asset.id);
        patch.imageAssetId = asset.id;
      }
      if (Object.keys(patch).length === 0) {
        this.notify.success(this.language.t('catalog.noChanges'));
        this.closed.emit();
        return;
      }
      const row = await this.catalog.updateMainCategory(original.id, this.cityId(), patch);
      this.notify.success(this.language.t('catalog.mainUpdated'));
      this.saved.emit(row);
    } catch (err) {
      await Promise.all(created.map((id) => this.media.bestEffortDelete(id, this.cityId())));
      this.handleError(err);
    } finally {
      this.saving.set(false);
    }
  }

  private isDirty(): boolean {
    if (this.isCreate()) {
      return Boolean(this.nameAr() || this.nameEn() || this.imageFile());
    }
    const original = this.original!;
    return (
      JSON.stringify(this.translations()) !== JSON.stringify(original.translations) ||
      this.status() !== original.status ||
      this.displayOrder() !== original.displayOrder ||
      Boolean(this.imageFile())
    );
  }

  private handleError(err: unknown) {
    if (err instanceof MediaClientError) {
      this.error.set(this.language.t(`stores.media.${err.code}`));
      return;
    }
    if (isApiErrorCode(err, 'MAIN_CATEGORY_NAME_CONFLICT')) {
      this.nameError.set(this.language.t('catalog.mainNameConflict'));
      return;
    }
    if (isApiErrorCode(err, 'MEDIA_NOT_ATTACHABLE')) {
      this.error.set(this.language.t('catalog.mediaNotAttachable'));
      return;
    }
    if (isApiErrorCode(err, 'CITY_NOT_ACTIVE')) {
      this.error.set(this.language.t('catalog.cityNotActive'));
      return;
    }
    if (getApiErrorCode(err) === 'MAIN_CATEGORY_IMAGE_REQUIRED') {
      this.error.set(this.language.t('catalog.imageRequired'));
      return;
    }
    this.error.set(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }

  private revoke() {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
  }

  private translations() {
    return [
      { locale: 'ar' as const, name: this.nameAr().trim() },
      { locale: 'en' as const, name: this.nameEn().trim() },
    ];
  }
}
