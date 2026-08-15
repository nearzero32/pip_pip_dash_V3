import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
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

@Component({
  selector: 'app-driver-pricing',
  standalone: true,
  imports: [CommonModule, FormsModule, FormDialogComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './driver-pricing.html',
})
export class DriverPricingComponent implements OnInit {
  private geography = inject(GeographyService);
  private pricing = inject(PricingService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  cities: City[] = [];
  cityId = '';
  current: DriverPricing | null = null;
  missing = false;
  loading = true;
  showForm = false;
  submitting = false;
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
      this.cities = page.data;
      if (this.cities[0]) {
        this.cityId = this.cities[0].id;
        await this.load();
      } else {
        this.loading = false;
      }
    } catch (err) {
      this.loading = false;
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }

  async load() {
    if (!this.cityId) return;
    this.loading = true;
    this.missing = false;
    try {
      this.current = await this.pricing.getDriverPricing(this.cityId);
    } catch {
      this.current = null;
      this.missing = true;
    } finally {
      this.loading = false;
    }
  }

  openForm() {
    this.showForm = true;
  }

  initialData() {
    if (!this.current) return { pricingStages: '[{"afterSeconds":0,"increasePercentage":0}]' };
    return {
      pricingBase: this.current.pricingBase,
      roundingUnit: this.current.roundingUnit,
      pricingStages: JSON.stringify(this.current.pricingStages),
    };
  }

  async save(value: Record<string, string>) {
    this.submitting = true;
    try {
      const stages = JSON.parse(value['pricingStages']);
      this.current = await this.pricing.putDriverPricing(this.cityId, {
        pricingBase: Number(value['pricingBase']),
        roundingUnit: Number(value['roundingUnit']),
        pricingStages: stages,
      });
      this.missing = false;
      this.showForm = false;
      this.notify.success(this.language.t('common.success'));
    } catch (err) {
      this.notify.error(apiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      this.submitting = false;
    }
  }
}
