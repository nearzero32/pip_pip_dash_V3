export type ModifierStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type MutableModifierStatus = 'ACTIVE' | 'INACTIVE';

export interface ModifierOption {
  readonly id: string;
  readonly modifierGroupId: string;
  readonly name: string;
  readonly isAvailable: boolean;
  readonly displayOrder: number;
  readonly status: ModifierStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

export interface ModifierGroup {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly minSelect: number;
  readonly maxSelect: number;
  readonly status: ModifierStatus;
  readonly options: ModifierOption[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

export interface ProductModifierOption {
  readonly id: string;
  readonly productId: string;
  readonly modifierOptionId: string;
  readonly name: string;
  readonly price: number;
  readonly isAvailable: boolean;
  readonly isDefault: boolean;
  readonly maxQuantity: number;
  readonly optionIsAvailable: boolean;
  readonly optionStatus: ModifierStatus;
  readonly displayOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProductModifiers {
  readonly productId: string;
  readonly productStatus: string;
  readonly productIsAvailable: boolean;
  readonly modifierGroupId: string | null;
  readonly group: ModifierGroup | null;
  readonly options: ProductModifierOption[];
}

export interface ModifierOptionInput {
  name: string;
  isAvailable?: boolean;
  displayOrder?: number;
  status?: MutableModifierStatus;
}

export interface ModifierGroupCreateBody {
  name: string;
  minSelect?: number;
  maxSelect?: number;
  status?: MutableModifierStatus;
  options: ModifierOptionInput[];
}

export interface ModifierGroupPatch {
  name?: string;
  minSelect?: number;
  maxSelect?: number;
  status?: MutableModifierStatus;
}

export interface ModifierOptionPatch {
  name?: string;
  isAvailable?: boolean;
  displayOrder?: number;
  status?: MutableModifierStatus;
}

export interface ProductModifierUpsert {
  price?: number;
  isAvailable?: boolean;
  isDefault?: boolean;
  maxQuantity?: number;
}

export interface ModifierGroupListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: ModifierStatus;
}

export interface ModifierOptionDraft {
  key: string;
  name: string;
  isAvailable: boolean;
  displayOrder: number;
}

export interface ModifierGroupRow extends ModifierGroup {
  readonly selectionRule: string;
  readonly optionsCount: number;
}

export interface ProductModifierGroupPatch {
  modifierGroupId: string | null;
}

export function toGroupRow(group: ModifierGroup): ModifierGroupRow {
  return {
    ...group,
    selectionRule: `${group.minSelect}–${group.maxSelect}`,
    optionsCount: group.options.length,
  };
}

export function parseNonNegativeIqd(raw: string | number): number | null {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw >= 0 && Number.isSafeInteger(raw) ? raw : null;
  }
  const trimmed = raw.trim().replace(/,/g, '');
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function parsePositiveInt(raw: string | number, min = 1): number | null {
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(value) || value < min || !Number.isSafeInteger(value)) return null;
  return value;
}
