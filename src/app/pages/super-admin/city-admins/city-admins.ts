import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableComponent } from '../../../components/table/table';
import { FormDialogComponent, FormField } from '../../../components/form-dialog/form-dialog';
import { ExportButtonComponent } from '../../../components/buttons/export-button/export-button';
import { TableColumn } from '../../../interfaces/table-column.interface';
import { CityAdmin } from '../../../interfaces/super-admin/staff.interface';
import { City } from '../../../interfaces/super-admin/geography.interface';
import { StaffService } from '../../../services/super-admin/staff.service';
import { GeographyService } from '../../../services/super-admin/geography.service';
import { LanguageService } from '../../../services/language.service';
import { NotificationService } from '../../../services/notification.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { apiErrorMessage } from '../../../core/api-error';
import { downloadBlob } from '../../../core/download';

@Component({
  selector: 'app-city-admins',
  standalone: true,
  imports: [CommonModule, TableComponent, FormDialogComponent, ExportButtonComponent, TranslatePipe],
  templateUrl: './city-admins.html',
})
export class CityAdminsComponent implements OnInit {
  private staff = inject(StaffService);
  private geography = inject(GeographyService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  data: CityAdmin[] = [];
  cities: City[] = [];
  isLoading = true;
  exporting = false;
  submitting = false;
  showForm = false;
  editing: CityAdmin | null = null;
  columns: TableColumn[] = [];
  fields: FormField[] = [];

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
    this.loadCities();
  }

  async loadCities() {
    try {
      const cityPage = await this.geography.listCities(1, 100);
      this.cities = cityPage.data;
    } catch (err) {
      // Non-blocking
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
    this.isLoading = true;
    try {
      this.data = await this.staff.listAdmins();
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.isLoading = false;
    }
  }

  openCreate() {
    this.editing = null;
    this.fields = this.buildFields(false);
    this.showForm = true;
  }

  onEdit(row: CityAdmin) {
    this.editing = row;
    this.fields = this.buildFields(true);
    this.showForm = true;
  }

  async save(value: Record<string, string>) {
    this.submitting = true;
    try {
      if (this.editing) {
        const body: { displayName?: string; cityId?: string; status?: 'ACTIVE' | 'DISABLED' } = {};
        if (value['displayName']) body.displayName = value['displayName'];
        if (value['cityId']) body.cityId = value['cityId'];
        if (value['status'] === 'ACTIVE' || value['status'] === 'DISABLED') body.status = value['status'];
        await this.staff.updateAdmin(this.editing.accountId, body);
      } else {
        await this.staff.createAdmin({
          email: value['email'],
          password: value['password'],
          cityId: value['cityId'],
          ...(value['displayName'] ? { displayName: value['displayName'] } : {}),
        });
      }
      this.notify.success(this.language.t('common.success'));
      this.showForm = false;
      await this.load();
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.submitting = false;
    }
  }

  async exportList() {
    this.exporting = true;
    try {
      downloadBlob(await this.staff.exportAdmins(), 'city-admins.xlsx');
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.exporting = false;
    }
  }
}
