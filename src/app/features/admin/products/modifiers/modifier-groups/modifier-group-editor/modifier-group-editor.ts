import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '../../../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { TranslatePipe } from '../../../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../../../i18n/language.service';
import { NotificationService } from '../../../../../../shared/services/notification.service';
import { getApiErrorMessage, isApiErrorCode } from '../../../../../../core/http/api-error';
import { validateArabicCatalogName } from '../../../../catalog/catalog.models';
import { ModifierCatalogService } from '../../modifier.service';
import {
  ModifierGroup,
  ModifierGroupPatch,
  ModifierOptionDraft,
  MutableModifierStatus,
  parsePositiveInt,
} from '../../modifier.models';

@Component({
  selector: 'app-modifier-group-editor',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modifier-group-editor.html',
  styleUrl: './modifier-group-editor.css',
})
export class ModifierGroupEditorComponent implements OnInit {
  private api = inject(ModifierCatalogService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  readonly storeId = input.required<string>();
  readonly group = input<ModifierGroup | null>(null);
  readonly closed = output<void>();
  readonly saved = output<ModifierGroup>();
  readonly storeArchived = output<void>();

  readonly name = signal('');
  readonly minSelect = signal(0);
  readonly maxSelect = signal(1);
  readonly status = signal<MutableModifierStatus>('ACTIVE');
  readonly options = signal<ModifierOptionDraft[]>([this.blankOption(0)]);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly nameError = signal('');
  readonly limitsError = signal('');
  readonly confirmDiscard = signal(false);

  readonly isCreate = () => this.group() == null;

  setMutableStatus(value: string) {
    if (value === 'ACTIVE' || value === 'INACTIVE') this.status.set(value);
  }

  ngOnInit() {
    const group = this.group();
    if (group) {
      this.name.set(group.name);
      this.minSelect.set(group.minSelect);
      this.maxSelect.set(group.maxSelect);
      this.status.set(group.status === 'ARCHIVED' ? 'INACTIVE' : group.status);
    }
  }

  addOption() {
    this.options.set([...this.options(), this.blankOption(this.options().length)]);
  }

  removeOption(key: string) {
    const next = this.options().filter((item) => item.key !== key);
    if (!next.length) return;
    this.options.set(next.map((item, index) => ({ ...item, displayOrder: index })));
  }

  moveOption(key: string, delta: -1 | 1) {
    const next = [...this.options()];
    const index = next.findIndex((item) => item.key === key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= next.length) return;
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    this.options.set(next.map((item, i) => ({ ...item, displayOrder: i })));
  }

  patchOption(key: string, patch: Partial<ModifierOptionDraft>) {
    this.options.set(this.options().map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  requestClose() {
    if (this.saving()) return;
    if (this.isDirty()) {
      this.confirmDiscard.set(true);
      return;
    }
    this.closed.emit();
  }

  async submit() {
    if (this.saving()) return;
    const nameError = validateArabicCatalogName(this.name());
    if (nameError) {
      this.nameError.set(this.language.t(nameError));
      return;
    }
    const minSelect = parsePositiveInt(this.minSelect(), 0);
    const maxSelect = parsePositiveInt(this.maxSelect(), 1);
    if (minSelect == null || maxSelect == null || minSelect > maxSelect) {
      this.limitsError.set(this.language.t('mods.invalidSelect'));
      return;
    }
    this.nameError.set('');
    this.limitsError.set('');
    this.error.set('');
    if (this.isCreate()) {
      const optionRows = this.options();
      if (!optionRows.length) {
        this.error.set(this.language.t('mods.needOption'));
        return;
      }
      for (const option of optionRows) {
        const optionNameError = validateArabicCatalogName(option.name);
        if (optionNameError) {
          this.error.set(this.language.t(optionNameError));
          return;
        }
      }
    }
    this.saving.set(true);
    try {
      if (this.isCreate()) {
        const group = await this.api.createGroup(this.storeId(), {
          name: this.name().trim(),
          minSelect,
          maxSelect,
          status: this.status(),
          options: this.options().map((option, index) => ({
            name: option.name.trim(),
            isAvailable: option.isAvailable,
            status: 'ACTIVE' as const,
            displayOrder: index,
          })),
        });
        this.notify.success(this.language.t('mods.groupCreated'));
        this.saved.emit(group);
        return;
      }
      const current = this.group()!;
      const patch = this.buildPatch(current, minSelect, maxSelect);
      if (!patch) {
        this.notify.success(this.language.t('catalog.noChanges'));
        this.closed.emit();
        return;
      }
      const group = await this.api.updateGroup(this.storeId(), current.id, patch);
      this.notify.success(this.language.t('mods.groupUpdated'));
      this.saved.emit(group);
    } catch (err) {
      this.handleError(err);
    } finally {
      this.saving.set(false);
    }
  }

  private buildPatch(
    current: ModifierGroup,
    minSelect: number,
    maxSelect: number
  ): ModifierGroupPatch | null {
    const patch: ModifierGroupPatch = {};
    const name = this.name().trim();
    if (name !== current.name) patch.name = name;
    if (minSelect !== current.minSelect) patch.minSelect = minSelect;
    if (maxSelect !== current.maxSelect) patch.maxSelect = maxSelect;
    if (this.status() !== current.status) patch.status = this.status();
    return Object.keys(patch).length ? patch : null;
  }

  private isDirty(): boolean {
    if (this.isCreate()) return Boolean(this.name().trim() || this.options().some((item) => item.name.trim()));
    const current = this.group();
    if (!current) return false;
    return this.buildPatch(current, this.minSelect(), this.maxSelect()) != null;
  }

  private handleError(err: unknown) {
    if (isApiErrorCode(err, 'STORE_ARCHIVED')) {
      this.storeArchived.emit();
      return;
    }
    if (isApiErrorCode(err, 'MODIFIER_GROUP_NAME_CONFLICT')) {
      this.nameError.set(this.language.t('mods.groupNameConflict'));
      return;
    }
    if (isApiErrorCode(err, 'MODIFIER_OPTION_NAME_CONFLICT')) {
      this.error.set(this.language.t('mods.optionNameConflict'));
      return;
    }
    if (isApiErrorCode(err, 'MODIFIER_GROUP_REQUIRES_OPTIONS')) {
      this.error.set(this.language.t('mods.needOption'));
      return;
    }
    if (isApiErrorCode(err, 'INVALID_MODIFIER_SELECT')) {
      this.limitsError.set(this.language.t('mods.invalidSelect'));
      return;
    }
    if (isApiErrorCode(err, 'INVALID_MODIFIER_DEFAULTS')) {
      this.limitsError.set(this.language.t('mods.invalidDefaults'));
      return;
    }
    this.error.set(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }

  private blankOption(order: number): ModifierOptionDraft {
    return {
      key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: '',
      isAvailable: true,
      displayOrder: order,
    };
  }
}
