import { Injectable, inject } from '@angular/core';
import { CatalogService } from '../catalog/catalog.service';
import { MainCategory, Subcategory } from '../catalog/catalog.models';

@Injectable({ providedIn: 'root' })
export class CatalogLookupService {
  private catalog = inject(CatalogService);

  listUsableMainCategories(): Promise<MainCategory[]> {
    return this.catalog.listUsableMainCategories();
  }

  listUsableSubcategories(mainCategoryId: string): Promise<Subcategory[]> {
    return this.catalog.listUsableSubcategories(mainCategoryId);
  }
}
