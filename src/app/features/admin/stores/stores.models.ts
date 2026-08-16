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

export interface StoreCreateBody {
  mainCategoryId: string;
  name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  logoAssetId: string;
  coverAssetId?: string;
  displayOrder: number;
  zoneIds: string[];
  subcategoryIds: string[];
  workingHours: WorkingHourPeriod[];
}

export interface StorePatch {
  mainCategoryId?: string;
  name?: string;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  logoAssetId?: string;
  coverAssetId?: string | null;
  displayOrder?: number;
  zoneIds?: string[];
  subcategoryIds?: string[];
  workingHours?: WorkingHourPeriod[];
}

const ARABIC_LETTER = /[\u0600-\u06FF]/;
const LATIN_LETTER = /[A-Za-z]/;
const ALLOWED_STORE_NAME = /^[\u0600-\u06FF0-9\u0660-\u0669\s.,،\-_/()]+$/u;

export function validateStoreName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return 'stores.nameRequired';
  if (name.length > 100) return 'stores.nameTooLong';
  if (LATIN_LETTER.test(name)) return 'stores.nameLatin';
  if (!ARABIC_LETTER.test(name)) return 'stores.nameArabic';
  if (!ALLOWED_STORE_NAME.test(name)) return 'stores.nameChars';
  return null;
}

export function normalizeClock(raw: string): string | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(raw.trim());
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

export function periodsOverlapSameDay(a: WorkingHourPeriod, b: WorkingHourPeriod): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  const toMin = (clock: string): number | null => {
    const normalized = normalizeClock(clock);
    if (!normalized) return null;
    const [h, m] = normalized.split(':');
    return Number(h) * 60 + Number(m);
  };
  const aOpen = toMin(a.opensAt);
  const aClose = toMin(a.closesAt);
  const bOpen = toMin(b.opensAt);
  const bClose = toMin(b.closesAt);
  if (aOpen == null || aClose == null || bOpen == null || bClose == null) return false;
  if (aOpen === aClose || bOpen === bClose) return false;
  const segments = (open: number, close: number): Array<[number, number]> =>
    close > open ? [[open, close]] : [[open, 1440], [0, close]];
  for (const [as, ae] of segments(aOpen, aClose)) {
    for (const [bs, be] of segments(bOpen, bClose)) {
      if (as < be && bs < ae) return true;
    }
  }
  return false;
}

export function validateWorkingHoursDraft(
  periods: readonly WorkingHourPeriod[]
): 'equal' | 'overlap' | 'invalid' | null {
  const normalized: WorkingHourPeriod[] = [];
  for (const period of periods) {
    const opensAt = normalizeClock(period.opensAt);
    const closesAt = normalizeClock(period.closesAt);
    if (!opensAt || !closesAt) return 'invalid';
    if (opensAt === closesAt) return 'equal';
    normalized.push({ dayOfWeek: period.dayOfWeek, opensAt, closesAt });
  }
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      if (periodsOverlapSameDay(normalized[i], normalized[j])) return 'overlap';
    }
  }
  return null;
}

export function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, index) => id === right[index]);
}

export function sameWorkingHours(
  a: readonly WorkingHourPeriod[],
  b: readonly WorkingHourPeriod[]
): boolean {
  if (a.length !== b.length) return false;
  const key = (period: WorkingHourPeriod) =>
    `${period.dayOfWeek}|${normalizeClock(period.opensAt) ?? period.opensAt}|${normalizeClock(period.closesAt) ?? period.closesAt}`;
  const left = [...a].map(key).sort();
  const right = [...b].map(key).sort();
  return left.every((value, index) => value === right[index]);
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
