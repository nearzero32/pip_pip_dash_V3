export interface CityAdmin {
  _id: string;
  accountId: string;
  email: string;
  displayName: string | null;
  status: 'INVITED' | 'ACTIVE' | 'DISABLED' | 'CLOSED';
  cityId: string;
  cityName?: string;
  createdAt: string;
  updatedAt: string;
}
