import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableComponent } from '../../../../../shared/components/table/table';
import { ConfirmationDialogComponent } from '../../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { TableColumn } from '../../../../../shared/models/table-column.interface';
import { PaginationConfig } from '../../../../../shared/models/pagination.interface';
import { TranslatePipe } from '../../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../../i18n/language.service';
import { NotificationService } from '../../../../../shared/services/notification.service';
import {
  getApiErrorMessage,
  getApiErrorStatus,
  isApiErrorCode,
} from '../../../../../core/http/api-error';
import { validateArabicCatalogName } from '../../../catalog/catalog.models';
import { ModifierCatalogService } from '../modifier.service';
import {
  ModifierGroup,
  ModifierGroupRow,
  ModifierOption,
  ModifierStatus,
  MutableModifierStatus,
  toGroupRow,
} from '../modifier.models';
import { ModifierGroupEditorComponent } from './modifier-group-editor/modifier-group-editor';

@Component({
  selector: 'app-modifier-groups',
  standalone: true,
  imports: [
    FormsModule,
    TableComponent,
    ConfirmationDialogComponent,
    TranslatePipe,
    ModifierGroupEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modifier-groups.html',
  styleUrl: './modifier-groups.css',
})
export class ModifierGroupsComponent implements OnDestroy {
  private api = inject(ModifierCatalogService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  readonly storeId = input.required<string>();
  readonly mutationsDisabled = input(false);
  readonly reloadToken = input(0);
  readonly changed = output<void>();
  readonly storeArchived = output<void>();

  readonly rows = signal<ModifierGroupRow[]>([]);
  readonly pagination = signal<PaginationConfig | null>(null);
  readonly isLoading = signal(true);
  readonly blocked = signal(false);
  readonly blockedMessage = signal('');
  readonly search = signal('');
  readonly statusFilter = signal<'' | ModifierStatus>('');
  readonly page = signal(1);
  readonly selected = signal<ModifierGroup | null>(null);
  readonly editorOpen = signal(false);
  readonly editing = signal<ModifierGroup | null>(null);
  readonly confirmArchive = signal(false);
  readonly confirmOptionArchive = signal<ModifierOption | null>(null);
  readonly mutating = signal(false);
  readonly optionName = signal('');
  readonly optionError = signal('');
  readonly savingOptionId = signal('');
  readonly optionDrafts = signal<Record<string, { name: string; order: string }>>({});

  columns: TableColumn[] = [];
  private listSeq = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.columns = [
      { key: 'name', label: this.language.t('catalog.name') },
      {
        key: 'status',
        label: this.language.t('geo.status'),
        type: 'badge',
        valueMap: {
          ACTIVE: this.language.t('status.ACTIVE'),
          INACTIVE: this.language.t('status.INACTIVE'),
          ARCHIVED: this.language.t('status.ARCHIVED'),
        },
        badgeClassMap: {
          ACTIVE: 'badge-success',
          INACTIVE: 'badge-default',
          ARCHIVED: 'badge-danger',
        },
      },
      { key: 'selectionRule', label: this.language.t('mods.selectionRule') },
      { key: 'optionsCount', label: this.language.t('mods.optionsCount') },
      { key: 'createdAt', label: this.language.t('geo.createdAt'), type: 'date' },
    ];
    effect(() => {
      const storeId = this.storeId();
      this.reloadToken();
      this.selected.set(null);
      this.page.set(1);
      if (storeId) void this.loadList(1);
    });
  }

  ngOnDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  onSearchInput(value: string) {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadList(1), 350);
  }

  onStatusChange(value: string) {
    this.statusFilter.set((value || '') as '' | ModifierStatus);
    void this.loadList(1);
  }

  onPageChange(page: number) {
    void this.loadList(page);
  }

  async onView(row: ModifierGroupRow) {
    try {
      const group = await this.api.getGroup(this.storeId(), row.id);
      this.selected.set(group);
      this.syncDrafts(group);
    } catch (err) {
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }

  openCreate() {
    if (this.mutationsDisabled()) return;
    this.editing.set(null);
    this.editorOpen.set(true);
  }

  openEdit() {
    const group = this.selected();
    if (!group || group.status === 'ARCHIVED' || this.mutationsDisabled()) return;
    this.editing.set(group);
    this.editorOpen.set(true);
  }

  async onSaved(group: ModifierGroup) {
    this.editorOpen.set(false);
    this.editing.set(null);
    this.selected.set(group);
    this.syncDrafts(group);
    this.changed.emit();
    await this.loadList(this.page());
  }

  closeDetails() {
    this.selected.set(null);
    this.optionDrafts.set({});
  }

  patchDraft(optionId: string, patch: Partial<{ name: string; order: string }>) {
    this.optionDrafts.update((current) => ({
      ...current,
      [optionId]: { name: current[optionId]?.name ?? '', order: current[optionId]?.order ?? '0', ...patch },
    }));
  }

  async setStatus(status: MutableModifierStatus) {
    const group = this.selected();
    if (!group || group.status === 'ARCHIVED' || this.mutationsDisabled()) return;
    this.mutating.set(true);
    try {
      const updated = await this.api.updateGroup(this.storeId(), group.id, { status });
      this.selected.set(updated);
      this.syncDrafts(updated);
      this.notify.success(this.language.t('mods.groupUpdated'));
      this.changed.emit();
      await this.loadList(this.page());
    } catch (err) {
      this.handleMutation(err);
    } finally {
      this.mutating.set(false);
    }
  }

  async runArchive() {
    const group = this.selected();
    if (!group) return;
    this.mutating.set(true);
    try {
      const updated = await this.api.archiveGroup(this.storeId(), group.id);
      this.selected.set(updated);
      this.syncDrafts(updated);
      this.confirmArchive.set(false);
      this.notify.success(this.language.t('mods.groupArchived'));
      this.changed.emit();
      await this.loadList(this.page());
    } catch (err) {
      this.handleMutation(err);
    } finally {
      this.mutating.set(false);
    }
  }

  async restoreGroup() {
    const group = this.selected();
    if (!group || this.mutationsDisabled()) return;
    this.mutating.set(true);
    try {
      const updated = await this.api.restoreGroup(this.storeId(), group.id);
      this.selected.set(updated);
      this.syncDrafts(updated);
      this.notify.success(this.language.t('mods.groupRestored'));
      this.changed.emit();
      await this.loadList(this.page());
    } catch (err) {
      if (isApiErrorCode(err, 'MODIFIER_GROUP_NAME_CONFLICT')) {
        this.notify.error(this.language.t('mods.groupNameConflict'));
        return;
      }
      if (isApiErrorCode(err, 'MODIFIER_GROUP_NOT_ARCHIVED')) {
        this.notify.error(this.language.t('mods.groupNotArchived'));
        return;
      }
      this.handleMutation(err);
    } finally {
      this.mutating.set(false);
    }
  }

  async addOption() {
    const group = this.selected();
    if (!group || group.status === 'ARCHIVED' || this.mutationsDisabled()) return;
    const nameError = validateArabicCatalogName(this.optionName());
    if (nameError) {
      this.optionError.set(this.language.t(nameError));
      return;
    }
    this.mutating.set(true);
    this.optionError.set('');
    try {
      const updated = await this.api.addOption(this.storeId(), group.id, {
        name: this.optionName().trim(),
        isAvailable: true,
        status: 'ACTIVE',
        displayOrder: group.options.length,
      });
      this.selected.set(updated);
      this.syncDrafts(updated);
      this.optionName.set('');
      this.notify.success(this.language.t('mods.optionAdded'));
      this.changed.emit();
      await this.loadList(this.page());
    } catch (err) {
      this.handleOptionError(err);
    } finally {
      this.mutating.set(false);
    }
  }

  async saveOption(option: ModifierOption) {
    const group = this.selected();
    if (!group || option.status === 'ARCHIVED' || this.mutationsDisabled()) return;
    const draft = this.optionDrafts()[option.id];
    const name = draft?.name ?? option.name;
    const order = draft?.order ?? String(option.displayOrder);
    const nameError = validateArabicCatalogName(name);
    if (nameError) {
      this.optionError.set(this.language.t(nameError));
      return;
    }
    this.savingOptionId.set(option.id);
    try {
      const updated = await this.api.updateOption(this.storeId(), group.id, option.id, {
        name: name.trim(),
        displayOrder: Number(order) || 0,
      });
      this.selected.set(updated);
      this.syncDrafts(updated);
      this.notify.success(this.language.t('mods.optionUpdated'));
      this.changed.emit();
    } catch (err) {
      this.handleOptionError(err);
    } finally {
      this.savingOptionId.set('');
    }
  }

  async toggleOptionAvailable(option: ModifierOption) {
    const group = this.selected();
    if (!group || option.status === 'ARCHIVED' || this.mutationsDisabled()) return;
    this.savingOptionId.set(option.id);
    try {
      const updated = await this.api.updateOption(this.storeId(), group.id, option.id, {
        isAvailable: !option.isAvailable,
      });
      this.selected.set(updated);
      this.syncDrafts(updated);
      this.changed.emit();
    } catch (err) {
      this.handleOptionError(err);
    } finally {
      this.savingOptionId.set('');
    }
  }

  async toggleOptionStatus(option: ModifierOption) {
    const group = this.selected();
    if (!group || option.status === 'ARCHIVED' || this.mutationsDisabled()) return;
    this.savingOptionId.set(option.id);
    try {
      const updated = await this.api.updateOption(this.storeId(), group.id, option.id, {
        status: option.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      this.selected.set(updated);
      this.syncDrafts(updated);
      this.changed.emit();
    } catch (err) {
      this.handleOptionError(err);
    } finally {
      this.savingOptionId.set('');
    }
  }

  async archiveOption() {
    const group = this.selected();
    const option = this.confirmOptionArchive();
    if (!group || !option) return;
    this.savingOptionId.set(option.id);
    try {
      const updated = await this.api.archiveOption(this.storeId(), group.id, option.id);
      this.selected.set(updated);
      this.syncDrafts(updated);
      this.confirmOptionArchive.set(null);
      this.notify.success(this.language.t('mods.optionArchived'));
      this.changed.emit();
      await this.loadList(this.page());
    } catch (err) {
      this.handleOptionError(err);
    } finally {
      this.savingOptionId.set('');
    }
  }

  async restoreOption(option: ModifierOption) {
    const group = this.selected();
    if (!group || this.mutationsDisabled()) return;
    this.savingOptionId.set(option.id);
    try {
      const updated = await this.api.restoreOption(this.storeId(), group.id, option.id);
      this.selected.set(updated);
      this.syncDrafts(updated);
      this.notify.success(this.language.t('mods.optionRestored'));
      this.changed.emit();
      await this.loadList(this.page());
    } catch (err) {
      if (isApiErrorCode(err, 'MODIFIER_OPTION_NAME_CONFLICT')) {
        this.optionError.set(this.language.t('mods.optionNameConflict'));
        return;
      }
      if (isApiErrorCode(err, 'MODIFIER_OPTION_NOT_ARCHIVED')) {
        this.notify.error(this.language.t('mods.optionNotArchived'));
        return;
      }
      this.handleOptionError(err);
    } finally {
      this.savingOptionId.set('');
    }
  }

  statusLabel(status: ModifierStatus): string {
    return this.language.t(`status.${status}`);
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(this.language.lang() === 'ar' ? 'ar' : 'en-GB');
  }

  private syncDrafts(group: ModifierGroup) {
    const drafts: Record<string, { name: string; order: string }> = {};
    for (const option of group.options) {
      drafts[option.id] = { name: option.name, order: String(option.displayOrder) };
    }
    this.optionDrafts.set(drafts);
  }

  private async loadList(page: number) {
    const storeId = this.storeId();
    const seq = ++this.listSeq;
    this.isLoading.set(true);
    this.page.set(page);
    try {
      const result = await this.api.listGroups(storeId, {
        page,
        limit: 20,
        search: this.search().trim() || undefined,
        status: this.statusFilter() || undefined,
      });
      if (seq !== this.listSeq || storeId !== this.storeId()) return;
      this.blocked.set(false);
      this.rows.set(result.data.map(toGroupRow));
      const pages = Math.max(1, Math.ceil(result.total / result.limit) || 1);
      this.pagination.set({
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages,
        hasNext: result.page < pages,
        hasPrev: result.page > 1,
      });
    } catch (err) {
      if (seq !== this.listSeq || storeId !== this.storeId()) return;
      if (getApiErrorStatus(err) === 403) {
        this.blocked.set(true);
        this.blockedMessage.set(getApiErrorMessage(err, this.language.t('mods.blocked')));
        this.rows.set([]);
        this.pagination.set(null);
        return;
      }
      if (isApiErrorCode(err, 'STORE_ARCHIVED')) {
        this.storeArchived.emit();
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      if (seq === this.listSeq) this.isLoading.set(false);
    }
  }

  private handleOptionError(err: unknown) {
    if (isApiErrorCode(err, 'MODIFIER_OPTION_NAME_CONFLICT')) {
      this.optionError.set(this.language.t('mods.optionNameConflict'));
      return;
    }
    this.handleMutation(err);
  }

  private handleMutation(err: unknown) {
    if (isApiErrorCode(err, 'STORE_ARCHIVED')) {
      this.storeArchived.emit();
      return;
    }
    if (isApiErrorCode(err, 'INVALID_MODIFIER_DEFAULTS')) {
      this.notify.error(this.language.t('mods.invalidDefaults'));
      return;
    }
    this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }
}
