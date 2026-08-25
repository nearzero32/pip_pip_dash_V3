import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Validators } from '@angular/forms';

import { apiErrorMessage } from '../../../core/http/api-error';
import { LanguageService } from '../../../i18n/language.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { FormDialogComponent } from '../../../shared/components/form-dialog/form-dialog';
import { DetailDialogComponent, DetailSection } from '../../../shared/components/detail-dialog/detail-dialog';
import { TableComponent } from '../../../shared/components/table/table';
import { SelectControlComponent, SelectControlOption } from '../../../shared/components/select-control/select-control';
import { FormField } from '../../../shared/models/form-field.interface';
import { PaginationConfig } from '../../../shared/models/pagination.interface';
import { TableColumn } from '../../../shared/models/table-column.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { MediaApiService } from '../../../core/media/media-api.service';
import { City } from '../geography/geography.models';
import { GeographyService } from '../geography/geography.service';
import {
  DriverOperationalStatus,
  ManagedDriver,
} from './driver-management.models';
import { DriverManagementService } from './driver-management.service';
import { ExportButtonComponent } from '../../../shared/components/export-button/export-button';
import { InputControlComponent } from '../../../shared/components/input-control/input-control';
import { PageStatsComponent } from '../../../shared/components/page-stats/page-stats';

type DriverFormMode = 'create' | 'edit' | 'accessCode';

