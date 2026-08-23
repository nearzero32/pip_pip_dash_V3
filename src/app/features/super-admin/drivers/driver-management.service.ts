import { Injectable, inject } from '@angular/core';

import { ApiService } from '../../../core/http/api.service';
import {
  DriverOperationalStatus,
  ManagedDriver,
  ManagedDriverPage,
} from './driver-management.models';

@Injectable({ providedIn: 'root' })
export class DriverManagementService {
  private api = inject(ApiService);

  async list(page = 1, limit = 20, cityId?: string): Promise<ManagedDriverPage> {
    const response = await this.api.client.get<ManagedDriverPage>(
      '/api/v1/dashboard/drivers',
      { params: { page, limit, ...(cityId ? { cityId } : {}) } },
    );
    return {
      ...response.data,
      data: (response.data.data ?? []).map((row) => ({
        ...row,
        _id: row.accountId,
      })),
    };
  }

  async create(body: {
    phone: string;
    accessCode: string;
    cityId: string;
    driverPhotoAssetId: string;
    driverName: string; fatherName: string; motherName: string; alternatePhone: string;
    nationalIdFrontAssetId: string; nationalIdBackAssetId: string;
    residenceCardFrontAssetId: string; residenceCardBackAssetId: string; contractAssetId: string;
    vehicleType?: string; vehicleNumber?: string;
    vehicleDescription?: string;
  }): Promise<ManagedDriver> {
    const response = await this.api.client.post<ManagedDriver>(
      '/api/v1/dashboard/drivers',
      body,
    );
    return { ...response.data, _id: response.data.accountId };
  }

  async update(
    driverId: string,
    body: {
      phone?: string;
      cityId?: string;
      operationalStatus?: DriverOperationalStatus;
      driverPhotoAssetId?: string;
      vehicleDescription?: string | null;
      driverName?: string; fatherName?: string; motherName?: string; alternatePhone?: string;
      vehicleType?: string | null; vehicleNumber?: string | null;
      nationalIdFrontAssetId?: string; nationalIdBackAssetId?: string; residenceCardFrontAssetId?: string; residenceCardBackAssetId?: string; contractAssetId?: string;
    },
  ): Promise<ManagedDriver> {
    const response = await this.api.client.patch<ManagedDriver>(
      `/api/v1/dashboard/drivers/${driverId}`,
      body,
    );
    return { ...response.data, _id: response.data.accountId };
  }

  async resetAccessCode(driverId: string, accessCode: string): Promise<void> {
    await this.api.client.post(
      `/api/v1/dashboard/drivers/${driverId}/access-code`,
      { accessCode },
    );
  }

  async documents(driverId: string): Promise<Array<{ assetId: string; documentType: string; side: string; originalName: string }>> {
    return (await this.api.client.get<Array<{ assetId: string; documentType: string; side: string; originalName: string }>>(`/api/v1/dashboard/drivers/${driverId}/documents`)).data;
  }
}
