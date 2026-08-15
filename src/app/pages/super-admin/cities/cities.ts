import { Component, OnInit, inject, signal } from '@angular/core';
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
  templateUrl: './cities.html',
})
export class CitiesComponent implements OnInit {
  private api = inject(GeographyService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  data: City[] = [];
  governorates: Governorate[] = [];
  isLoading = true;
  exporting = false;
  submitting = false;
  showForm = false;
  editing: City | null = null;
  selected = signal<City | null>(null);
  confirmAction = signal<'activate' | 'suspend' | 'archive' | null>(null);
  pagination: PaginationConfig | null = null;
  page = 1;
  columns: TableColumn[] = [];
  fields: FormField[] = [];

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
    this.loadGovernorates();
  }

  async loadGovernorates() {
    try {
      const govs = await this.api.listGovernorates(1, 100);
      this.governorates = govs.data;
      this.fields = this.buildFields();
    } catch (err) {
      // Non-blocking error
    }
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
    this.isLoading = true;
    try {
      const result = await this.api.listCities(page, 20);
      this.data = result.data;
      this.page = result.page;
      const pages = Math.max(1, Math.ceil(result.total / result.limit));
      this.pagination = {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages,
        hasNext: result.page < pages,
        hasPrev: result.page > 1,
      };
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.isLoading = false;
    }
  }

  openCreate() {
    this.editing = null;
    this.fields = this.buildFields();
    this.showForm = true;
  }

  onEdit(row: City) {
    this.editing = row;
    this.fields = this.buildFields();
    this.showForm = true;
  }

  onView(row: City) {
    this.selected.set(row);
  }

  async save(value: Record<string, string>) {
    this.submitting = true;
    const body = {
      governorateId: value['governorateId'],
      nameAr: value['nameAr'],
      nameEn: value['nameEn'],
      latitude: Number(value['latitude']),
      longitude: Number(value['longitude']),
      displayOrder: Number(value['displayOrder']),
    };
    try {
      if (this.editing) await this.api.updateCity(this.editing.id, body);
      else await this.api.createCity(body);
      this.notify.success(this.language.t('common.success'));
      this.showForm = false;
      await this.load(this.page);
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.submitting = false;
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
      await this.load(this.page);
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }

  async exportList() {
    this.exporting = true;
    try {
      downloadBlob(await this.api.exportCities(), 'cities.xlsx');
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.exporting = false;
    }
  }
}
