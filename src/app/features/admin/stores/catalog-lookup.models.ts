export type CatalogStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface CatalogImage {
  readonly assetId: string;
  readonly url: string | null;
}

export interface MainCategory {
  readonly id: string;
  readonly name: string;
  readonly status: CatalogStatus;
  readonly displayOrder: number;
  readonly image: CatalogImage;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

export interface Subcategory {
  readonly id: string;
  readonly mainCategory: { readonly id: string; readonly name: string };
  readonly name: string;
  readonly status: CatalogStatus;
  readonly displayOrder: number;
  readonly image: CatalogImage | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}
