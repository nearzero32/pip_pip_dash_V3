import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import { DeliveryPricingInput, DeliveryPricingVersion, DriverPricing } from './pricing.models';
import { Paginated } from '../geography/geography.models';

@Injectable({ providedIn: 'root' })
export class PricingService {
  private api = inject(ApiService);

  listDeliveryVersions(
    cityId: string,
    options: { page?: number; limit?: number; search?: string; status?: string } = {},
  ) {
    return this.api.client
      .get<Paginated<DeliveryPricingVersion>>(
        `/api/v1/dashboard/cities/${cityId}/delivery-pricing/versions`,
        {
          params: {
            page: options.page ?? 1,
            limit: options.limit ?? 20,
            ...(options.search ? { search: options.search } : {}),
            ...(options.status ? { status: options.status } : {}),
          },
        },
      )
      .then((r) => r.data);
  }

  createDeliveryVersion(cityId: string, body: DeliveryPricingInput) {
    return this.api.client
      .post<DeliveryPricingVersion>(
        `/api/v1/dashboard/cities/${cityId}/delivery-pricing/versions`,
        body,
      )
      .then((r) => r.data);
  }

  activateDeliveryVersion(cityId: string, versionId: string) {
    return this.api.client
      .post<DeliveryPricingVersion>(
        `/api/v1/dashboard/cities/${cityId}/delivery-pricing/versions/${versionId}/activate`,
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
    },
  ) {
    return this.api.client
      .put<DriverPricing>(`/api/v1/dashboard/cities/${cityId}/driver-pricing`, body, {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })
      .then((r) => r.data);
  }
}
