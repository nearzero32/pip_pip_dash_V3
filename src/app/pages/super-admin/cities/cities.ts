import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableComponent } from '../../../components/table/table';
import { FormDialogComponent, FormField } from '../../../components/form-dialog/form-dialog';
import { ConfirmationDialogComponent } from '../../../components/confirmation-dialog/confirmation-dialog';
import { ExportButtonComponent } from '../../../components/buttons/export-button/export-button';
import { TableColumn } from '../../../interfaces/table-column.interface';
import { PaginationConfig } from '../../../interfaces/pagination.interface';
import { City, Governorate } from '../../../interfaces/super-admin/geography.interface';
import { GeographyService } from '../../../services/super-admin/geography.service';
import { LanguageService } from '../../../services/language.service';
import { NotificationService } from '../../../services/notification.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { apiErrorMessage } from '../../../core/api-error';
import { downloadBlob } from '../../../core/download';

@Component({
  selector: 'app-cities',
  standalone: true,
  imports: [
    CommonModule,
    TableComponent,
    FormDialogComponent,
    ConfirmationDialogComponent,
    ExportButtonComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cities.html',
})
export class CitiesComponent implements OnInit {
  private api = inject(GeographyService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  data = signal<City[]>([]);
  private governorates: Governorate[] = [];
  private governoratesPromise: Promise<void> | null = null;
  isLoadingGovernorates = signal<boolean>(false);

  isLoading = signal(true);
  exporting = signal(false);
  submitting = signal(false);
  showForm = signal(false);
  editing = signal<City | null>(null);
  selected = signal<City | null>(null);
  confirmAction = signal<'activate' | 'suspend' | 'archive' | null>(null);
  pagination = signal<PaginationConfig | null>(null);
  page = signal(1);
  columns: TableColumn[] = [];
  fields = signal<FormField[]>([]);

  ngOnInit() {
    this.columns = [
      { key: 'nameAr', label: this.language.t('geo.nameAr') },
      { key: 'nameEn', label: this.language.t('geo.nameEn') },
      { key: 'governorate.nameEn', label: this.language.t('nav.governorates') },
      {
        key: 'status',
        label: this.language.t('geo.status'),
        type: 'badge',
        badgeClassMap: {
          DRAFT: 'badge-default',
          ACTIVE: 'badge-success',
          SUSPENDED: 'badge-warning',
          ARCHIVED: 'badge-danger',
        },
      },
    ];
    this.load();
  }

  async ensureGovernoratesLoaded(): Promise<void> {
    if (this.governorates.length > 0) return;
    if (this.governoratesPromise) return this.governoratesPromise;

    this.isLoadingGovernorates.set(true);
    this.governoratesPromise = (async () => {
      try {
        const govs = await this.api.listGovernorates(1, 100);
        this.governorates = govs.data;
      } catch (err) {
        this.governoratesPromise = null; // Let retry succeed on next click
        this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
        throw err;
      } finally {
        this.isLoadingGovernorates.set(false);
      }
    })();

    return this.governoratesPromise;
  }

  private buildFields(): FormField[] {
    return [
      {
        name: 'governorateId',
        label: this.language.t('nav.governorates'),
        type: 'select',
        required: true,
        options: this.governorates.map((g) => ({ value: g.id, label: `${g.nameEn} / ${g.nameAr}` })),
      },
      { name: 'nameAr', label: this.language.t('geo.nameAr'), type: 'text', required: true },
      { name: 'nameEn', label: this.language.t('geo.nameEn'), type: 'text', required: true },
      { name: 'latitude', label: this.language.t('geo.latitude'), type: 'number', required: true },
      { name: 'longitude', label: this.language.t('geo.longitude'), type: 'number', required: true },
      { name: 'displayOrder', label: this.language.t('geo.displayOrder'), type: 'number', required: true },
    ];
  }

  async load(page = 1) {
    this.isLoading.set(true);
    try {
      const result = await this.api.listCities(page, 20);
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

  async openCreate() {
    this.editing.set(null);
    try {
      await this.ensureGovernoratesLoaded();
      this.fields.set(this.buildFields());
      this.showForm.set(true);
    } catch (err) {
      // Handled inside ensureGovernoratesLoaded()
    }
  }

  async onEdit(row: City) {
    this.editing.set(row);
    try {
      await this.ensureGovernoratesLoaded();
      this.fields.set(this.buildFields());
      this.showForm.set(true);
    } catch (err) {
      // Handled inside ensureGovernoratesLoaded()
    }
  }

  onView(row: City) {
    this.selected.set(row);
  }

  closeForm() {
    this.showForm.set(false);
    this.editing.set(null);
  }

  async save(value: Record<string, string>) {
    this.submitting.set(true);
    const body = {
      governorateId: value['governorateId'],
      nameAr: value['nameAr'],
      nameEn: value['nameEn'],
      latitude: Number(value['latitude']),
      longitude: Number(value['longitude']),
      displayOrder: Number(value['displayOrder']),
    };
    try {
      const activeEditing = this.editing();
      if (activeEditing) {
        await this.api.updateCity(activeEditing.id, body);
      } else {
        await this.api.createCity(body);
      }
      this.notify.success(this.language.t('common.success'));
      this.closeForm();
      await this.load(this.page());
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.submitting.set(false);
    }
  }

  async runTransition() {
    const city = this.selected();
    const action = this.confirmAction();
    if (!city || !action) return;
    try {
      const updated = await this.api.transitionCity(city.id, action);
      this.selected.set(updated);
      this.confirmAction.set(null);
      this.notify.success(this.language.t('common.success'));
      await this.load(this.page());
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }

  async exportList() {
    this.exporting.set(true);
    try {
      downloadBlob(await this.api.exportCities(), 'cities.xlsx');
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.exporting.set(false);
    }
  }
}
