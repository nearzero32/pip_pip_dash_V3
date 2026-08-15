export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface Governorate {
  _id: string;
  id: string;
  nameAr: string;
  nameEn: string;
  status: 'ACTIVE' | 'INACTIVE';
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface City {
  _id: string;
  id: string;
  governorateId: string;
  nameAr: string;
  nameEn: string;
  latitude: number;
  longitude: number;
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  governorate: {
    id: string;
    nameAr: string;
    nameEn: string;
    status: 'ACTIVE' | 'INACTIVE';
  };
}
