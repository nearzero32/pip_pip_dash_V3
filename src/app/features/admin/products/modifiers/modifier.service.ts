import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../../core/http/api.service';
import { CatalogListPage } from '../product-catalog.models';
import {
  ModifierGroup,
  ModifierGroupCreateBody,
  ModifierGroupListQuery,
  ModifierGroupPatch,
  ModifierOptionInput,
  ModifierOptionPatch,
  ProductModifierUpsert,
  ProductModifiers,
} from './modifier.models';

interface DashboardListBody<T> {
  data: T[];
  pagination?: { page: number; limit: number; total: number };
  page?: number;
  limit?: number;
  total?: number;
}

@Injectable({ providedIn: 'root' })
export class ModifierCatalogService {
  private api = inject(ApiService);

  async listGroups(
    storeId: string,
    query: ModifierGroupListQuery = {}
  ): Promise<CatalogListPage<ModifierGroup>> {
    const response = await this.api.client.get<DashboardListBody<ModifierGroup>>(
      `/api/v1/dashboard/stores/${storeId}/modifier-groups`,
      {
        params: {
          page: query.page ?? 1,
          limit: query.limit ?? 20,
          ...(query.search ? { search: query.search } : {}),
          ...(query.status ? { status: query.status } : {}),
        },
      }
    );
    const body = response.data;
    return {
      data: body.data ?? [],
      page: body.pagination?.page ?? body.page ?? 1,
      limit: body.pagination?.limit ?? body.limit ?? 20,
      total: body.pagination?.total ?? body.total ?? 0,
    };
  }

  async listAssignableGroups(storeId: string): Promise<ModifierGroup[]> {
    const collected: ModifierGroup[] = [];
    let page = 1;
    const limit = 100;
    for (;;) {
      const result = await this.listGroups(storeId, { page, limit });
      collected.push(...result.data.filter((group) => group.status !== 'ARCHIVED'));
      if (result.data.length < limit || collected.length >= result.total) break;
      page += 1;
      if (page > 50) break;
    }
    return collected;
  }

  async getGroup(storeId: string, groupId: string): Promise<ModifierGroup> {
    const response = await this.api.client.get<ModifierGroup>(
      `/api/v1/dashboard/stores/${storeId}/modifier-groups/${groupId}`
    );
    return response.data;
  }

  async createGroup(storeId: string, body: ModifierGroupCreateBody): Promise<ModifierGroup> {
    const response = await this.api.client.post<ModifierGroup>(
      `/api/v1/dashboard/stores/${storeId}/modifier-groups`,
      body
    );
    return response.data;
  }

  async updateGroup(
    storeId: string,
    groupId: string,
    patch: ModifierGroupPatch
  ): Promise<ModifierGroup> {
    const response = await this.api.client.patch<ModifierGroup>(
      `/api/v1/dashboard/stores/${storeId}/modifier-groups/${groupId}`,
      patch
    );
    return response.data;
  }

  async archiveGroup(storeId: string, groupId: string): Promise<ModifierGroup> {
    const response = await this.api.client.delete<ModifierGroup>(
      `/api/v1/dashboard/stores/${storeId}/modifier-groups/${groupId}`
    );
    return response.data;
  }

  async restoreGroup(storeId: string, groupId: string): Promise<ModifierGroup> {
    const response = await this.api.client.post<ModifierGroup>(
      `/api/v1/dashboard/stores/${storeId}/modifier-groups/${groupId}/restore`
    );
    return response.data;
  }

  async addOption(
    storeId: string,
    groupId: string,
    body: ModifierOptionInput
  ): Promise<ModifierGroup> {
    const response = await this.api.client.post<ModifierGroup>(
      `/api/v1/dashboard/stores/${storeId}/modifier-groups/${groupId}/options`,
      body
    );
    return response.data;
  }

  async updateOption(
    storeId: string,
    groupId: string,
    optionId: string,
    patch: ModifierOptionPatch
  ): Promise<ModifierGroup> {
    const response = await this.api.client.patch<ModifierGroup>(
      `/api/v1/dashboard/stores/${storeId}/modifier-groups/${groupId}/options/${optionId}`,
      patch
    );
    return response.data;
  }

  async archiveOption(storeId: string, groupId: string, optionId: string): Promise<ModifierGroup> {
    const response = await this.api.client.delete<ModifierGroup>(
      `/api/v1/dashboard/stores/${storeId}/modifier-groups/${groupId}/options/${optionId}`
    );
    return response.data;
  }

  async restoreOption(storeId: string, groupId: string, optionId: string): Promise<ModifierGroup> {
    const response = await this.api.client.post<ModifierGroup>(
      `/api/v1/dashboard/stores/${storeId}/modifier-groups/${groupId}/options/${optionId}/restore`
    );
    return response.data;
  }

  async getProductModifiers(storeId: string, productId: string): Promise<ProductModifiers> {
    const response = await this.api.client.get<ProductModifiers>(
      `/api/v1/dashboard/stores/${storeId}/products/${productId}/modifiers`
    );
    return response.data;
  }

  async upsertProductModifier(
    storeId: string,
    productId: string,
    optionId: string,
    body: ProductModifierUpsert
  ): Promise<ProductModifiers> {
    const response = await this.api.client.put<ProductModifiers>(
      `/api/v1/dashboard/stores/${storeId}/products/${productId}/modifiers/${optionId}`,
      body
    );
    return response.data;
  }

  async removeProductModifier(
    storeId: string,
    productId: string,
    optionId: string
  ): Promise<ProductModifiers> {
    const response = await this.api.client.delete<ProductModifiers>(
      `/api/v1/dashboard/stores/${storeId}/products/${productId}/modifiers/${optionId}`
    );
    return response.data;
  }
}
