import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormDialogComponent, FormField } from '../../../components/form-dialog/form-dialog';
import { City } from '../../../interfaces/super-admin/geography.interface';
import { DriverPricing } from '../../../interfaces/super-admin/pricing.interface';
import { GeographyService } from '../../../services/super-admin/geography.service';
import { PricingService } from '../../../services/super-admin/pricing.service';
import { LanguageService } from '../../../services/language.service';
import { NotificationService } from '../../../services/notification.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { apiErrorMessage } from '../../../core/api-error';
import { ApiErrorBody } from '../../../interfaces/auth.interface';

@Component({
  selector: 'app-driver-pricing',
  standalone: true,
  imports: [CommonModule, FormsModule, FormDialogComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './driver-pricing.html',
})
export class DriverPricingComponent implements OnInit {
  private geography = inject(GeographyService);
  private pricing = inject(PricingService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  cities = signal<City[]>([]);
  cityId = signal('');
  current = signal<DriverPricing | null>(null);
  missing = signal(false);
  loading = signal(true);
  showForm = signal(false);
  submitting = signal(false);
  fields: FormField[] = [];

  ngOnInit() {
    this.fields = [
      { name: 'pricingBase', label: this.language.t('pricing.driverBase'), type: 'number', required: true },
      { name: 'roundingUnit', label: this.language.t('pricing.roundingUnit'), type: 'number', required: true },
      {
        name: 'pricingStages',
        label: this.language.t('pricing.stages'),
        type: 'textarea',
        required: true,
        hint: this.language.t('pricing.stagesHint'),
        defaultValue: '[{"afterSeconds":0,"increasePercentage":0}]',
      },
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
        this.loading.set(false);
      }
    } catch (err) {
      this.loading.set(false);
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }

  onCityChange(id: string) {
    this.cityId.set(id);
    this.current.set(null);
    this.load();
  }

  async load() {
    const currentCityId = this.cityId();
    if (!currentCityId) return;
    this.loading.set(true);
    this.missing.set(false);
    try {
      const data = await this.pricing.getDriverPricing(currentCityId);
      if (this.cityId() === currentCityId) {
        this.current.set(data);
      }
    } catch (err) {
      if (this.cityId() !== currentCityId) {
        return;
      }
      const axiosErr = err as { response?: { status?: number; data?: ApiErrorBody } };
      if (
        axiosErr.response?.status === 404 &&
        axiosErr.response?.data?.error?.code === 'CITY_DRIVER_PRICING_NOT_FOUND'
      ) {
        this.current.set(null);
        this.missing.set(true);
      } else {
        this.missing.set(false);
        this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
      }
    } finally {
      if (this.cityId() === currentCityId) {
        this.loading.set(false);
      }
    }
  }

  openForm() {
    this.showForm.set(true);
  }

  initialData() {
    const currentVal = this.current();
    if (!currentVal) return { pricingStages: '[{"afterSeconds":0,"increasePercentage":0}]' };
    return {
      pricingBase: currentVal.pricingBase,
      roundingUnit: currentVal.roundingUnit,
      pricingStages: JSON.stringify(currentVal.pricingStages),
    };
  }

  async save(value: Record<string, string>) {
    this.submitting.set(true);
    const activeCityId = this.cityId();
    try {
      const stages = JSON.parse(value['pricingStages']);
      const updated = await this.pricing.putDriverPricing(activeCityId, {
        pricingBase: Number(value['pricingBase']),
        roundingUnit: Number(value['roundingUnit']),
        pricingStages: stages,
      });
      if (this.cityId() === activeCityId) {
        this.current.set(updated);
        this.missing.set(false);
      }
      this.showForm.set(false);
      this.notify.success(this.language.t('common.success'));
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.submitting.set(false);
    }
  }
}
