export type OrderStatus =
  | 'PENDING_STORE_APPROVAL'
  | 'APPROVED_BY_STORE'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'READY_FOR_PICKUP'
  | 'ARRIVED_AT_STORE'
  | 'ACCEPTED_BY_DRIVER'
  | 'PICKED_UP'
  | 'ARRIVED_AT_CUSTOMER'
  | 'DELIVERED'
  | 'CANCELLED';

export type CustodyStatus = 'WITH_STORE' | 'WITH_DRIVER' | 'WITH_CUSTOMER';
export type PaymentMethod = 'CASH' | 'ONLINE';
export type PaymentStatus = 'UNPAID' | 'AWAITING_PAYMENT' | 'PAID' | 'FAILED';
export type OrderItemState = 'ACTIVE' | 'REPLACED' | 'REMOVED';
export type OrderCurrency = 'IQD';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING_STORE_APPROVAL',
  'APPROVED_BY_STORE',
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'READY_FOR_PICKUP',
  'ARRIVED_AT_STORE',
  'ACCEPTED_BY_DRIVER',
  'PICKED_UP',
  'ARRIVED_AT_CUSTOMER',
  'DELIVERED',
  'CANCELLED',
];

export const TERMINAL_STATUSES: readonly OrderStatus[] = ['DELIVERED', 'CANCELLED'];

