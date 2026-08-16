import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import {
  CatalogListPage,
  Product,
  ProductAvailabilityFlagPatch,
  ProductAvailabilityInput,
  ProductCorePatch,
  ProductCreateBody,
  ProductImageInput,
  ProductListQuery,
  ProductSizeArchiveBody,
  ProductSizeCreateInput,
  ProductSizePatch,
  ProductStatusPatch,
  StoreCategory,
  StoreCategoryCreateBody,
  StoreCategoryListQuery,
  StoreCategoryPatch,
} from './product-catalog.models';

interface DashboardListBody<T> {
  data: T[];
  pagination?: { page: number; limit: number; total: number };
  page?: number;
  limit?: number;
  total?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductCatalogService {
  private api = inject(ApiService);

  async listStoreCategories(
    storeId: string,
    query: StoreCategoryListQuery = {}
  ): Promise<CatalogListPage<StoreCategory>> {
    return this.list(`/api/v1/dashboard/stores/${storeId}/categories`, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      ...(query.search ? { search: query.search } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.parentCategoryId !== undefined
        ? { parentCategoryId: query.parentCategoryId }
        : {}),
    });
  }

  async listAllStoreCategories(
    storeId: string,
    query: Omit<StoreCategoryListQuery, 'page' | 'limit'> = {}
  ): Promise<StoreCategory[]> {
    const collected: StoreCategory[] = [];
    let page = 1;
    const limit = 100;
    for (;;) {
      const result = await this.listStoreCategories(storeId, { ...query, page, limit });
      collected.push(...result.data);
      if (result.data.length < limit || collected.length >= result.total) break;
      page += 1;
      if (page > 50) break;
    }
    return collected;
  }

  async getStoreCategory(storeId: string, categoryId: string): Promise<StoreCategory> {
    const response = await this.api.client.get<StoreCategory>(
      `/api/v1/dashboard/stores/${storeId}/categories/${categoryId}`
    );
    return response.data;
  }

  async createStoreCategory(
    storeId: string,
    body: StoreCategoryCreateBody
  ): Promise<StoreCategory> {
    const response = await this.api.client.post<StoreCategory>(
      `/api/v1/dashboard/stores/${storeId}/categories`,
      body
    );
    return response.data;
  }

  async updateStoreCategory(
    storeId: string,
    categoryId: string,
    patch: StoreCategoryPatch
  ): Promise<StoreCategory> {
    const response = await this.api.client.patch<StoreCategory>(
      `/api/v1/dashboard/stores/${storeId}/categories/${categoryId}`,
      patch
    );
    return response.data;
  }

  async archiveStoreCategory(storeId: string, categoryId: string): Promise<StoreCategory> {
    const response = await this.api.client.delete<StoreCategory>(
      `/api/v1/dashboard/stores/${storeId}/categories/${categoryId}`
    );
    return response.data;
  }

  async listProducts(storeId: string, query: ProductListQuery = {}): Promise<CatalogListPage<Product>> {
    return this.list(`/api/v1/dashboard/stores/${storeId}/products`, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      ...(query.search ? { search: query.search } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId !== undefined ? { categoryId: query.categoryId } : {}),
    });
  }

  async getProduct(storeId: string, productId: string): Promise<Product> {
    const response = await this.api.client.get<Product>(
      `/api/v1/dashboard/stores/${storeId}/products/${productId}`
    );
    return response.data;
  }

  async createProduct(storeId: string, body: ProductCreateBody): Promise<Product> {
    const response = await this.api.client.post<Product>(
      `/api/v1/dashboard/stores/${storeId}/products`,
      body
    );
    return response.data;
  }

  async updateProductCore(
    storeId: string,
    productId: string,
    patch: ProductCorePatch
  ): Promise<Product> {
    return this.patchProduct(storeId, productId, patch);
  }

  async updateProductStatus(
    storeId: string,
    productId: string,
    patch: ProductStatusPatch
  ): Promise<Product> {
    return this.patchProduct(storeId, productId, patch);
  }

  async updateProductAvailabilityFlag(
    storeId: string,
    productId: string,
    patch: ProductAvailabilityFlagPatch
  ): Promise<Product> {
    return this.patchProduct(storeId, productId, patch);
  }

  async replaceProductImages(
    storeId: string,
    productId: string,
    images: ProductImageInput[]
  ): Promise<Product> {
    const response = await this.api.client.put<Product>(
      `/api/v1/dashboard/stores/${storeId}/products/${productId}/images`,
      { images }
    );
    return response.data;
  }

  async addProductSize(
    storeId: string,
    productId: string,
    body: ProductSizeCreateInput
  ): Promise<Product> {
    const response = await this.api.client.post<Product>(
      `/api/v1/dashboard/stores/${storeId}/products/${productId}/sizes`,
      body
    );
    return response.data;
  }

  async updateProductSize(
    storeId: string,
    productId: string,
    sizeId: string,
    patch: ProductSizePatch
  ): Promise<Product> {
    const response = await this.api.client.patch<Product>(
      `/api/v1/dashboard/stores/${storeId}/products/${productId}/sizes/${sizeId}`,
      patch
    );
    return response.data;
  }

  async archiveProductSize(
    storeId: string,
    productId: string,
    sizeId: string,
    body?: ProductSizeArchiveBody
  ): Promise<Product> {
    const response = await this.api.client.delete<Product>(
      `/api/v1/dashboard/stores/${storeId}/products/${productId}/sizes/${sizeId}`,
      body ? { data: body } : undefined
    );
    return response.data;
  }

  async replaceProductAvailability(
    storeId: string,
    productId: string,
    windows: ProductAvailabilityInput[]
  ): Promise<Product> {
    const response = await this.api.client.put<Product>(
      `/api/v1/dashboard/stores/${storeId}/products/${productId}/availability`,
      { windows }
    );
    return response.data;
  }

  async archiveProduct(storeId: string, productId: string): Promise<Product> {
    const response = await this.api.client.delete<Product>(
      `/api/v1/dashboard/stores/${storeId}/products/${productId}`
    );
    return response.data;
  }

  private async patchProduct(
    storeId: string,
    productId: string,
    patch: ProductCorePatch | ProductStatusPatch | ProductAvailabilityFlagPatch
  ): Promise<Product> {
    const response = await this.api.client.patch<Product>(
      `/api/v1/dashboard/stores/${storeId}/products/${productId}`,
      patch
    );
    return response.data;
  }

  private async list<T>(
    url: string,
    params: Record<string, string | number>
  ): Promise<CatalogListPage<T>> {
    const response = await this.api.client.get<DashboardListBody<T>>(url, { params });
    const body = response.data;
    return {
      data: body.data ?? [],
      page: body.pagination?.page ?? body.page ?? 1,
      limit: body.pagination?.limit ?? body.limit ?? 20,
      total: body.pagination?.total ?? body.total ?? 0,
    };
  }
}
