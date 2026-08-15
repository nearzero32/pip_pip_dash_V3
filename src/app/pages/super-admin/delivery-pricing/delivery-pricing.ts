import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableComponent } from '../../../components/table/table';
import { FormDialogComponent, FormField } from '../../../components/form-dialog/form-dialog';
import { ConfirmationDialogComponent } from '../../../components/confirmation-dialog/confirmation-dialog';
import { TableColumn } from '../../../interfaces/table-column.interface';
import { City } from '../../../interfaces/super-admin/geography.interface';
import { DeliveryPricingVersion } from '../../../interfaces/super-admin/pricing.interface';
import { GeographyService } from '../../../services/super-admin/geography.service';
import { PricingService } from '../../../services/super-admin/pricing.service';
import { LanguageService } from '../../../services/language.service';
import { NotificationService } from '../../../services/notification.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { apiErrorMessage } from '../../../core/api-error';

@Component({
  selector: 'app-delivery-pricing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableComponent,
    FormDialogComponent,
    ConfirmationDialogComponent,
    TranslatePipe,
  ],
  templateUrl: './delivery-pricing.html',
})
export class DeliveryPricingComponent implements OnInit {
  private geography = inject(GeographyService);
  private pricing = inject(PricingService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  cities: City[] = [];
  cityId = '';
  data: (DeliveryPricingVersion & { _id: string })[] = [];
  isLoading = true;
  showForm = false;
  submitting = false;
  activateId: string | null = null;
  columns: TableColumn[] = [];
  fields: FormField[] = [];

  ngOnInit() {
    this.columns = [
      { key: 'version', label: this.language.t('pricing.version') },
      {
        key: 'status',
        label: this.language.t('geo.status'),
        type: 'badge',
        badgeClassMap: { DRAFT: 'badge-warning', ACTIVE: 'badge-success', INACTIVE: 'badge-default' },
      },
      { key: 'baseFee', label: this.language.t('pricing.baseFee') },
      { key: 'pricePerKm', label: this.language.t('pricing.pricePerKm') },
    ];
    this.fields = [
      { name: 'baseFee', label: this.language.t('pricing.baseFee'), type: 'number', required: true, defaultValue: 1000 },
      { name: 'includedDistanceMeters', label: this.language.t('pricing.includedDistance'), type: 'number', required: true, defaultValue: 1000 },
      { name: 'pricePerKm', label: this.language.t('pricing.pricePerKm'), type: 'number', required: true, defaultValue: 500 },
      { name: 'roundingStep', label: this.language.t('pricing.roundingStep'), type: 'number', required: true, defaultValue: 250 },
      { name: 'maximumDeliveryDistanceMeters', label: this.language.t('pricing.maxDistance'), type: 'number' },
      { name: 'routingFallbackEnabled', label: this.language.t('pricing.fallback'), type: 'select', required: true, options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], defaultValue: 'false' },
      { name: 'fallbackOnNoRoute', label: this.language.t('pricing.fallbackNoRoute'), type: 'select', required: true, options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], defaultValue: 'false' },
      { name: 'fallbackOnProviderFailure', label: this.language.t('pricing.fallbackProvider'), type: 'select', required: true, options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], defaultValue: 'false' },
      { name: 'fallbackExtraDistanceMeters', label: this.language.t('pricing.fallbackExtra'), type: 'number', required: true, defaultValue: 0 },
    ];
    this.loadCities();
  }

  async loadCities() {
    try {
      const page = await this.geography.listCities(1, 100);
      this.cities = page.data;
      if (this.cities[0]) {
        this.cityId = this.cities[0].id;
        await this.load();
      } else {
        this.isLoading = false;
      }
    } catch (err) {
      this.isLoading = false;
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }

  async load() {
    if (!this.cityId) return;
    this.isLoading = true;
    try {
      const rows = await this.pricing.listDeliveryVersions(this.cityId);
      this.data = rows.map((row) => ({ ...row, _id: row.id }));
    } catch (err) {
      this.data = [];
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.isLoading = false;
    }
  }

  async save(value: Record<string, string>) {
    this.submitting = true;
    try {
      const max = value['maximumDeliveryDistanceMeters'];
      await this.pricing.createDeliveryVersion(this.cityId, {
        baseFee: Number(value['baseFee']),
        includedDistanceMeters: Number(value['includedDistanceMeters']),
        pricePerKm: Number(value['pricePerKm']),
        roundingStep: Number(value['roundingStep']),
        maximumDeliveryDistanceMeters: max === '' || max == null ? null : Number(max),
        routingFallbackEnabled: value['routingFallbackEnabled'] === 'true',
        fallbackOnNoRoute: value['fallbackOnNoRoute'] === 'true',
        fallbackOnProviderFailure: value['fallbackOnProviderFailure'] === 'true',
        fallbackExtraDistanceMeters: Number(value['fallbackExtraDistanceMeters']),
      });
      this.notify.success(this.language.t('common.success'));
      this.showForm = false;
      await this.load();
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.submitting = false;
    }
  }

  onEdit(row: DeliveryPricingVersion & { _id: string }) {
    if (row.status !== 'DRAFT') {
      this.notify.info(this.language.t('pricing.immutable'));
      return;
    }
    this.activateId = row.id;
  }

  async confirmActivate() {
    if (!this.activateId) return;
    try {
      await this.pricing.activateDeliveryVersion(this.cityId, this.activateId);
      this.notify.success(this.language.t('common.success'));
      this.activateId = null;
      await this.load();
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }
}
