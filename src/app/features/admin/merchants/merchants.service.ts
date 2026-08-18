import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import { Merchant, MerchantPage, MerchantStatus } from './merchants.models';

interface ListBody<T> {
  data: T[];
  pagination?: { page: number; limit: number; total: number };
  page?: number;
  limit?: number;
  total?: number;
}

@Injectable({ providedIn: 'root' })
export class MerchantsService {
  private api = inject(ApiService);

  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: MerchantStatus;
    storeId?: string;
  } = {}): Promise<MerchantPage> {
    const response = await this.api.client.get<ListBody<Merchant>>('/api/v1/dashboard/merchants', {
      params: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        ...(query.search ? { search: query.search } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.storeId ? { storeId: query.storeId } : {}),
      },
    });
    const body = response.data;
    return {
      data: body.data ?? [],
      page: body.pagination?.page ?? body.page ?? 1,
      limit: body.pagination?.limit ?? body.limit ?? 20,
      total: body.pagination?.total ?? body.total ?? 0,
    };
  }

  async create(body: { phone: string; password: string; storeId: string; displayName?: string; status?: MerchantStatus }) {
    return (await this.api.client.post<Merchant>('/api/v1/dashboard/merchants', body)).data;
  }

  async update(accountId: string, body: { displayName?: string | null; status?: MerchantStatus }) {
    return (await this.api.client.patch<Merchant>(`/api/v1/dashboard/merchants/${accountId}`, body)).data;
  }

  async resetPassword(accountId: string, password: string) {
    await this.api.client.post(`/api/v1/dashboard/merchants/${accountId}/password`, { password });
  }

  async transferStore(accountId: string, storeId: string) {
    return (await this.api.client.post<Merchant>(`/api/v1/dashboard/merchants/${accountId}/store`, { storeId })).data;
  }
}
