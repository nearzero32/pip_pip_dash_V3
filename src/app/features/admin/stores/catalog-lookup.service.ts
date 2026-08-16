import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import { MainCategory, Subcategory } from './catalog-lookup.models';

interface DashboardListBody<T> {
  data: T[];
  pagination?: { page: number; limit: number; total: number };
  page?: number;
  limit?: number;
  total?: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogLookupService {
  private api = inject(ApiService);
  private mains: MainCategory[] | null = null;
  private mainsInFlight: Promise<MainCategory[]> | null = null;
  private subs = new Map<string, Subcategory[]>();
  private subsInFlight = new Map<string, Promise<Subcategory[]>>();

  async listUsableMainCategories(): Promise<MainCategory[]> {
    if (this.mains) return this.mains;
    if (this.mainsInFlight) return this.mainsInFlight;
    this.mainsInFlight = this.paginateMain().then((rows) => {
      this.mains = rows.filter((row) => row.status === 'ACTIVE' || row.status === 'INACTIVE');
      return this.mains;
    });
    try {
      return await this.mainsInFlight;
    } catch (err) {
      this.mainsInFlight = null;
      throw err;
    }
  }

  async listUsableSubcategories(mainCategoryId: string): Promise<Subcategory[]> {
    const cached = this.subs.get(mainCategoryId);
    if (cached) return cached;
    const inflight = this.subsInFlight.get(mainCategoryId);
    if (inflight) return inflight;
    const request = this.paginateSub(mainCategoryId).then((rows) => {
      const usable = rows.filter((row) => row.status === 'ACTIVE' || row.status === 'INACTIVE');
      this.subs.set(mainCategoryId, usable);
      this.subsInFlight.delete(mainCategoryId);
      return usable;
    });
    this.subsInFlight.set(mainCategoryId, request);
    try {
      return await request;
    } catch (err) {
      this.subsInFlight.delete(mainCategoryId);
      throw err;
    }
  }

  private async paginateMain(): Promise<MainCategory[]> {
    return this.paginate('/api/v1/dashboard/main-categories');
  }

  private async paginateSub(mainCategoryId: string): Promise<Subcategory[]> {
    return this.paginate('/api/v1/dashboard/subcategories', { mainCategoryId });
  }

  private async paginate<T>(url: string, extra: Record<string, string> = {}): Promise<T[]> {
    const collected: T[] = [];
    let page = 1;
    const limit = 100;
    for (;;) {
      const response = await this.api.client.get<DashboardListBody<T>>(url, {
        params: { page, limit, ...extra },
      });
      const body = response.data;
      const rows = body.data ?? [];
      collected.push(...rows);
      const total = body.pagination?.total ?? body.total ?? collected.length;
      if (rows.length < limit || collected.length >= total) break;
      page += 1;
      if (page > 50) break;
    }
    return collected;
  }
}
