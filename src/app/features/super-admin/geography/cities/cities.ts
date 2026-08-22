import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableComponent } from '../../../../shared/components/table/table';
import { FormDialogComponent } from '../../../../shared/components/form-dialog/form-dialog';
import { FormField } from '../../../../shared/models/form-field.interface';
import { ConfirmationDialogComponent } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { ExportButtonComponent } from '../../../../shared/components/export-button/export-button';
import { TableColumn } from '../../../../shared/models/table-column.interface';
import { PaginationConfig } from '../../../../shared/models/pagination.interface';
import { City, CityBoundary, Governorate } from '../geography.models';
import { GeographyService } from '../geography.service';
import { LanguageService } from '../../../../i18n/language.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { downloadBlob } from '../../../../core/utils/download';

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
  readonly citySteps = ['City details', 'Location', 'Boundary'];

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
        valueMap: {
          DRAFT: this.language.t('status.DRAFT'),
          ACTIVE: this.language.t('status.ACTIVE'),
          SUSPENDED: this.language.t('status.SUSPENDED'),
          ARCHIVED: this.language.t('status.ARCHIVED'),
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
        width: 'full',
        options: this.governorates.map((g) => ({ value: g.id, label: `${g.nameEn} / ${g.nameAr}` })),
        step: 0,
      },
      { name: 'nameAr', label: this.language.t('geo.nameAr'), type: 'text', required: true, step: 0 },
      { name: 'nameEn', label: this.language.t('geo.nameEn'), type: 'text', required: true, step: 0 },
      {
        name: 'locationMap',
        label: this.language.t('geo.mapLabel'),
        type: 'map',
        width: 'full',
        latitudeField: 'latitude',
        longitudeField: 'longitude',
        step: 1,
      },
      { name: 'latitude', label: this.language.t('geo.latitude'), type: 'number', required: true, step: 1 },
      { name: 'longitude', label: this.language.t('geo.longitude'), type: 'number', required: true, step: 1 },
      { name: 'displayOrder', label: this.language.t('geo.displayOrder'), type: 'number', required: true, width: 'full', step: 0 },
      { name: 'boundary', label: 'City boundary', type: 'boundary-map', required: true, width: 'full', step: 2, hint: 'Draw the service area directly on the map.' },
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
      const detail = await this.api.getCity(row.id);
      this.editing.set(detail);
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
    const boundary = value['boundary'] as unknown as CityBoundary;
    if (!boundary) { this.notify.error('Draw a city boundary first.'); this.submitting.set(false); return; }
    const body = {
      governorateId: value['governorateId'],
      translations: [
        { locale: 'ar' as const, name: value['nameAr'].trim() },
        { locale: 'en' as const, name: value['nameEn'].trim() },
      ],
      latitude: Number(value['latitude']),
      longitude: Number(value['longitude']),
      displayOrder: Number(value['displayOrder']),
      boundary,
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

  statusLabel(status: City['status']): string {
    return this.language.t(`status.${status}`);
  }

  statusBadgeClass(status: City['status']): string {
    const map: Record<City['status'], string> = {
      DRAFT: 'badge-default',
      ACTIVE: 'badge-success',
      SUSPENDED: 'badge-warning',
      ARCHIVED: 'badge-danger',
    };
    return map[status];
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(this.language.lang() === 'ar' ? 'ar' : 'en-GB');
  }
}
