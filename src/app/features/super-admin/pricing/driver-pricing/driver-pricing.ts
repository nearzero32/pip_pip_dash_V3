import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { City } from '../../geography/geography.models';
import { DriverPricing } from '../pricing.models';
import { GeographyService } from '../../geography/geography.service';
import { PricingService } from '../pricing.service';
import { LanguageService } from '../../../../i18n/language.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { apiErrorMessage, getApiErrorStatus, isApiErrorCode } from '../../../../core/http/api-error';
import { DriverPricingFormComponent, DriverPricingFormValue } from './driver-pricing-form';
import { SelectControlComponent, type SelectControlOption } from '../../../../shared/components/select-control/select-control';
import { ExportButtonComponent } from '../../../../shared/components/export-button/export-button';
import { InputControlComponent } from '../../../../shared/components/input-control/input-control';
import { PageStatItem, PageStatsComponent } from '../../../../shared/components/page-stats/page-stats';


@Component({
  selector: 'app-driver-pricing',
  standalone: true,
  imports: [CommonModule, FormsModule, DriverPricingFormComponent, TranslatePipe, SelectControlComponent, ExportButtonComponent, InputControlComponent, PageStatsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './driver-pricing.html',
  styleUrl: './driver-pricing.css',
})
export class DriverPricingComponent implements OnInit {
  private geography = inject(GeographyService);
  private pricing = inject(PricingService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  cities = signal<City[]>([]);
  cityId = signal('');
  search = signal('');
  current = signal<DriverPricing | null>(null);
  missing = signal(false);
  loading = signal(true);
  showForm = signal(false);
  submitting = signal(false);

  ngOnInit() {
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

  cityOptions(): readonly SelectControlOption[] {
    const term = this.search().trim().toLocaleLowerCase();
    return this.cities()
      .filter((city) => !term || city.nameAr.toLocaleLowerCase().includes(term) || city.nameEn.toLocaleLowerCase().includes(term))
      .map((city) => ({ value: city.id, label: this.language.lang() === 'ar' ? city.nameAr : city.nameEn }));
  }

  pricingStats(): PageStatItem[] {
    const current = this.current();
    const city = this.cities().find((item) => item.id === this.cityId());
    return [
      { label: this.language.t('common.city'), value: city ? (this.language.lang() === 'ar' ? city.nameAr : city.nameEn) : '—', tone: 'total' },
      { label: this.language.t('pricing.version'), value: current?.version ?? '—', tone: 'success' },
      { label: this.language.t('pricing.driverBase'), value: current?.pricingBase ?? '—', tone: 'warning' },
      { label: this.language.t('pricing.stagesHeading'), value: current?.pricingStages.length ?? 0 },
    ];
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
      if (
        getApiErrorStatus(err) === 404 &&
        isApiErrorCode(err, 'CITY_DRIVER_PRICING_NOT_FOUND')
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

  stageOffer(pricingBase: number, increasePercentage: number): string {
    const amount = pricingBase * (1 + increasePercentage / 100);
    const display = Number.isInteger(amount) ? amount : Math.round(amount * 100) / 100;
    return new Intl.NumberFormat(this.language.lang() === 'ar' ? 'ar' : 'en-GB').format(display);
  }

  async save(value: DriverPricingFormValue) {
    this.submitting.set(true);
    const activeCityId = this.cityId();
    try {
      const updated = await this.pricing.putDriverPricing(activeCityId, {
        pricingBase: value.pricingBase,
        roundingUnit: value.roundingUnit,
        pricingStages: value.pricingStages,
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
