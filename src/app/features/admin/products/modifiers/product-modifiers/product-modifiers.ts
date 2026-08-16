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
import { ConfirmationDialogComponent } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../i18n/language.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import {
  getApiErrorMessage,
  getApiErrorStatus,
  isApiErrorCode,
} from '../../../../core/http/api-error';
import { ProductCatalogService } from '../product-catalog.service';
import { Product } from '../product-catalog.models';
import { ModifierCatalogService } from './modifier.service';
import {
  ModifierGroup,
  ModifierOption,
  ModifierStatus,
  ProductModifierOption,
  ProductModifiers,
  parseNonNegativeIqd,
  parsePositiveInt,
} from './modifier.models';

interface OptionRow {
  option: ModifierOption;
  config: ProductModifierOption | null;
}

@Component({
  selector: 'app-product-modifiers',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-modifiers.html',
  styleUrl: './product-modifiers.css',
})
export class ProductModifiersComponent implements OnDestroy {
  private modifiersApi = inject(ModifierCatalogService);
  private catalog = inject(ProductCatalogService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  readonly storeId = input.required<string>();
  readonly productId = input.required<string>();
  readonly mutationsDisabled = input(false);
  readonly reloadToken = input(0);
  readonly closed = output<void>();
  readonly productChange = output<Product>();
  readonly storeArchived = output<void>();

  readonly loading = signal(true);
  readonly config = signal<ProductModifiers | null>(null);
  readonly product = signal<Product | null>(null);
  readonly groups = signal<ModifierGroup[]>([]);
  readonly groupsLookupDenied = signal(false);
  readonly pendingGroupId = signal('');
  readonly saving = signal(false);
  readonly savingOptionId = signal('');
  readonly editingOptionId = signal<string | null>(null);
  readonly price = signal('0');
  readonly productAvailable = signal(true);
  readonly isDefault = signal(false);
  readonly maxQuantity = signal('1');
  readonly rowError = signal('');
  readonly confirmSwitch = signal(false);
  readonly confirmClear = signal(false);
  readonly confirmRemove = signal<string | null>(null);

  readonly rows = computed<OptionRow[]>(() => {
    const current = this.config();
    const group = current?.group;
    if (!group) return [];
    return [...group.options]
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((option) => ({
        option,
        config: current.options.find((item) => item.modifierOptionId === option.id) ?? null,
      }));
  });

  private loadSeq = 0;
  private destroyed = false;

  constructor() {
    effect(() => {
      const storeId = this.storeId();
      const productId = this.productId();
      this.reloadToken();
      if (storeId && productId) void this.reload();
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  statusLabel(status: ModifierStatus | string): string {
    return this.language.t(`status.${status}`);
  }

  formatExtra(price: number): string {
    if (price === 0) return this.language.t('mods.free');
    const formatted = price.toLocaleString(this.language.lang() === 'ar' ? 'ar-IQ' : 'en-US');
    return this.language.lang() === 'ar' ? `+${formatted} د.ع` : `+${formatted} IQD`;
  }

  effectiveHint(row: OptionRow): string {
    const group = this.config()?.group;
    if (!group || group.status !== 'ACTIVE') return this.language.t('mods.notEffective');
    if (row.option.status !== 'ACTIVE' || !row.option.isAvailable) {
      return this.language.t('mods.notEffective');
    }
    if (!row.config || !row.config.isAvailable) return this.language.t('mods.notEffective');
    return this.language.t('mods.mayBeEffective');
  }

  startConfigure(row: OptionRow) {
    if (row.option.status === 'ARCHIVED' || this.config()?.group?.status === 'ARCHIVED') return;
    this.editingOptionId.set(row.option.id);
    this.price.set(String(row.config?.price ?? 0));
    this.productAvailable.set(row.config?.isAvailable ?? true);
    this.isDefault.set(row.config?.isDefault ?? false);
    this.maxQuantity.set(String(row.config?.maxQuantity ?? 1));
    this.rowError.set('');
    if (this.isDefault()) this.price.set('0');
  }

  onDefaultChange(value: boolean) {
    this.isDefault.set(value);
    if (value) this.price.set('0');
  }

  async restoreAssignedGroup() {
    const group = this.config()?.group;
    if (!group || group.status !== 'ARCHIVED' || this.groupsLookupDenied()) return;
    this.saving.set(true);
    try {
      await this.modifiersApi.restoreGroup(this.storeId(), group.id);
      this.notify.success(this.language.t('mods.groupRestored'));
      await this.reload();
    } catch (err) {
      if (isApiErrorCode(err, 'MODIFIER_GROUP_NAME_CONFLICT')) {
        this.notify.error(this.language.t('mods.groupNameConflict'));
        return;
      }
      this.handleConfigErr(err);
    } finally {
      this.saving.set(false);
    }
  }

  requestAssign() {
    const nextId = this.pendingGroupId();
    const currentId = this.config()?.modifierGroupId ?? null;
    if (!nextId || nextId === currentId) return;
    if (currentId) {
      this.confirmSwitch.set(true);
      return;
    }
    void this.assignGroup(nextId);
  }

  requestClear() {
    if (!this.config()?.modifierGroupId) return;
    this.confirmClear.set(true);
  }

  async assignGroup(groupId: string | null) {
    const storeId = this.storeId();
    const productId = this.productId();
    this.saving.set(true);
    this.confirmSwitch.set(false);
    this.confirmClear.set(false);
    try {
      const product = await this.catalog.updateProductModifierGroup(storeId, productId, {
        modifierGroupId: groupId,
      });
      this.product.set(product);
      this.productChange.emit(product);
      await this.loadConfig(storeId, productId);
      this.notify.success(this.language.t('mods.assignmentSaved'));
    } catch (err) {
      this.handleProductErr(err);
    } finally {
      this.saving.set(false);
    }
  }

  async saveRow(optionId: string) {
    const group = this.config()?.group;
    if (!group || group.status === 'ARCHIVED') {
      this.rowError.set(this.language.t('mods.groupArchivedErr'));
      return;
    }
    const option = group.options.find((item) => item.id === optionId);
    if (!option || option.status === 'ARCHIVED') {
      this.rowError.set(this.language.t('mods.optionArchivedErr'));
      return;
    }
    const price = parseNonNegativeIqd(this.price());
    const maxQuantity = parsePositiveInt(this.maxQuantity(), 1);
    if (price == null) {
      this.rowError.set(this.language.t('mods.invalidPrice'));
      return;
    }
    if (this.isDefault() && price !== 0) {
      this.rowError.set(this.language.t('mods.defaultPrice'));
      return;
    }
    if (maxQuantity == null) {
      this.rowError.set(this.language.t('mods.invalidMaxQty'));
      return;
    }
    const others = this.config()?.options.filter((item) => item.modifierOptionId !== optionId) ?? [];
    const nextDefaults = others.filter((item) => item.isDefault).length + (this.isDefault() ? 1 : 0);
    if (nextDefaults > group.maxSelect) {
      this.rowError.set(this.language.t('mods.invalidDefaults'));
      return;
    }
    this.savingOptionId.set(optionId);
    this.rowError.set('');
    try {
      const updated = await this.modifiersApi.upsertProductModifier(
        this.storeId(),
        this.productId(),
        optionId,
        {
          price: this.isDefault() ? 0 : price,
          isAvailable: this.productAvailable(),
          isDefault: this.isDefault(),
          maxQuantity,
        }
      );
      this.config.set(updated);
      this.editingOptionId.set(null);
      this.notify.success(this.language.t('mods.optionConfigured'));
    } catch (err) {
      this.handleConfigErr(err);
    } finally {
      this.savingOptionId.set('');
    }
  }

  async removeConfig() {
    const optionId = this.confirmRemove();
    if (!optionId) return;
    this.savingOptionId.set(optionId);
    try {
      const updated = await this.modifiersApi.removeProductModifier(
        this.storeId(),
        this.productId(),
        optionId
      );
      this.config.set(updated);
      this.confirmRemove.set(null);
      this.editingOptionId.set(null);
      this.notify.success(this.language.t('mods.configRemoved'));
    } catch (err) {
      this.handleConfigErr(err);
    } finally {
      this.savingOptionId.set('');
    }
  }

  private async reload() {
    const storeId = this.storeId();
    const productId = this.productId();
    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.editingOptionId.set(null);
    await Promise.all([this.loadProduct(storeId, productId, seq), this.loadGroups(storeId, seq)]);
    await this.loadConfig(storeId, productId, seq);
    if (seq === this.loadSeq) this.loading.set(false);
  }

  private async loadProduct(storeId: string, productId: string, seq = this.loadSeq) {
    try {
      const product = await this.catalog.getProduct(storeId, productId);
      if (this.stale(seq, storeId, productId)) return;
      this.product.set(product);
    } catch (err) {
      if (this.stale(seq, storeId, productId)) return;
      this.handleProductErr(err);
    }
  }

  private async loadGroups(storeId: string, seq = this.loadSeq) {
    try {
      const groups = await this.modifiersApi.listAssignableGroups(storeId);
      if (this.stale(seq, storeId, this.productId())) return;
      this.groupsLookupDenied.set(false);
      this.groups.set(groups);
    } catch (err) {
      if (this.stale(seq, storeId, this.productId())) return;
      if (getApiErrorStatus(err) === 403) {
        this.groupsLookupDenied.set(true);
        this.groups.set([]);
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }

  private async loadConfig(storeId: string, productId: string, seq = this.loadSeq) {
    try {
      const config = await this.modifiersApi.getProductModifiers(storeId, productId);
      if (this.stale(seq, storeId, productId)) return;
      this.config.set(config);
      this.pendingGroupId.set(config.modifierGroupId ?? '');
    } catch (err) {
      if (this.stale(seq, storeId, productId)) return;
      if (getApiErrorStatus(err) === 403) {
        this.notify.error(getApiErrorMessage(err, this.language.t('mods.productConfigDenied')));
        return;
      }
      this.handleConfigErr(err);
    }
  }

  private stale(seq: number, storeId: string, productId: string): boolean {
    return this.destroyed || seq !== this.loadSeq || storeId !== this.storeId() || productId !== this.productId();
  }

  private handleConfigErr(err: unknown) {
    if (isApiErrorCode(err, 'STORE_ARCHIVED')) {
      this.storeArchived.emit();
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_ARCHIVED')) {
      this.notify.error(this.language.t('mods.productArchived'));
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_HAS_NO_MODIFIER_GROUP')) {
      void this.reload();
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_MODIFIER_OPTION_NOT_FOUND')) {
      void this.loadConfig(this.storeId(), this.productId());
      this.notify.error(this.language.t('mods.configNotFound'));
      return;
    }
    if (isApiErrorCode(err, 'MODIFIER_OPTION_ARCHIVED')) {
      this.rowError.set(this.language.t('mods.optionArchivedErr'));
      return;
    }
    if (isApiErrorCode(err, 'MODIFIER_GROUP_ARCHIVED')) {
      this.rowError.set(this.language.t('mods.groupArchivedErr'));
      return;
    }
    if (isApiErrorCode(err, 'INVALID_MODIFIER_DEFAULT_PRICE')) {
      this.rowError.set(this.language.t('mods.defaultPrice'));
      return;
    }
    if (isApiErrorCode(err, 'INVALID_MODIFIER_DEFAULTS')) {
      this.rowError.set(this.language.t('mods.invalidDefaults'));
      return;
    }
    if (isApiErrorCode(err, 'INVALID_MAX_QUANTITY')) {
      this.rowError.set(this.language.t('mods.invalidMaxQty'));
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_MODIFIER_OPTION_CONFLICT')) {
      this.rowError.set(this.language.t('mods.configConflict'));
      return;
    }
    this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }

  private handleProductErr(err: unknown) {
    if (isApiErrorCode(err, 'STORE_ARCHIVED')) {
      this.storeArchived.emit();
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_ARCHIVED')) {
      this.notify.error(this.language.t('mods.productArchived'));
      return;
    }
    this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }
}
