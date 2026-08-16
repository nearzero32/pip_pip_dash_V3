import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import {
  CatalogListPage,
  CatalogListQuery,
  MainCategory,
  MainCategoryCreateBody,
  MainCategoryPatch,
  Subcategory,
  SubcategoryCreateBody,
  SubcategoryPatch,
} from './catalog.models';

interface DashboardListBody<T> {
  data: T[];
  pagination?: { page: number; limit: number; total: number };
  page?: number;
  limit?: number;
  total?: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private api = inject(ApiService);
  private usableMains: MainCategory[] | null = null;
  private usableMainsInFlight: Promise<MainCategory[]> | null = null;
  private usableSubs = new Map<string, Subcategory[]>();
  private usableSubsInFlight = new Map<string, Promise<Subcategory[]>>();

  async listMainCategories(query: CatalogListQuery = {}): Promise<CatalogListPage<MainCategory>> {
    return this.list('/api/v1/dashboard/main-categories', query);
  }

  async getMainCategory(id: string): Promise<MainCategory> {
    const response = await this.api.client.get<MainCategory>(
      `/api/v1/dashboard/main-categories/${id}`
    );
    return response.data;
  }

  async createMainCategory(body: MainCategoryCreateBody): Promise<MainCategory> {
    const response = await this.api.client.post<MainCategory>(
      '/api/v1/dashboard/main-categories',
      body
    );
    this.invalidateLookups();
    return response.data;
  }

  async updateMainCategory(id: string, patch: MainCategoryPatch): Promise<MainCategory> {
    const response = await this.api.client.patch<MainCategory>(
      `/api/v1/dashboard/main-categories/${id}`,
      patch
    );
    this.invalidateLookups();
    return response.data;
  }

  async archiveMainCategory(id: string): Promise<MainCategory> {
    const response = await this.api.client.delete<MainCategory>(
      `/api/v1/dashboard/main-categories/${id}`
    );
    this.invalidateLookups();
    return response.data;
  }

  async listSubcategories(query: CatalogListQuery = {}): Promise<CatalogListPage<Subcategory>> {
    return this.list('/api/v1/dashboard/subcategories', query);
  }

  async getSubcategory(id: string): Promise<Subcategory> {
    const response = await this.api.client.get<Subcategory>(
      `/api/v1/dashboard/subcategories/${id}`
    );
    return response.data;
  }

  async createSubcategory(body: SubcategoryCreateBody): Promise<Subcategory> {
    const response = await this.api.client.post<Subcategory>(
      '/api/v1/dashboard/subcategories',
      body
    );
    this.invalidateLookups();
    return response.data;
  }

  async updateSubcategory(id: string, patch: SubcategoryPatch): Promise<Subcategory> {
    const response = await this.api.client.patch<Subcategory>(
      `/api/v1/dashboard/subcategories/${id}`,
      patch
    );
    this.invalidateLookups();
    return response.data;
  }

  async archiveSubcategory(id: string): Promise<Subcategory> {
    const response = await this.api.client.delete<Subcategory>(
      `/api/v1/dashboard/subcategories/${id}`
    );
    this.invalidateLookups();
    return response.data;
  }

  async listUsableMainCategories(): Promise<MainCategory[]> {
    if (this.usableMains) return this.usableMains;
    if (this.usableMainsInFlight) return this.usableMainsInFlight;
    this.usableMainsInFlight = this.paginateAll<MainCategory>('/api/v1/dashboard/main-categories').then(
      (rows) => {
        this.usableMains = rows.filter((row) => row.status === 'ACTIVE' || row.status === 'INACTIVE');
        return this.usableMains;
      }
    );
    try {
      return await this.usableMainsInFlight;
    } catch (err) {
      this.usableMainsInFlight = null;
      throw err;
    }
  }

  async listUsableSubcategories(mainCategoryId: string): Promise<Subcategory[]> {
    const cached = this.usableSubs.get(mainCategoryId);
    if (cached) return cached;
    const inflight = this.usableSubsInFlight.get(mainCategoryId);
    if (inflight) return inflight;
    const request = this.paginateAll<Subcategory>('/api/v1/dashboard/subcategories', {
      mainCategoryId,
    }).then((rows) => {
      const usable = rows.filter((row) => row.status === 'ACTIVE' || row.status === 'INACTIVE');
      this.usableSubs.set(mainCategoryId, usable);
      this.usableSubsInFlight.delete(mainCategoryId);
      return usable;
    });
    this.usableSubsInFlight.set(mainCategoryId, request);
    try {
      return await request;
    } catch (err) {
      this.usableSubsInFlight.delete(mainCategoryId);
      throw err;
    }
  }

  private invalidateLookups() {
    this.usableMains = null;
    this.usableMainsInFlight = null;
    this.usableSubs.clear();
    this.usableSubsInFlight.clear();
  }

  private async list<T>(url: string, query: CatalogListQuery): Promise<CatalogListPage<T>> {
    const response = await this.api.client.get<DashboardListBody<T>>(url, {
      params: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        ...(query.search ? { search: query.search } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.mainCategoryId ? { mainCategoryId: query.mainCategoryId } : {}),
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

  private async paginateAll<T>(url: string, query: CatalogListQuery = {}): Promise<T[]> {
    const collected: T[] = [];
    let page = 1;
    const limit = 100;
    for (;;) {
      const result = await this.list<T>(url, { ...query, page, limit });
      collected.push(...result.data);
      if (result.data.length < limit || collected.length >= result.total) break;
      page += 1;
      if (page > 50) break;
    }
    return collected;
  }
}
