import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import {
  Store,
  StoreAcceptancePatch,
  StoreListPage,
  StoreListQuery,
  StoreStatusPatch,
  StoreZoneIdsPatch,
} from './stores.models';

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
export class StoresService {
  private api = inject(ApiService);

  async list(query: StoreListQuery = {}): Promise<StoreListPage> {
    const response = await this.api.client.get<DashboardListBody<Store>>(
      '/api/v1/dashboard/stores',
      {
        params: {
          page: query.page ?? 1,
          limit: query.limit ?? 20,
          ...(query.search ? { search: query.search } : {}),
          ...(query.status ? { status: query.status } : {}),
          ...(query.zoneId ? { zoneId: query.zoneId } : {}),
        },
      }
    );
    const body = response.data;
    const page = body.pagination?.page ?? body.page ?? 1;
    const limit = body.pagination?.limit ?? body.limit ?? 20;
    const total = body.pagination?.total ?? body.total ?? 0;
    return { data: body.data ?? [], page, limit, total };
  }

  async get(storeId: string): Promise<Store> {
    const response = await this.api.client.get<Store>(`/api/v1/dashboard/stores/${storeId}`);
    return response.data;
  }

  async update(
    storeId: string,
    patch: StoreStatusPatch | StoreAcceptancePatch | StoreZoneIdsPatch
  ): Promise<Store> {
    const response = await this.api.client.patch<Store>(
      `/api/v1/dashboard/stores/${storeId}`,
      patch
    );
    return response.data;
  }

  async archive(storeId: string): Promise<Store> {
    const response = await this.api.client.delete<Store>(
      `/api/v1/dashboard/stores/${storeId}`
    );
    return response.data;
  }
}
