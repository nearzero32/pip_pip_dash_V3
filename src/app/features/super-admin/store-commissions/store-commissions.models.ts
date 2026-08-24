export type StoreCommissionStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface StoreCommission {
  storeId: string;
  storeName: string;
  status: StoreCommissionStatus;
  cityId: string;
  platformCommissionRate: number;
  lastCommissionChangedAt: string | null;
  lastChangedByEmail: string | null;
}

export interface CommissionHistoryItem {
  id: string;
  previousRate: number;
  newRate: number;
  reason: string;
  note: string | null;
  changedByEmail: string | null;
  changedAt: string;
}

export interface CommissionPage<T> { data: T[]; page: number; limit: number; total: number; }
