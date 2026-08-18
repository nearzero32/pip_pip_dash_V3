export type MerchantStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Merchant {
  accountId: string;
  phone: string;
  displayName: string | null;
  status: MerchantStatus;
  storeId: string;
  storeName: string | null;
  cityId: string;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
}

export interface MerchantPage {
  data: Merchant[];
  page: number;
  limit: number;
  total: number;
}
