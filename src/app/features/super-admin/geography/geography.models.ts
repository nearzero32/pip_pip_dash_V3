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
  hasBoundary: boolean;
  boundary?: CityBoundary | null;
  governorate: {
    id: string;
    nameAr: string;
    nameEn: string;
    status: 'ACTIVE' | 'INACTIVE';
  };
}

export type GeoJsonPosition = [number, number];
export interface GeoJsonPolygon { type: 'Polygon'; coordinates: GeoJsonPosition[][]; }
export interface GeoJsonMultiPolygon { type: 'MultiPolygon'; coordinates: GeoJsonPosition[][][]; }
export type CityBoundary = GeoJsonPolygon | GeoJsonMultiPolygon;
