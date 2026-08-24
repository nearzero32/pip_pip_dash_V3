import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import { CityAdmin } from './city-admin.models';
import { HTTP_CONFIG } from '../../../core/http/http.config';

const withId = (row: CityAdmin): CityAdmin => ({ ...row, _id: row.accountId });

@Injectable({ providedIn: 'root' })
export class CityAdminsService {
  private api = inject(ApiService);

  async listAdmins(search?: string): Promise<CityAdmin[]> {
    const response = await this.api.client.get<{ data: CityAdmin[] }>(
      '/api/v1/dashboard/admins', { params: search?.trim() ? { search: search.trim(), limit: 100 } : { limit: 100 } }
    );
    return response.data.data.map(withId);
  }

  async createAdmin(body: {
    email: string;
    password: string;
    cityId: string;
    displayName?: string;
  }) {
    const response = await this.api.client.post<CityAdmin>('/api/v1/dashboard/admins', body);
    return withId(response.data);
  }

  async updateAdmin(
    adminId: string,
    body: { displayName?: string; cityId?: string; status?: 'ACTIVE' | 'DISABLED' }
  ) {
    const response = await this.api.client.patch<CityAdmin>(
      `/api/v1/dashboard/admins/${adminId}`,
      body
    );
    return withId(response.data);
  }

  async resetPassword(adminId: string, password: string) {
    await this.api.client.post(`/api/v1/dashboard/admins/${adminId}/password`, { password });
  }

  async exportAdmins(search?: string) {
    const response = await this.api.client.get<Blob>('/api/v1/dashboard/admins/export', {
      params: search?.trim() ? { search: search.trim() } : {}, responseType: 'blob',
      timeout: HTTP_CONFIG.LONG_TIMEOUT,
    });
    return response.data;
  }
}
