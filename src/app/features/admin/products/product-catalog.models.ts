export type StoreCategoryStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type MutableCatalogStatus = 'ACTIVE' | 'INACTIVE';

export type ProductWeekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export const PRODUCT_WEEKDAYS: readonly ProductWeekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export interface StoreCategory {
  readonly id: string;
  readonly storeId: string;
  readonly parentCategoryId: string | null;
  readonly name: string;
  readonly status: StoreCategoryStatus;
  readonly displayOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

export interface StoreCategoryCreateBody {
  name: string;
  parentCategoryId?: string | null;
  status?: MutableCatalogStatus;
  displayOrder?: number;
}

export interface StoreCategoryPatch {
  name?: string;
  parentCategoryId?: string | null;
  status?: MutableCatalogStatus;
  displayOrder?: number;
}

export interface StoreCategoryListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: StoreCategoryStatus;
  parentCategoryId?: string | 'null';
}

export interface ProductImage {
  readonly id: string;
  readonly assetId: string;
  readonly url: string | null;
  readonly isPrimary: boolean;
  readonly displayOrder: number;
}

export interface ProductSize {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly status: StoreCategoryStatus;
  readonly isAvailable: boolean;
  readonly isDefault: boolean;
  readonly displayOrder: number;
  readonly archivedAt: string | null;
}

export interface ProductAvailabilityWindow {
  readonly id: string;
  readonly dayOfWeek: ProductWeekday;
  readonly opensAt: string;
  readonly closesAt: string;
}

export interface Product {
  readonly id: string;
  readonly storeId: string;
  readonly categoryId: string | null;
  readonly modifierGroupId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly basePrice: number | null;
  readonly status: StoreCategoryStatus;
  readonly isAvailable: boolean;
  readonly displayOrder: number;
  readonly images: ProductImage[];
  readonly sizes: ProductSize[];
  readonly availability: ProductAvailabilityWindow[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

export interface ProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: StoreCategoryStatus;
  /** UUID, or literal `null` for uncategorized */
  categoryId?: string;
}

export interface ProductStatusPatch {
  status: MutableCatalogStatus;
}

export interface ProductAvailabilityFlagPatch {
  isAvailable: boolean;
}

export interface ProductImageInput {
  assetId: string;
  isPrimary: boolean;
  displayOrder?: number;
}

export interface ProductSizeCreateInput {
  name: string;
  price: number;
  isDefault: boolean;
  isAvailable?: boolean;
  status?: MutableCatalogStatus;
  displayOrder?: number;
  transitionFromBasePrice?: boolean;
}

export interface ProductSizePatch {
  name?: string;
  price?: number;
  isDefault?: boolean;
  isAvailable?: boolean;
  status?: MutableCatalogStatus;
  displayOrder?: number;
  replacementDefaultSizeId?: string;
}

export interface ProductSizeArchiveBody {
  replacementDefaultSizeId?: string;
  basePrice?: number;
}

export interface ProductAvailabilityInput {
  dayOfWeek: ProductWeekday;
  opensAt: string;
  closesAt: string;
}

export interface ProductCreateBody {
  name: string;
  description?: string | null;
  categoryId?: string | null;
  basePrice?: number | null;
  displayOrder?: number;
  images: ProductImageInput[];
  sizes?: ProductSizeCreateInput[];
  availability?: ProductAvailabilityInput[];
}

export interface ProductCorePatch {
  name?: string;
  description?: string | null;
  categoryId?: string | null;
  basePrice?: number;
  displayOrder?: number;
}

export type ProductPricingMode = 'base' | 'sizes';

export interface ProductImageDraft {
  key: string;
  assetId: string | null;
  file: File | null;
  previewUrl: string | null;
  isPrimary: boolean;
  isNew: boolean;
}

export interface ProductSizeDraft {
  key: string;
  name: string;
  price: string;
  isDefault: boolean;
  isAvailable: boolean;
  status: MutableCatalogStatus;
  displayOrder: number;
}

const CLOCK_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export function parseIqdInteger(raw: string | number): number | null {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw > 0 && Number.isSafeInteger(raw) ? raw : null;
  }
  const trimmed = raw.trim().replace(/,/g, '');
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function liveSizes(product: Product): ProductSize[] {
  return product.sizes.filter((size) => size.status !== 'ARCHIVED');
}

export function isSizedProduct(product: Product): boolean {
  return product.basePrice == null && liveSizes(product).length > 0;
}

export function normalizeProductClock(raw: string): string | null {
  const match = CLOCK_RE.exec(raw.trim());
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

function clockMinutes(raw: string): number | null {
  const normalized = normalizeProductClock(raw);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function validateProductAvailability(
  windows: readonly ProductAvailabilityInput[]
): 'invalid' | 'overnight' | 'overlap' | null {
  const normalized: Array<ProductAvailabilityInput & { open: number; close: number }> = [];
  for (const window of windows) {
    const open = clockMinutes(window.opensAt);
    const close = clockMinutes(window.closesAt);
    if (open == null || close == null) return 'invalid';
    if (close <= open) return 'overnight';
    normalized.push({
      dayOfWeek: window.dayOfWeek,
      opensAt: window.opensAt,
      closesAt: window.closesAt,
      open,
      close,
    });
  }
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const a = normalized[i];
      const b = normalized[j];
      if (a.dayOfWeek !== b.dayOfWeek) continue;
      if (a.open < b.close && b.open < a.close) return 'overlap';
    }
  }
  return null;
}

export function categoryOptionLabel(category: StoreCategory): string {
  const prefix = category.parentCategoryId ? '\u2003' : '';
  return `${prefix}${category.name}`;
}

export interface CatalogListPage<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface StoreCategoryRow extends StoreCategory {
  readonly level: 0 | 1;
  readonly hierarchyLabel: string;
  readonly displayName: string;
}

export interface ProductRow extends Product {
  readonly primaryImageUrl: string | null;
  readonly categoryLabel: string;
  readonly pricingLabel: string;
  readonly availableLabel: string;
}

export function primaryImageUrl(product: Product): string | null {
  const primary = product.images.find((image) => image.isPrimary);
  return primary?.url ?? product.images[0]?.url ?? null;
}

export function toStoreCategoryRows(categories: readonly StoreCategory[]): StoreCategoryRow[] {
  const roots = categories
    .filter((item) => item.parentCategoryId == null)
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  const childrenOf = (parentId: string) =>
    categories
      .filter((item) => item.parentCategoryId === parentId)
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  const rows: StoreCategoryRow[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    seen.add(root.id);
    rows.push({
      ...root,
      level: 0,
      hierarchyLabel: 'products.storeRoot',
      displayName: root.name,
    });
    for (const child of childrenOf(root.id)) {
      seen.add(child.id);
      rows.push({
        ...child,
        level: 1,
        hierarchyLabel: 'products.storeChild',
        displayName: `\u2003${child.name}`,
      });
    }
  }
  for (const item of categories) {
    if (seen.has(item.id)) continue;
    const level: 0 | 1 = item.parentCategoryId ? 1 : 0;
    rows.push({
      ...item,
      level,
      hierarchyLabel: level ? 'products.storeChild' : 'products.storeRoot',
      displayName: level ? `\u2003${item.name}` : item.name,
    });
  }
  return rows;
}