export interface OrderSummary {
  readonly id: string;
  readonly orderNumber: string;
  readonly cityId: string;
  readonly zoneId: string;
  readonly storeId: string;
  readonly customerAccountId: string;
  readonly status: OrderStatus;
  readonly custodyStatus: CustodyStatus;
  readonly custodyDriverId: string | null;
  readonly paymentMethod: PaymentMethod;
  readonly paymentStatus: PaymentStatus;
  readonly productsSubtotal: number;
  readonly deliveryFee: number;
  readonly total: number;
  readonly currency: OrderCurrency;
  readonly storeCommissionRateSnapshot?: number;
  readonly version: number;
  readonly statusChangedAt: string;
  readonly deliveredAt: string | null;
  readonly cancelledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrderModifierSnapshot {
  readonly modifierOptionId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export interface OrderItemSnapshot {
  readonly id: string;
  readonly productId: string;
  readonly selectedSizeId: string | null;
  readonly productName: string;
  readonly selectedSizeName: string | null;
  readonly unitPrice: number;
  readonly modifiersPrice: number;
  readonly quantity: number;
  readonly lineTotal: number;
  readonly state: OrderItemState;
  readonly replacesOrderItemId: string | null;
  readonly modifierSelections: OrderModifierSnapshot[];
  readonly createdAt: string;
}

export interface OrderAddressSnapshot {
  readonly label: string | null;
  readonly addressDetails: string | null;
  readonly landmark: string | null;
  readonly recipientName: string | null;
  readonly recipientPhone: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly sourceAddressId: string | null;
}

export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

export interface OrderDeliveryPricingSnapshot {
  readonly pricingVersionId: string | null;
  readonly pricingVersionNumber: number | null;
  readonly routingProvider: string | null;
  readonly distanceSource: string | null;
  readonly fallbackReason: string | null;
  readonly distanceMeters: number | null;
  readonly durationSeconds: number | null;
  readonly deliveryFee: number;
  readonly zoneId: string | null;
  readonly origin: GeoPoint | null;
  readonly destination: GeoPoint | null;
  readonly calculatedAt: string | null;
}

export interface OrderStatusHistoryEntry {
  readonly id: string;
  readonly fromStatus: string | null;
  readonly toStatus: string | null;
  readonly enteredAt: string | null;
  readonly exitedAt: string | null;
  readonly durationSeconds: number | null;
  readonly changedByAccountId: string | null;
  readonly actorType: string | null;
  readonly source: string | null;
  readonly reason: string | null;
  readonly createdAt: string | null;
}

export interface OrderEvent {
  readonly id: string;
  readonly assignmentId: string | null;
  readonly eventType: string;
  readonly fromOrderStatus: string | null;
  readonly toOrderStatus: string | null;
  readonly fromCustodyStatus: string | null;
  readonly toCustodyStatus: string | null;
  readonly actorType: string | null;
  readonly actorAccountId: string | null;
  readonly source: string | null;
  readonly actedOnBehalfOf: string | null;
  readonly reason: string | null;
  readonly proofId: string | null;
  readonly createdAt: string | null;
}

export interface OrderCustodyHistoryEntry {
  readonly id: string;
  readonly assignmentId: string | null;
  readonly fromStatus: string | null;
  readonly toStatus: string | null;
  readonly fromDriverId: string | null;
  readonly toDriverId: string | null;
  readonly actorAccountId: string | null;
  readonly actorType: string | null;
  readonly source: string | null;
  readonly reason: string | null;
  readonly createdAt: string | null;
}

export interface OrderAssignment {
  readonly id: string;
  readonly driverId: string | null;
  readonly offerRoundId: string | null;
  readonly assignmentSource: string | null;
  readonly status: string | null;
  readonly assignmentSequence: number | null;
  readonly assignedByAccountId: string | null;
  readonly assignmentReason: string | null;
  readonly driverFee: number | null;
  readonly assignedAt: string | null;
  readonly arrivedAtStoreAt: string | null;
  readonly pickedUpAt: string | null;
  readonly arrivedAtCustomerAt: string | null;
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
}

export interface OrderProof {
  readonly id: string;
  readonly assignmentId: string | null;
  readonly mediaAssetId: string | null;
  readonly purpose: string | null;
  readonly uploadedByDriverId: string | null;
  readonly consumedAt: string | null;
  readonly consumedByEventId: string | null;
  readonly createdAt: string | null;
}

export interface OrderCancellation {
  readonly id: string;
  readonly previousStatus: string | null;
  readonly actorAccountId: string | null;
  readonly actorType: string | null;
  readonly source: string | null;
  readonly reason: string | null;
  readonly createdAt: string | null;
}

export interface OrderCollection {
  readonly expectedAmount: number;
  readonly collectedAmount: number;
  readonly differenceAmount: number;
  readonly currency: OrderCurrency;
  readonly assignmentId: string;
  readonly collectingDriverId: string;
  readonly confirmationSource: string;
  readonly collectedAt: string;
}

export interface OrderDetail extends OrderSummary {
  readonly items: OrderItemSnapshot[];
  readonly statusHistory: OrderStatusHistoryEntry[];
  readonly addressSnapshot: OrderAddressSnapshot | null;
  readonly deliveryPricingSnapshot: OrderDeliveryPricingSnapshot | null;
  readonly cancellation: OrderCancellation | null;
  readonly events: OrderEvent[];
  readonly custodyHistory: OrderCustodyHistoryEntry[];
  readonly proofs: OrderProof[];
  readonly assignments: OrderAssignment[];
  readonly storeReadyMarkedAt: string | null;
  readonly arrivedAtStoreAt: string | null;
  readonly collection: OrderCollection | null;
  readonly expectedCollectionAmount: number | null;
}

export interface OrderListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  storeId?: string;
  custodyStatus?: CustodyStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  createdFrom?: string;
  createdTo?: string;
  hasActiveHandoff?: boolean;
  hasActiveReturn?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'deliveredAt' | 'status' | 'total' | 'orderNumber';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderListPage {
  data: OrderSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface OrderRow extends OrderSummary {
  readonly storeLabel: string;
  readonly totalLabel: string;
  readonly paymentLabel: string;
}

export type OrderCommandAction = 'approve' | 'cancel';

export interface PendingOrderCommand {
  action: OrderCommandAction;
  orderId: string;
  idempotencyKey: string;
  payload?: { reason: string; note?: string };
}

export function createOrderCommandKey(): string {
  return crypto.randomUUID();
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return status === 'DELIVERED' || status === 'CANCELLED';
}

export function canApprove(status: OrderStatus): boolean {
  return status === 'PENDING_STORE_APPROVAL';
}

export function canCancel(status: OrderStatus): boolean {
  return !isTerminalStatus(status);
}

export function isActiveAssignment(row: OrderAssignment): boolean {
  return row.cancelledAt == null && row.completedAt == null;
}
