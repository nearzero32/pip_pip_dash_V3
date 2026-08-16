import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import { DriverCandidatePage } from './driver.models';
import { HTTP_CONFIG } from '../../../core/http/http.config';

@Injectable({ providedIn: 'root' })
export class DriversService {
  private api = inject(ApiService);

  async listCandidates(query: {
    search?: string;
    page?: number;
    limit?: number;
    activeOrderCount?: number;
  }): Promise<DriverCandidatePage> {
    const params: Record<string, string | number> = {
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    };
    if (query.search) params['search'] = query.search;
    if (query.activeOrderCount != null) params['activeOrderCount'] = query.activeOrderCount;
    const response = await this.api.client.get<DriverCandidatePage>(
      '/api/v1/dashboard/drivers/assignment-candidates',
      { params }
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
      {
        responseType: 'blob',
        timeout: HTTP_CONFIG.LONG_TIMEOUT,
      }
    );
    return response.data;
  }
}
