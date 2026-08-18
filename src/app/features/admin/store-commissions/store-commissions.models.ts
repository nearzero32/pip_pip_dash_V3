export type StoreCommissionStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface StoreCommission {
  storeId: string;
  storeName: string;
  status: StoreCommissionStatus;
  cityId: string;
  cityNameAr: string;
  platformCommissionRate: number;
  updatedAt: string;
  lastCommissionChangedAt: string | null;
  lastChangedByAccountId: string | null;
  lastChangedByEmail: string | null;
}

export interface CommissionHistoryItem {
  id: string;
  storeId: string;
  storeName: string;
  cityId: string;
  previousRate: number;
  newRate: number;
  reason: string;
  note: string | null;
  changedByAccountId: string;
  changedByEmail: string | null;
  changedAt: string;
}

export interface CommissionPage<T> { data: T[]; page: number; limit: number; total: number; }
