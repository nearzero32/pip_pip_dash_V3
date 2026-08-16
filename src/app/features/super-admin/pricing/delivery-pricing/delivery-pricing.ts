import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableComponent } from '../../../../shared/components/table/table';
import { FormDialogComponent, FormField } from '../../../../shared/components/form-dialog/form-dialog';
import { ConfirmationDialogComponent } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { TableColumn } from '../../../../shared/models/table-column.interface';
import { City } from '../../geography/geography.models';
import { GeographyService } from '../../geography/geography.service';
import { DeliveryPricingVersion } from '../pricing.models';
import { PricingService } from '../pricing.service';
import { LanguageService } from '../../../../i18n/language.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { apiErrorMessage } from '../../../../core/http/api-error';


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
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delivery-pricing.html',
})
export class DeliveryPricingComponent implements OnInit {
  private geography = inject(GeographyService);
  private pricing = inject(PricingService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  cities = signal<City[]>([]);
  cityId = signal('');
  data = signal<(DeliveryPricingVersion & { _id: string })[]>([]);
  isLoading = signal(true);
  showForm = signal(false);
  submitting = signal(false);
  activateId = signal<string | null>(null);
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
      this.cities.set(page.data);
      const activeCities = this.cities();
      if (activeCities[0]) {
        this.cityId.set(activeCities[0].id);
        await this.load();
      } else {
        this.isLoading.set(false);
      }
    } catch (err) {
      this.isLoading.set(false);
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }

  onCityChange(id: string) {
    this.cityId.set(id);
    this.data.set([]);
    this.load();
  }

  async load() {
    const currentCityId = this.cityId();
    if (!currentCityId) return;
    this.isLoading.set(true);
    try {
      const rows = await this.pricing.listDeliveryVersions(currentCityId);
      if (this.cityId() === currentCityId) {
        this.data.set(rows.map((row) => ({ ...row, _id: row.id })));
      }
    } catch (err) {
      if (this.cityId() !== currentCityId) {
        return;
      }
      this.data.set([]);
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      if (this.cityId() === currentCityId) {
        this.isLoading.set(false);
      }
    }
  }

  async save(value: Record<string, string>) {
    this.submitting.set(true);
    const activeCityId = this.cityId();
    try {
      const max = value['maximumDeliveryDistanceMeters'];
      await this.pricing.createDeliveryVersion(activeCityId, {
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
      this.showForm.set(false);
      await this.load();
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.submitting.set(false);
    }
  }

  onEdit(row: DeliveryPricingVersion & { _id: string }) {
    if (row.status !== 'DRAFT') {
      this.notify.info(this.language.t('pricing.immutable'));
      return;
    }
    this.activateId.set(row.id);
  }

  async confirmActivate() {
    const activeId = this.activateId();
    const activeCityId = this.cityId();
    if (!activeId) return;
    try {
      await this.pricing.activateDeliveryVersion(activeCityId, activeId);
      this.notify.success(this.language.t('common.success'));
      this.activateId.set(null);
      await this.load();
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }
}