@Component({
  selector: 'app-super-admin-driver-management',
  standalone: true,
  imports: [CommonModule, TableComponent, FormDialogComponent, DetailDialogComponent, SelectControlComponent, TranslatePipe, ExportButtonComponent, InputControlComponent, PageStatsComponent],
  templateUrl: './driver-management.html',
  styleUrl: './driver-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverManagementComponent implements OnInit {
  private drivers = inject(DriverManagementService);
  private geography = inject(GeographyService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);
  private media = inject(MediaApiService);

  data = signal<ManagedDriver[]>([]);
  isLoading = signal(true);
  submitting = signal(false);
  showForm = signal(false);
  formMode = signal<DriverFormMode>('create');
  editing = signal<ManagedDriver | null>(null);
  fields = signal<FormField[]>([]);
  pagination = signal<PaginationConfig | null>(null);
  selectedCityId = signal('');
  search = signal('');
  detailDriver = signal<ManagedDriver | null>(null);
  detailDocuments = signal<Array<{ label: string; url: string }>>([]);
  detailDocumentsLoading = signal(false);
  columns: TableColumn[] = [];

  private readonly limit = 20;
  private page = 1;
  readonly cities = signal<City[]>([]);

  ngOnInit() {
    this.columns = [
      { key: 'driverPhotoUrl', label: this.language.t('drivers.photo'), type: 'image' },
      { key: 'driverName', label: this.language.t('drivers.driverName') },
      { key: 'phone', label: this.language.t('drivers.phone') },
      { key: 'alternatePhone', label: this.language.t('drivers.alternatePhone') },
      { key: 'cityName', label: this.language.t('common.city') },
      { key: 'vehicleType', label: this.language.t('drivers.vehicleType') },
      { key: 'vehicleNumber', label: this.language.t('drivers.vehicleNumber') },
      {
        key: 'operationalStatus',
        label: this.language.t('drivers.operationalStatus'),
        type: 'badge',
        valueMap: {
          PENDING_ACTIVATION: this.language.t('drivers.pendingActivation'),
          ACTIVE: this.language.t('geo.active'),
          SUSPENDED: this.language.t('drivers.suspended'),
          CLOSED: this.language.t('drivers.closed'),
        },
        badgeClassMap: {
          PENDING_ACTIVATION: 'badge-warning',
          ACTIVE: 'badge-success',
          SUSPENDED: 'badge-danger',
          CLOSED: 'badge-default',
        },
      },
    ];
    this.load();
  }

  async load(page = this.page) {
    this.isLoading.set(true);
    try {
      if (!this.cities().length) {
        const cityPage = await this.geography.listCities(1, 100);
        const cities = cityPage.data.filter((city) => city.status !== 'ARCHIVED');
        this.cities.set(cities);
        if (!this.selectedCityId() && cities[0]) this.selectedCityId.set(cities[0].id);
      }
      const result = await this.drivers.list(page, this.limit, this.selectedCityId() || undefined, this.search());
      this.page = result.page;
      this.data.set(await Promise.all(result.data.map((driver) => this.tableDriver(driver))));
      const pages = Math.max(1, Math.ceil(result.total / result.limit));
      this.pagination.set({
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages,
        hasNext: result.page < pages,
        hasPrev: result.page > 1,
      });
    } catch (error) {
      this.data.set([]);
      this.pagination.set(null);
      this.notify.error(apiErrorMessage(error, this.language.t('common.unexpectedError')));
    } finally {
      this.isLoading.set(false);
    }
  }
  private async tableDriver(driver: ManagedDriver): Promise<ManagedDriver> {
    let driverPhotoUrl: string | null = null;
    if (driver.driverPhotoAssetId && driver.cityId) {
      try {
        driverPhotoUrl = await this.media.getDownloadUrl(driver.driverPhotoAssetId, driver.cityId);
      } catch {
        // A missing photo must not prevent the rest of the Driver table from loading.
      }
    }
    return { ...driver, cityName: this.cityName(driver.cityId), driverPhotoUrl };
  }
  async restore(row: ManagedDriver) {
    try { await this.drivers.update(row.accountId, { operationalStatus: 'ACTIVE' }); await this.load(this.page); this.notify.success(this.language.t('common.success')); }
    catch (error) { this.notify.error(apiErrorMessage(error, this.language.t('common.unexpectedError'))); }
  }

  openCreate() {
    if (!this.selectedCityId()) return;
    this.formMode.set('create');
    this.editing.set(null);
    this.fields.set(this.buildFields('create'));
    this.showForm.set(true);
  }

  openEdit(driver: ManagedDriver) {
    if (driver.cityId) this.selectedCityId.set(driver.cityId);
    this.formMode.set('edit');
    this.editing.set(driver);
    this.fields.set(this.buildFields('edit'));
    this.showForm.set(true);
  }

  onCityChanged(cityId: string) {
    this.selectedCityId.set(cityId);
    this.load(1);
  }
  onSearchChanged(search: string) {
    this.search.set(search);
    void this.load(1);
  }

  cityOptions(): readonly SelectControlOption[] {
    return this.cities().map((city) => ({
      value: city.id,
      label: `${city.nameEn} / ${city.nameAr}`,
    }));
  }

  openAccessCode(driver: ManagedDriver) {
    this.formMode.set('accessCode');
    this.editing.set(driver);
    this.fields.set(this.buildFields('accessCode'));
    this.showForm.set(true);
  }
  async openDetails(driver: ManagedDriver) {
    this.detailDriver.set(driver); this.detailDocuments.set([]); this.detailDocumentsLoading.set(true);
    if (!driver.cityId) { this.detailDocumentsLoading.set(false); return; }
    try {
      const docs = await this.drivers.documents(driver.accountId);
      this.detailDocuments.set(await Promise.all(docs.map(async (doc) => ({ label: `${doc.documentType} — ${doc.side}`, url: await this.media.getDownloadUrl(doc.assetId, driver.cityId!) }))));
    } catch (error) { this.notify.error(apiErrorMessage(error, this.language.t('common.unexpectedError'))); } finally { this.detailDocumentsLoading.set(false); }
  }
  detailSections(): DetailSection[] {
    const driver = this.detailDriver();
    if (!driver) return [];
    return [
      { title: this.language.t('details.driver'), items: [{ label: this.language.t('drivers.phone'), value: driver.phone }, { label: this.language.t('drivers.alternatePhone'), value: driver.alternatePhone }, { label: this.language.t('common.city'), value: this.cityName(driver.cityId) }, { label: this.language.t('drivers.operationalStatus'), value: driver.operationalStatus }] },
      { title: this.language.t('details.identityVehicle'), items: [{ label: this.language.t('drivers.driverName'), value: driver.driverName }, { label: this.language.t('drivers.fatherName'), value: driver.fatherName }, { label: this.language.t('drivers.motherName'), value: driver.motherName }, { label: this.language.t('drivers.vehicleType'), value: driver.vehicleType }, { label: this.language.t('drivers.vehicleNumber'), value: driver.vehicleNumber }, { label: this.language.t('drivers.vehicle'), value: driver.vehicleDescription }] },
      { title: this.language.t('details.documents'), items: this.detailDocuments().length ? this.detailDocuments().map((document) => ({ label: document.label, value: this.language.t('common.view'), url: document.url })) : [{ label: this.detailDocumentsLoading() ? this.language.t('common.loading') : this.language.t('common.noData'), value: this.detailDocumentsLoading() ? this.language.t('common.loading') : '—' }] },
    ];
  }

  closeForm() {
    this.showForm.set(false);
    this.editing.set(null);
  }

  formTitle(): string {
    return this.language.t(
      {
        create: 'drivers.add',
        edit: 'drivers.edit',
        accessCode: 'drivers.changeAccessCode',
      }[this.formMode()],
    );
  }

  wizardSteps(): string[] {
    return this.formMode() === 'create' || this.formMode() === 'edit'
      ? [this.language.t('drivers.step.account'), this.language.t('drivers.step.vehicle'), this.language.t('drivers.step.documents')]
      : [];
  }

  async save(value: Record<string, unknown>) {
    this.submitting.set(true);
    try {
      const current = this.editing();
      if (this.formMode() === 'accessCode') {
        if (!current) return;
        await this.drivers.resetAccessCode(current.accountId, String(value['accessCode']));
      } else if (this.formMode() === 'edit') {
        if (!current) return;
        const photo = value['driverPhoto'];
        const driverPhotoAssetId = photo instanceof File
          ? (await this.media.uploadImage(photo, 'DRIVER_PHOTO', this.selectedCityId())).id
          : undefined;
        const documentFiles = [['nationalIdFront', 'nationalIdFrontAssetId'], ['nationalIdBack', 'nationalIdBackAssetId'], ['residenceCardFront', 'residenceCardFrontAssetId'], ['residenceCardBack', 'residenceCardBackAssetId'], ['contract', 'contractAssetId']] as const;
        const documentAssets = await Promise.all(documentFiles.map(async ([field, key]) => value[field] instanceof File ? [key, (await this.media.uploadImage(value[field] as File, 'DRIVER_DOCUMENT', this.selectedCityId())).id] as const : null));
        await this.drivers.update(current.accountId, {
          phone: this.normalizePhone(value['phone']),
          operationalStatus: value['operationalStatus'] as DriverOperationalStatus,
          ...(driverPhotoAssetId ? { driverPhotoAssetId } : {}),
          vehicleDescription: String(value['vehicleDescription'] ?? '') || null,
          driverName: String(value['driverName']), fatherName: String(value['fatherName']), motherName: String(value['motherName']), alternatePhone: this.normalizePhone(value['alternatePhone']),
          vehicleType: String(value['vehicleType'] ?? '') || null, vehicleNumber: String(value['vehicleNumber'] ?? '') || null,
          ...Object.fromEntries(documentAssets.flatMap((asset) => asset ? [asset] : [])),
        });
      } else {
        const photo = value['driverPhoto'];
        const documentFields = ['nationalIdFront', 'nationalIdBack', 'residenceCardFront', 'residenceCardBack', 'contract'] as const;
        if (!(photo instanceof File) || documentFields.some((field) => !(value[field] instanceof File))) return;
        const driverPhotoAssetId = (
          await this.media.uploadImage(photo, 'DRIVER_PHOTO', this.selectedCityId())
        ).id;
        const documents = await Promise.all(documentFields.map((field) => this.media.uploadImage(value[field] as File, 'DRIVER_DOCUMENT', this.selectedCityId())));
        await this.drivers.create({
          phone: this.normalizePhone(value['phone']),
          accessCode: String(value['accessCode']),
          cityId: this.selectedCityId(),
          driverPhotoAssetId,
          driverName: String(value['driverName']), fatherName: String(value['fatherName']), motherName: String(value['motherName']), alternatePhone: this.normalizePhone(value['alternatePhone']),
          nationalIdFrontAssetId: documents[0]!.id, nationalIdBackAssetId: documents[1]!.id,
          residenceCardFrontAssetId: documents[2]!.id, residenceCardBackAssetId: documents[3]!.id, contractAssetId: documents[4]!.id,
          ...(value['vehicleType'] ? { vehicleType: String(value['vehicleType']) } : {}),
          ...(value['vehicleNumber'] ? { vehicleNumber: String(value['vehicleNumber']) } : {}),
          ...(value['vehicleDescription']
            ? { vehicleDescription: String(value['vehicleDescription']) }
            : {}),
        });
      }
      this.notify.success(this.language.t('common.success'));
      this.closeForm();
      await this.load();
    } catch (error) {
      this.notify.error(apiErrorMessage(error, this.language.t('common.unexpectedError')));
    } finally {
      this.submitting.set(false);
    }
  }

  private cityName(cityId: string | null): string {
    if (!cityId) return '—';
    const city = this.cities().find((item) => item.id === cityId);
    if (!city) return cityId;
    return this.language.lang() === 'ar'
      ? city.nameAr || city.nameEn
      : city.nameEn || city.nameAr;
  }

  private normalizePhone(value: unknown): string {
    const compact = String(value ?? '').replace(/[\s()-]/g, '');
    return /^0\d{9,10}$/.test(compact) ? `+964${compact.slice(1)}` : compact;
  }

  private buildFields(mode: DriverFormMode): FormField[] {
    if (mode === 'accessCode') {
      return [
        {
          name: 'accessCode',
          label: this.language.t('drivers.newAccessCode'),
          type: 'password',
          required: true,
          width: 'full',
          validators: [Validators.pattern(/^[0-9]{6,12}$/)],
          hint: this.language.t('drivers.accessCodeHint'),
          allowGeneratePassword: false,
        },
      ];
    }

    const fields: FormField[] = [
      {
        name: 'phone',
        label: this.language.t('drivers.phone'),
        type: 'text',
        required: true,
        step: 0,
      },
      { name: 'driverName', label: this.language.t('drivers.driverName'), type: 'text', required: mode === 'create', step: 0 },
      { name: 'fatherName', label: this.language.t('drivers.fatherName'), type: 'text', required: mode === 'create', step: 0 },
      { name: 'motherName', label: this.language.t('drivers.motherName'), type: 'text', required: mode === 'create', step: 0 },
      { name: 'alternatePhone', label: this.language.t('drivers.alternatePhone'), type: 'text', required: mode === 'create', step: 0 },
      {
        name: 'driverPhoto',
        label: this.language.t('drivers.photo'),
        type: 'file',
        required: mode === 'create',
        width: 'full',
        step: 1,
      },
      {
        name: 'vehicleDescription',
        label: this.language.t('drivers.vehicle'),
        type: 'textarea',
        width: 'full',
        step: 1,
      },
      { name: 'vehicleType', label: this.language.t('drivers.vehicleType'), type: 'text', step: 1 },
      { name: 'vehicleNumber', label: this.language.t('drivers.vehicleNumber'), type: 'text', step: 1 },
    ];
    if (mode === 'create') {
      fields.push(
        { name: 'nationalIdFront', label: this.language.t('drivers.nationalIdFront'), type: 'file', required: true, width: 'full', step: 2 },
        { name: 'nationalIdBack', label: this.language.t('drivers.nationalIdBack'), type: 'file', required: true, width: 'full', step: 2 },
        { name: 'residenceCardFront', label: this.language.t('drivers.residenceCardFront'), type: 'file', required: true, width: 'full', step: 2 },
        { name: 'residenceCardBack', label: this.language.t('drivers.residenceCardBack'), type: 'file', required: true, width: 'full', step: 2 },
        { name: 'contract', label: this.language.t('drivers.contract'), type: 'file', required: true, width: 'full', step: 2 },
      );
      fields.splice(1, 0, {
        name: 'accessCode',
        label: this.language.t('drivers.accessCode'),
        type: 'password',
        required: true,
        validators: [Validators.pattern(/^[0-9]{6,12}$/)],
        hint: this.language.t('drivers.accessCodeHint'),
        allowGeneratePassword: false,
        step: 0,
      });
    } else {
      fields.push(
        { name: 'nationalIdFront', label: this.language.t('drivers.replaceNationalIdFront'), type: 'file', width: 'full', step: 2 }, { name: 'nationalIdBack', label: this.language.t('drivers.replaceNationalIdBack'), type: 'file', width: 'full', step: 2 },
        { name: 'residenceCardFront', label: this.language.t('drivers.replaceResidenceCardFront'), type: 'file', width: 'full', step: 2 }, { name: 'residenceCardBack', label: this.language.t('drivers.replaceResidenceCardBack'), type: 'file', width: 'full', step: 2 }, { name: 'contract', label: this.language.t('drivers.replaceContract'), type: 'file', width: 'full', step: 2 },
      );
      fields.push({
        name: 'operationalStatus',
        label: this.language.t('drivers.operationalStatus'),
        type: 'select',
        required: true,
        options: [
          { value: 'PENDING_ACTIVATION', label: this.language.t('drivers.pendingActivation') },
          { value: 'ACTIVE', label: this.language.t('geo.active') },
          { value: 'SUSPENDED', label: this.language.t('drivers.suspended') },
          { value: 'CLOSED', label: this.language.t('drivers.closed') },
        ],
        step: 0,
      });
    }
    return fields;
  }
}
