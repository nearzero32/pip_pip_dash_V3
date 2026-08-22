import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import { City, CityBoundary, Governorate, Paginated } from './geography.models';
import { HTTP_CONFIG } from '../../../core/http/http.config';

const withId = <T extends { id: string }>(row: T): T & { _id: string } => ({
  ...row,
  _id: row.id,
});

@Injectable({ providedIn: 'root' })
export class GeographyService {
  private api = inject(ApiService);

  async listGovernorates(page = 1, limit = 50, status?: string): Promise<Paginated<Governorate>> {
    const response = await this.api.client.get<Paginated<Governorate>>(
      '/api/v1/dashboard/governorates',
      { params: { page, limit, ...(status ? { status } : {}) } }
    );
    return {
      ...response.data,
      data: response.data.data.map(withId),
    };
  }

  async updateGovernorate(
    id: string,
    body: { status?: 'ACTIVE' | 'INACTIVE'; displayOrder?: number }
  ) {
    const response = await this.api.client.patch<Governorate>(
      `/api/v1/dashboard/governorates/${id}`,
      body
    );
    return withId(response.data);
  }

  async exportGovernorates() {
    const response = await this.api.client.get<Blob>('/api/v1/dashboard/governorates/export', {
      responseType: 'blob',
      timeout: HTTP_CONFIG.LONG_TIMEOUT,
    });
    return response.data;
  }

  async listCities(page = 1, limit = 20, extras?: { governorateId?: string; status?: string }) {
    const response = await this.api.client.get<Paginated<City>>('/api/v1/dashboard/cities', {
      params: {
        page,
        limit,
        ...(extras?.governorateId ? { governorateId: extras.governorateId } : {}),
        ...(extras?.status ? { status: extras.status } : {}),
      },
    });
    return {
      ...response.data,
      data: response.data.data.map(withId),
    };
  }

  async createCity(body: {
    governorateId: string;
    translations: Array<{ locale: 'ar' | 'en'; name: string }>;
    latitude: number;
    longitude: number;
    displayOrder: number;
    boundary: CityBoundary;
  }) {
    const response = await this.api.client.post<City>('/api/v1/dashboard/cities', body);
    return withId(response.data);
  }

  async updateCity(
    id: string,
    body: Partial<{
      governorateId: string;
      translations: Array<{ locale: 'ar' | 'en'; name: string }>;
      latitude: number;
      longitude: number;
      displayOrder: number;
      boundary: CityBoundary;
    }>
  ) {
    const response = await this.api.client.patch<City>(`/api/v1/dashboard/cities/${id}`, body);
    return withId(response.data);
  }

  async getCity(id: string) {
    const response = await this.api.client.get<City>(`/api/v1/dashboard/cities/${id}`);
    return withId(response.data);
  }

  async transitionCity(id: string, action: 'activate' | 'suspend' | 'archive') {
    const response = await this.api.client.post<City>(`/api/v1/dashboard/cities/${id}/${action}`);
    return withId(response.data);
  }

  async exportCities() {
    const response = await this.api.client.get<Blob>('/api/v1/dashboard/cities/export', {
      responseType: 'blob',
      timeout: HTTP_CONFIG.LONG_TIMEOUT,
    });
    return response.data;
  }
}
