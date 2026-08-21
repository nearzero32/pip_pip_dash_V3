import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import { City } from '../../super-admin/geography/geography.models';
import {
  Zone,
  ZoneCreateBody,
  ZoneListPage,
  ZoneListQuery,
  ZoneStatus,
  ZoneUpdateBody,
} from './zones.models';

interface DashboardListBody<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  };
  page?: number;
  limit?: number;
  total?: number;
}

@Injectable({ providedIn: 'root' })
export class ZonesService {
  private api = inject(ApiService);

  async list(cityId: string, query: ZoneListQuery = {}): Promise<ZoneListPage> {
    const response = await this.api.client.get<DashboardListBody<Zone>>(
      '/api/v1/dashboard/zones',
      {
        params: {
          cityId,
          page: query.page ?? 1,
          limit: query.limit ?? 20,
          ...(query.search ? { search: query.search } : {}),
          ...(query.status ? { status: query.status } : {}),
        },
      }
    );
    const body = response.data;
    const page = body.pagination?.page ?? body.page ?? 1;
    const limit = body.pagination?.limit ?? body.limit ?? 20;
    const total = body.pagination?.total ?? body.total ?? 0;
    return { data: body.data ?? [], page, limit, total };
  }

  async listAllByStatus(cityId: string, status: Exclude<ZoneStatus, 'ARCHIVED'>): Promise<Zone[]> {
    const collected: Zone[] = [];
    let page = 1;
    const limit = 100;
    for (;;) {
      const result = await this.list(cityId, { page, limit, status });
      collected.push(...result.data);
      if (result.data.length < limit || collected.length >= result.total) break;
      page += 1;
      if (page > 50) break;
    }
    return collected;
  }

  async get(cityId: string, zoneId: string): Promise<Zone> {
    const response = await this.api.client.get<Zone>(`/api/v1/dashboard/zones/${zoneId}`, { params: { cityId } });
    return response.data;
  }

  async create(body: ZoneCreateBody): Promise<Zone> {
    const response = await this.api.client.post<Zone>('/api/v1/dashboard/zones', body);
    return response.data;
  }

  async update(cityId: string, zoneId: string, body: ZoneUpdateBody): Promise<Zone> {
    const response = await this.api.client.patch<Zone>(
      `/api/v1/dashboard/zones/${zoneId}`,
      body, { params: { cityId } }
    );
    return response.data;
  }

  async archive(cityId: string, zoneId: string): Promise<Zone> {
    const response = await this.api.client.delete<Zone>(`/api/v1/dashboard/zones/${zoneId}`, { params: { cityId } });
    return response.data;
  }

  async getCity(cityId: string): Promise<City> {
    const response = await this.api.client.get<City>(`/api/v1/dashboard/cities/${cityId}`);
    return response.data;
  }
}
