import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api.service';
import { CityAdmin } from '../../interfaces/super-admin/staff.interface';

const withId = (row: CityAdmin): CityAdmin => ({ ...row, _id: row.accountId });

@Injectable({ providedIn: 'root' })
export class StaffService {
  private api = inject(ApiService);

  async listAdmins(): Promise<CityAdmin[]> {
    const response = await this.api.client.get<{ data: CityAdmin[] }>(
      '/api/v1/dashboard/admins'
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

  async exportAdmins() {
    const response = await this.api.client.get<Blob>('/api/v1/dashboard/admins/export', {
      responseType: 'blob',
    });
    return response.data;
  }
}
