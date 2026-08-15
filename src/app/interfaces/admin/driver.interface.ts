export interface DriverOrderSummary {
  orderId: string;
  status: string;
  storeName: string;
}

export interface DriverCandidate {
  _id: string;
  driverId: string;
  driverName: string;
  cityId: string;
  eligibilityStatus: 'ELIGIBLE' | 'INELIGIBLE';
  workStatus: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  activeOrderCount: number;
  lastLocation: { latitude: number; longitude: number } | null;
  lastLocationAt: string | null;
  locationFreshness: 'FRESH' | 'STALE' | 'MISSING';
  currentOrderSummary: DriverOrderSummary | null;
  nextOrderSummary: DriverOrderSummary | null;
}

export interface DriverCandidatePage {
  data: DriverCandidate[];
  page: number;
  limit: number;
  total: number;
}
