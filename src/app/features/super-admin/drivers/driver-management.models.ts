export type DriverOperationalStatus =
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CLOSED';

export interface ManagedDriver {
  _id: string;
  accountId: string;
  phone: string;
  cityId: string | null;
  cityName?: string;
  approvalStatus: 'APPROVED';
  operationalStatus: DriverOperationalStatus;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  vehicleDescription: string | null;
  driverName: string | null;
  fatherName: string | null;
  motherName: string | null;
  alternatePhone: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
  driverPhotoObjectKey: string | null;
  driverPhotoAssetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedDriverPage {
  data: ManagedDriver[];
  page: number;
  limit: number;
  total: number;
}
