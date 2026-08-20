import { Component, OnInit, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Validators } from '@angular/forms';
import { TableComponent } from '../../../shared/components/table/table';
import { FormDialogComponent } from '../../../shared/components/form-dialog/form-dialog';
import { FormField } from '../../../shared/models/form-field.interface';
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

type CityAdminFormMode = 'create' | 'edit' | 'password';

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
  formMode = signal<CityAdminFormMode>('create');
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
      { key: 'cityName', label: this.language.t('staff.cityId') },
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

  private buildFields(mode: CityAdminFormMode): FormField[] {
    if (mode === 'password') {
      return [
        {
          name: 'password',
          label: this.language.t('staff.newPassword'),
          type: 'password',
          required: true,
          width: 'full',
          validators: [Validators.minLength(12)],
          hint: this.language.t('auth.passwordHint'),
        },
      ];
    }
    const cityOptions = this.cities.map((c) => ({
      value: c.id,
      label: `${c.nameEn} / ${c.nameAr}`,
    }));
    const fields: FormField[] = [];
    if (mode === 'create') {
      fields.push(
        { name: 'email', label: this.language.t('auth.email'), type: 'text', required: true },
        {
          name: 'password',
          label: this.language.t('auth.password'),
          type: 'password',
          required: true,
          validators: [Validators.minLength(12)],
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
    if (mode === 'edit') {
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
      const [admins] = await Promise.all([
        this.staff.listAdmins(),
        this.ensureCitiesLoaded().catch(() => undefined),
      ]);
      this.data.set(
        admins.map((admin) => ({
          ...admin,
          cityName: this.cityName(admin.cityId),
        })),
      );
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
      this.data.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private cityName(cityId: string): string {
    const city = this.cities.find((item) => item.id === cityId);
    if (!city) return cityId;
    return this.language.lang() === 'ar'
      ? city.nameAr || city.nameEn
      : city.nameEn || city.nameAr;
  }

  async openCreate() {
    if (this.isLoadingCities()) return;
    this.formMode.set('create');
    this.editing.set(null);
    try {
      await this.ensureCitiesLoaded();
      this.fields.set(this.buildFields('create'));
      this.showForm.set(true);
    } catch (err) {
      // Non-blocking error handled in fetchCities
    }
  }

  async onEdit(row: CityAdmin) {
    if (this.isLoadingCities()) return;
    this.formMode.set('edit');
    this.editing.set(row);
    try {
      await this.ensureCitiesLoaded();
      this.fields.set(this.buildFields('edit'));
      this.showForm.set(true);
    } catch (err) {
      // Non-blocking error handled in fetchCities
    }
  }

  onPassword(row: CityAdmin) {
    this.formMode.set('password');
    this.editing.set(row);
    this.fields.set(this.buildFields('password'));
    this.showForm.set(true);
  }

  formTitle(): string {
    return this.language.t(
      {
        create: 'staff.addAdmin',
        edit: 'staff.editAdmin',
        password: 'staff.changePassword',
      }[this.formMode()],
    );
  }

  closeForm() {
    this.showForm.set(false);
    this.editing.set(null);
    this.formMode.set('create');
  }

  async save(value: Record<string, string>) {
    this.submitting.set(true);
    try {
      const currentEditing = this.editing();
      const mode = this.formMode();
      if (mode === 'password') {
        if (!currentEditing) return;
        await this.staff.resetPassword(currentEditing.accountId, value['password']);
      } else if (mode === 'edit') {
        if (!currentEditing) return;
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
      this.closeForm();
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
