export type CatalogStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type MutableCatalogStatus = 'ACTIVE' | 'INACTIVE';

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

export interface CatalogListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CatalogStatus;
  mainCategoryId?: string;
}

export interface CatalogListPage<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface MainCategoryCreateBody {
  name: string;
  imageAssetId: string;
  status?: MutableCatalogStatus;
  displayOrder?: number;
}

export interface MainCategoryPatch {
  name?: string;
  imageAssetId?: string;
  status?: MutableCatalogStatus;
  displayOrder?: number;
}

export interface SubcategoryCreateBody {
  mainCategoryId: string;
  name: string;
  imageAssetId?: string;
  status?: MutableCatalogStatus;
  displayOrder?: number;
}

export interface SubcategoryPatch {
  mainCategoryId?: string;
  name?: string;
  imageAssetId?: string | null;
  status?: MutableCatalogStatus;
  displayOrder?: number;
}

const ARABIC_LETTER = /[\u0600-\u06FF]/;
const LATIN_LETTER = /[A-Za-z]/;
const ALLOWED_NAME = /^[\u0600-\u06FF0-9\u0660-\u0669\s.,،\-_/()]+$/u;

export function validateArabicCatalogName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return 'catalog.nameRequired';
  if (name.length > 100) return 'catalog.nameTooLong';
  if (LATIN_LETTER.test(name)) return 'catalog.nameLatin';
  if (!ARABIC_LETTER.test(name)) return 'catalog.nameArabic';
  if (!ALLOWED_NAME.test(name)) return 'catalog.nameChars';
  return null;
}
