import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import {
  DeliveryPricingInput,
  DeliveryPricingVersion,
  DriverPricing,
} from './pricing.models';

@Injectable({ providedIn: 'root' })
export class PricingService {
  private api = inject(ApiService);

  listDeliveryVersions(cityId: string) {
    return this.api.client
      .get<DeliveryPricingVersion[]>(`/api/v1/dashboard/cities/${cityId}/delivery-pricing/versions`)
      .then((r) => r.data);
  }

  createDeliveryVersion(cityId: string, body: DeliveryPricingInput) {
    return this.api.client
      .post<DeliveryPricingVersion>(
        `/api/v1/dashboard/cities/${cityId}/delivery-pricing/versions`,
        body
      )
      .then((r) => r.data);
  }

  activateDeliveryVersion(cityId: string, versionId: string) {
    return this.api.client
      .post<DeliveryPricingVersion>(
        `/api/v1/dashboard/cities/${cityId}/delivery-pricing/versions/${versionId}/activate`
      )
      .then((r) => r.data);
  }

  getDriverPricing(cityId: string) {
    return this.api.client
      .get<DriverPricing>(`/api/v1/dashboard/cities/${cityId}/driver-pricing`)
      .then((r) => r.data);
  }

  putDriverPricing(
    cityId: string,
    body: {
      pricingBase: number;
      roundingUnit: number;
      pricingStages: { afterSeconds: number; increasePercentage: number }[];
    }
  ) {
    return this.api.client
      .put<DriverPricing>(`/api/v1/dashboard/cities/${cityId}/driver-pricing`, body, {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })
      .then((r) => r.data);
  }
}
