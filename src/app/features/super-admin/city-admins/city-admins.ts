import { Component, OnInit, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableComponent } from '../../../shared/components/table/table';
import { FormDialogComponent, FormField } from '../../../shared/components/form-dialog/form-dialog';
import { ExportButtonComponent } from '../../../shared/components/export-button/export-button';
import { TableColumn } from '../../../shared/models/table-column.interface';
import { CityAdmin } from './city-admin.models';
import { City } from '../geography/geography.models';
import { GeographyService } from '../geography/geography.service';
import { CityAdminsService } from './city-admins.service';
import { LanguageService } from '../../../i18n/language.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { apiErrorMessage } from '../../../core/http/api-error';
import { downloadBlob } from '../../../core/utils/download';

@Component({
  selector: 'app-city-admins',
  standalone: true,
  imports: [CommonModule, TableComponent, FormDialogComponent, ExportButtonComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './city-admins.html',
})
export class CityAdminsComponent implements OnInit {
  private staff = inject(CityAdminsService);
  private geography = inject(GeographyService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  data = signal<CityAdmin[]>([]);
  isLoading = signal<boolean>(true);
  isLoadingCities = signal<boolean>(false);
  exporting = signal<boolean>(false);
  submitting = signal<boolean>(false);
  showForm = signal<boolean>(false);
  editing = signal<CityAdmin | null>(null);
  columns: TableColumn[] = [];
  fields = signal<FormField[]>([]);

  private cities: City[] = [];
  private citiesPromise: Promise<void> | null = null;

  ngOnInit() {
    this.columns = [
      { key: 'email', label: this.language.t('auth.email') },
      { key: 'displayName', label: this.language.t('staff.displayName') },
      {
        key: 'status',
        label: this.language.t('geo.status'),
        type: 'badge',
        badgeClassMap: { ACTIVE: 'badge-success', DISABLED: 'badge-danger', INVITED: 'badge-warning' },
      },
      { key: 'cityId', label: this.language.t('staff.cityId') },
    ];
    this.load();
  }

  private async ensureCitiesLoaded(): Promise<void> {
    if (this.cities.length > 0) {
      return;
    }
    if (this.citiesPromise) {
      await this.citiesPromise;
      return;
    }
    this.isLoadingCities.set(true);
    try {
      this.citiesPromise = this.fetchCities();
      await this.citiesPromise;
    } finally {
      this.isLoadingCities.set(false);
    }
  }

  private async fetchCities(): Promise<void> {
    try {
      const cityPage = await this.geography.listCities(1, 100);
      this.cities = cityPage.data;
    } catch (err) {
      this.citiesPromise = null;
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
      throw err;
    }
  }

  private buildFields(editing: boolean): FormField[] {
    const cityOptions = this.cities.map((c) => ({
      value: c.id,
      label: `${c.nameEn} / ${c.nameAr}`,
    }));
    const fields: FormField[] = [];
    if (!editing) {
      fields.push(
        { name: 'email', label: this.language.t('auth.email'), type: 'text', required: true },
        {
          name: 'password',
          label: this.language.t('auth.password'),
          type: 'password',
          required: true,
          hint: this.language.t('auth.passwordHint'),
        }
      );
    }
    fields.push(
      { name: 'displayName', label: this.language.t('staff.displayName'), type: 'text' },
      {
        name: 'cityId',
        label: this.language.t('nav.cities'),
        type: 'select',
        required: true,
        options: cityOptions,
      }
    );
    if (editing) {
      fields.push({
        name: 'status',
        label: this.language.t('geo.status'),
        type: 'select',
        options: [
          { value: 'ACTIVE', label: this.language.t('geo.active') },
          { value: 'DISABLED', label: this.language.t('geo.disabled') },
        ],
      });
    }
    return fields;
  }

  async load() {
    this.isLoading.set(true);
    try {
      const admins = await this.staff.listAdmins();
      this.data.set(admins);
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
      this.data.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async openCreate() {
    if (this.isLoadingCities()) return;
    this.editing.set(null);
    try {
      await this.ensureCitiesLoaded();
      this.fields.set(this.buildFields(false));
      this.showForm.set(true);
    } catch (err) {
      // Non-blocking error handled in fetchCities
    }
  }

  async onEdit(row: CityAdmin) {
    if (this.isLoadingCities()) return;
    this.editing.set(row);
    try {
      await this.ensureCitiesLoaded();
      this.fields.set(this.buildFields(true));
      this.showForm.set(true);
    } catch (err) {
      // Non-blocking error handled in fetchCities
    }
  }

  closeForm() {
    this.showForm.set(false);
  }

  async save(value: Record<string, string>) {
    this.submitting.set(true);
    try {
      const currentEditing = this.editing();
      if (currentEditing) {
        const body: { displayName?: string; cityId?: string; status?: 'ACTIVE' | 'DISABLED' } = {};
        if (value['displayName']) body.displayName = value['displayName'];
        if (value['cityId']) body.cityId = value['cityId'];
        if (value['status'] === 'ACTIVE' || value['status'] === 'DISABLED') body.status = value['status'];
        await this.staff.updateAdmin(currentEditing.accountId, body);
      } else {
        await this.staff.createAdmin({
          email: value['email'],
          password: value['password'],
          cityId: value['cityId'],
          ...(value['displayName'] ? { displayName: value['displayName'] } : {}),
        });
      }
      this.notify.success(this.language.t('common.success'));
      this.showForm.set(false);
      await this.load();
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.submitting.set(false);
    }
  }

  async exportList() {
    this.exporting.set(true);
    try {
      const blob = await this.staff.exportAdmins();
      downloadBlob(blob, 'city-admins.xlsx');
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.exporting.set(false);
    }
  }
}
