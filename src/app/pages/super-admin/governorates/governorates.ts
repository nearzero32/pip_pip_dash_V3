import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableComponent } from '../../../components/table/table';
import { FormDialogComponent, FormField } from '../../../components/form-dialog/form-dialog';
import { ExportButtonComponent } from '../../../components/buttons/export-button/export-button';
import { TableColumn } from '../../../interfaces/table-column.interface';
import { PaginationConfig } from '../../../interfaces/pagination.interface';
import { Governorate } from '../../../interfaces/super-admin/geography.interface';
import { GeographyService } from '../../../services/super-admin/geography.service';
import { LanguageService } from '../../../services/language.service';
import { NotificationService } from '../../../services/notification.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { apiErrorMessage } from '../../../core/api-error';
import { downloadBlob } from '../../../core/download';

@Component({
  selector: 'app-governorates',
  standalone: true,
  imports: [CommonModule, TableComponent, FormDialogComponent, ExportButtonComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './governorates.html',
})
export class GovernoratesComponent implements OnInit {
  private api = inject(GeographyService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  data = signal<Governorate[]>([]);
  isLoading = signal(true);
  exporting = signal(false);
  submitting = signal(false);
  showForm = signal(false);
  editing = signal<Governorate | null>(null);
  pagination = signal<PaginationConfig | null>(null);
  page = signal(1);
  columns: TableColumn[] = [];
  fields: FormField[] = [];

  ngOnInit() {
    this.columns = [
      { key: 'nameAr', label: this.language.t('geo.nameAr') },
      { key: 'nameEn', label: this.language.t('geo.nameEn') },
      {
        key: 'status',
        label: this.language.t('geo.status'),
        type: 'badge',
        badgeClassMap: { ACTIVE: 'badge-success', INACTIVE: 'badge-default' },
      },
      { key: 'displayOrder', label: this.language.t('geo.displayOrder') },
    ];
    this.fields = [
      {
        name: 'status',
        label: this.language.t('geo.status'),
        type: 'select',
        required: true,
        options: [
          { value: 'ACTIVE', label: this.language.t('geo.active') },
          { value: 'INACTIVE', label: this.language.t('geo.inactive') },
        ],
      },
      {
        name: 'displayOrder',
        label: this.language.t('geo.displayOrder'),
        type: 'number',
        required: true,
      },
    ];
    this.load();
  }

  async load(page = 1) {
    this.isLoading.set(true);
    try {
      const result = await this.api.listGovernorates(page, 50);
      this.data.set(result.data);
      this.page.set(result.page);
      const pages = Math.max(1, Math.ceil(result.total / result.limit));
      this.pagination.set({
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages,
        hasNext: result.page < pages,
        hasPrev: result.page > 1,
      });
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.isLoading.set(false);
    }
  }

  onEdit(row: Governorate) {
    this.editing.set(row);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editing.set(null);
  }

  async save(value: { status: 'ACTIVE' | 'INACTIVE'; displayOrder: string | number }) {
    const activeEditing = this.editing();
    if (!activeEditing) return;
    this.submitting.set(true);
    try {
      await this.api.updateGovernorate(activeEditing.id, {
        status: value.status,
        displayOrder: Number(value.displayOrder),
      });
      this.notify.success(this.language.t('common.success'));
      this.closeForm();
      await this.load(this.page());
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.submitting.set(false);
    }
  }

  async exportList() {
    this.exporting.set(true);
    try {
      downloadBlob(await this.api.exportGovernorates(), 'governorates.xlsx');
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.exporting.set(false);
    }
  }
}
