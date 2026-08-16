export type StoreStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type MutableStoreStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type OrderAcceptanceStatus = 'ACCEPTING' | 'PAUSED';

export type Weekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export const WEEKDAYS: readonly Weekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export interface StoreMedia {
  readonly assetId: string;
  readonly url: string | null;
}

export interface StoreLocation {
  readonly latitude: number;
  readonly longitude: number;
}

export interface StoreMainCategory {
  readonly id: string;
  readonly name: string;
}

export interface WorkingHourPeriod {
  readonly dayOfWeek: Weekday;
  readonly opensAt: string;
  readonly closesAt: string;
}

export interface StoreAvailability {
  readonly isOpen: boolean;
  readonly isAcceptingOrders: boolean;
  readonly nextOpeningAt: string | null;
  readonly nextClosingAt: string | null;
}

export interface Store {
  readonly id: string;
  readonly mainCategory: StoreMainCategory;
  readonly name: string;
  readonly phone: string;
  readonly address: string;
  readonly location: StoreLocation;
  readonly logo: StoreMedia | null;
  readonly cover: StoreMedia | null;
  readonly status: StoreStatus;
  readonly orderAcceptanceStatus: OrderAcceptanceStatus;
  readonly displayOrder: number;
  readonly zoneIds: string[];
  readonly subcategoryIds: string[];
  readonly workingHours: WorkingHourPeriod[];
  readonly availability: StoreAvailability;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

/** Table display fields derived from the Store DTO. Never PATCHed. */
export interface StoreRow extends Store {
  readonly serviceZoneCount: number;
  readonly scheduleState: 'OPEN' | 'CLOSED';
}

export interface StoreListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: StoreStatus;
  zoneId?: string;
}

export interface StoreListPage {
  data: Store[];
  page: number;
  limit: number;
  total: number;
}

export interface StoreStatusPatch {
  status: MutableStoreStatus;
}

export interface StoreAcceptancePatch {
  orderAcceptanceStatus: OrderAcceptanceStatus;
}

export interface StoreZoneIdsPatch {
  zoneIds: string[];
}

export function toStoreRow(store: Store): StoreRow {
  return {
    ...store,
    serviceZoneCount: store.zoneIds.length,
    scheduleState: store.availability.isOpen ? 'OPEN' : 'CLOSED',
  };
}

export function isOvernightPeriod(period: WorkingHourPeriod): boolean {
  return period.closesAt < period.opensAt;
}

export function groupWorkingHours(
  hours: readonly WorkingHourPeriod[],
): { day: Weekday; periods: WorkingHourPeriod[] }[] {
  return WEEKDAYS.map((day) => ({
    day,
    periods: hours.filter((period) => period.dayOfWeek === day),
  }));
}
