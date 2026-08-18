import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import { CommissionHistoryItem, CommissionPage, StoreCommission, StoreCommissionStatus } from './store-commissions.models';

interface ListBody<T> { data: T[]; pagination?: { page: number; limit: number; total: number }; page?: number; limit?: number; total?: number; }
const toPage = <T>(body: ListBody<T>): CommissionPage<T> => ({ data: body.data ?? [], page: body.pagination?.page ?? body.page ?? 1, limit: body.pagination?.limit ?? body.limit ?? 20, total: body.pagination?.total ?? body.total ?? 0 });

@Injectable({ providedIn: 'root' })
export class StoreCommissionsService {
  private api = inject(ApiService);
  async list(query: { page?: number; limit?: number; search?: string; status?: StoreCommissionStatus } = {}) {
    const response = await this.api.client.get<ListBody<StoreCommission>>('/api/v1/dashboard/store-commissions', { params: { page: query.page ?? 1, limit: query.limit ?? 20, ...(query.search ? { search: query.search } : {}), ...(query.status ? { status: query.status } : {}) } });
    return toPage(response.data);
  }
  async history(storeId: string, page = 1) {
    const response = await this.api.client.get<ListBody<CommissionHistoryItem>>(`/api/v1/dashboard/store-commissions/${storeId}/history`, { params: { page, limit: 20 } });
    return toPage(response.data);
  }
  async update(storeId: string, body: { platformCommissionRate: number; reason: string; note?: string }) {
    return (await this.api.client.patch<StoreCommission>(`/api/v1/dashboard/store-commissions/${storeId}`, body, { headers: { 'Idempotency-Key': crypto.randomUUID() } })).data;
  }
}
