import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api.service';
import { DriverCandidatePage } from '../../interfaces/admin/driver.interface';

@Injectable({ providedIn: 'root' })
export class DriversService {
  private api = inject(ApiService);

  async list(page = 1, limit = 20): Promise<DriverCandidatePage> {
    const response = await this.api.client.get<DriverCandidatePage>(
      '/api/v1/dashboard/drivers/assignment-candidates',
      { params: { page, limit } }
    );
    const body = response.data;
    return {
      ...body,
      data: (body.data ?? []).map((row) => ({
        ...row,
        _id: row.driverId,
      })),
    };
  }

  async exportExcel(): Promise<Blob> {
    const response = await this.api.client.get<Blob>(
      '/api/v1/dashboard/drivers/assignment-candidates/export',
      { responseType: 'blob' }
    );
    return response.data;
  }
}
