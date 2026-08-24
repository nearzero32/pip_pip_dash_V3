import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import { CommissionHistoryItem, CommissionPage, StoreCommission, StoreCommissionStatus } from './store-commissions.models';

type ResponsePage<T> = { data: T[]; page?: number; limit?: number; total?: number; pagination?: { page: number; limit: number; total: number } };
const pageOf = <T>(body: ResponsePage<T>): CommissionPage<T> => ({ data: body.data ?? [], page: body.pagination?.page ?? body.page ?? 1, limit: body.pagination?.limit ?? body.limit ?? 20, total: body.pagination?.total ?? body.total ?? 0 });

@Injectable({ providedIn: 'root' })
export class SuperStoreCommissionsService {
  private api = inject(ApiService).client;
  async list(cityId: string, query: { page?: number; limit?: number; search?: string; status?: StoreCommissionStatus } = {}) {
    const response = await this.api.get<ResponsePage<StoreCommission>>('/api/v1/dashboard/store-commissions', { params: { cityId, page: query.page ?? 1, limit: query.limit ?? 20, ...(query.search ? { search: query.search } : {}), ...(query.status ? { status: query.status } : {}) } });
    return pageOf(response.data);
  }
  async history(cityId: string, storeId: string) {
    return pageOf((await this.api.get<ResponsePage<CommissionHistoryItem>>(`/api/v1/dashboard/store-commissions/${storeId}/history`, { params: { cityId, page: 1, limit: 50 } })).data);
  }
  async update(cityId: string, storeId: string, body: { platformCommissionRate: number; reason: string; note?: string }) {
    return (await this.api.patch<StoreCommission>(`/api/v1/dashboard/store-commissions/${storeId}`, { ...body, cityId }, { headers: { 'Idempotency-Key': crypto.randomUUID() } })).data;
  }
  async restore(cityId: string, storeId: string) {
    await this.api.patch(`/api/v1/super-admin/stores/${storeId}`, { status: 'ACTIVE' }, { params: { cityId } });
  }
}
