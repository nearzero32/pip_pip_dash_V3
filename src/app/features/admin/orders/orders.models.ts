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

export type OrderLifecycleAction =
  | 'markReady'
  | 'arrivalAtStore'
  | 'pickup'
  | 'arrivalAtCustomer'
  | 'delivery';

export type OrderCommandAction =
  | 'approve'
  | 'cancel'
  | 'itemAdd'
  | 'itemQuantity'
  | 'itemRemove'
  | 'itemReplace'
  | OrderLifecycleAction
  | 'assignDriver'
  | 'removeDriver'
  | 'reofferAfterPickup'
  | 'handoffStart'
  | 'handoffCancel'
  | 'handoffComplete'
  | 'returnStart'
  | 'returnConfirmDriver'
  | 'returnConfirmStore'
  | 'reopen';

export interface OrderOpsAssignment {
  readonly id: string;
  readonly driverId: string;
  readonly status: string;
  readonly assignmentSource: string | null;
  readonly assignmentSequence: number;
  readonly assignmentReason: string | null;
  readonly driverFee: number;
  readonly offerRoundId: string | null;
  readonly assignedAt: string | null;
  readonly arrivedAtStoreAt: string | null;
  readonly pickedUpAt: string | null;
  readonly arrivedAtCustomerAt: string | null;
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
}

export interface OrderOpsHandoff {
  readonly id: string;
  readonly status: string;
  readonly fromAssignmentId: string;
  readonly toAssignmentId: string;
  readonly fromDriverId: string;
  readonly toDriverId: string;
  readonly reason: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
}

export interface OrderOpsReturnWorkflow {
  readonly id: string;
  readonly status: string;
  readonly assignmentId: string;
  readonly driverId: string;
  readonly reason: string;
  readonly startedAt: string | null;
  readonly driverReturnedAt: string | null;
  readonly storeConfirmedAt: string | null;
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
}

export interface OrderOpsOpenOfferRound {
  readonly id: string;
  readonly status: string;
  readonly roundKind: string;
  readonly openedAt: string | null;
  readonly pricingVersionSnapshot: number;
  readonly finalDriverFee: number | null;
}

export interface OrderOpsSnapshot {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly status: string;
  readonly custodyStatus: string;
  readonly custodyDriverId: string | null;
  readonly driverAccountId: string | null;
  readonly lockedDriverFee: number | null;
  readonly storeReadyMarkedAt: string | null;
  readonly version: number;
  readonly statusChangedAt: string | null;
  readonly cancelledAt: string | null;
  readonly assignments: OrderOpsAssignment[];
  readonly handoff: OrderOpsHandoff | null;
  readonly returnWorkflow: OrderOpsReturnWorkflow | null;
  readonly openOfferRound: OrderOpsOpenOfferRound | null;
}

export interface OrderAssignDriverBody {
  driverId: string;
  reason?: string;
}

export interface OrderRemoveDriverBody {
  reason: string;
  note?: string;
  nextAction: 'REOFFER' | 'ASSIGN_DRIVER';
  driverId?: string;
}

export interface OrderHandoffStartBody {
  driverId: string;
  reason: string;
  note?: string;
}

export interface OrderHandoffCompleteBody {
  reason: string;
  note?: string;
  actedOnBehalfOf: 'DRIVER';
}

export interface OrderReopenBody {
  reason: string;
  note?: string;
  nextAction: 'KEEP_CANCELLED' | 'PREPARE' | 'REOFFER' | 'ASSIGN_DRIVER';
  driverId?: string;
}

export interface OrderReasonNoteBody {
  reason: string;
  note?: string;
}

export interface OrderModifierSelectionInput {
  modifierOptionId: string;
  quantity: number;
}

export interface OrderAddItemBody {
  productId: string;
  sizeId?: string | null;
  quantity: number;
  modifierSelections?: OrderModifierSelectionInput[];
  reason: string;
}

export interface OrderReplaceItemBody extends OrderAddItemBody {
  customerAgreedByPhone: true;
}

export interface OrderChangeQuantityBody {
  quantity: number;
  reason: string;
}

export interface OrderMutationReasonBody {
  reason: string;
}

export interface OrderLifecycleOverrideBody {
  reason: string;
  note?: string;
  actedOnBehalfOf: 'STORE' | 'DRIVER';
}

export interface OrderArrivalAtStoreBody {
  reason: string;
  note?: string;
}

export interface OrderDeliveryOverrideBody {
  collectedAmount: number;
  reason: string;
  note?: string;
  actedOnBehalfOf: 'DRIVER';
}

export type OrderCommandPayload =
  | { reason: string; note?: string }
  | OrderAddItemBody
  | OrderReplaceItemBody
  | OrderChangeQuantityBody
  | OrderMutationReasonBody
  | OrderLifecycleOverrideBody
  | OrderArrivalAtStoreBody
  | OrderDeliveryOverrideBody
  | OrderAssignDriverBody
  | OrderRemoveDriverBody
  | OrderHandoffStartBody
  | OrderHandoffCompleteBody
  | OrderReopenBody
  | OrderReasonNoteBody;

export interface PendingOrderCommand {
  action: OrderCommandAction;
  orderId: string;
  itemId?: string;
  idempotencyKey: string;
  payload?: OrderCommandPayload;
}

export const COLLECTION_AMOUNT_MAX = 99_999_999;

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

export function canMutateOrderItems(status: OrderStatus): boolean {
  return (
    status === 'PENDING_STORE_APPROVAL' ||
    status === 'APPROVED_BY_STORE' ||
    status === 'SEARCHING_DRIVER' ||
    status === 'DRIVER_ASSIGNED'
  );
}

export function canMutateOrderItemsPayment(order: OrderSummary): boolean {
  return order.paymentMethod === 'CASH' || order.paymentStatus === 'PAID';
}

export function activeAssignmentOf(order: OrderDetail): OrderAssignment | null {
  return order.assignments.find((row) => isActiveAssignment(row)) ?? null;
}

export function canMarkReady(order: OrderDetail): boolean {
  return (
    activeAssignmentOf(order) != null &&
    order.storeReadyMarkedAt == null &&
    (order.status === 'DRIVER_ASSIGNED' || order.status === 'ARRIVED_AT_STORE')
  );
}

export function canConfirmArrivalAtStore(order: OrderDetail): boolean {
  return (
    activeAssignmentOf(order) != null &&
    order.custodyStatus === 'WITH_STORE' &&
    order.arrivedAtStoreAt == null &&
    (order.status === 'DRIVER_ASSIGNED' || order.status === 'READY_FOR_PICKUP')
  );
}

export function canConfirmPickup(order: OrderDetail): boolean {
  return (
    order.status === 'ARRIVED_AT_STORE' &&
    order.storeReadyMarkedAt != null &&
    order.arrivedAtStoreAt != null &&
    activeAssignmentOf(order) != null
  );
}

export function canConfirmArrivalAtCustomer(order: OrderDetail): boolean {
  return order.status === 'PICKED_UP' && activeAssignmentOf(order) != null;
}

export function canConfirmDelivery(order: OrderDetail): boolean {
  return (
    order.status === 'ARRIVED_AT_CUSTOMER' &&
    order.custodyStatus === 'WITH_DRIVER' &&
    activeAssignmentOf(order) != null &&
    order.collection == null
  );
}

export function primaryLifecycleAction(order: OrderDetail): OrderLifecycleAction | null {
  if (canConfirmDelivery(order)) return 'delivery';
  if (canConfirmArrivalAtCustomer(order)) return 'arrivalAtCustomer';
  if (canConfirmPickup(order)) return 'pickup';
  if (canConfirmArrivalAtStore(order)) return 'arrivalAtStore';
  if (canMarkReady(order)) return 'markReady';
  return null;
}

export function secondaryLifecycleActions(order: OrderDetail): OrderLifecycleAction[] {
  const primary = primaryLifecycleAction(order);
  const eligible: OrderLifecycleAction[] = [];
  if (canMarkReady(order)) eligible.push('markReady');
  if (canConfirmArrivalAtStore(order)) eligible.push('arrivalAtStore');
  if (canConfirmPickup(order)) eligible.push('pickup');
  if (canConfirmArrivalAtCustomer(order)) eligible.push('arrivalAtCustomer');
  if (canConfirmDelivery(order)) eligible.push('delivery');
  return eligible.filter((action) => action !== primary);
}

export function isOpsActiveAssignment(row: OrderOpsAssignment): boolean {
  return row.cancelledAt == null && row.completedAt == null;
}

export function custodyAssignmentOf(ops: OrderOpsSnapshot): OrderOpsAssignment | null {
  return (
    ops.assignments.find(
      (row) =>
        isOpsActiveAssignment(row) &&
        row.status !== 'HANDOFF_PENDING' &&
        (ops.custodyDriverId == null || row.driverId === ops.custodyDriverId)
    ) ??
    ops.assignments.find((row) => isOpsActiveAssignment(row) && row.status !== 'HANDOFF_PENDING') ??
    null
  );
}

export function pendingHandoffOf(ops: OrderOpsSnapshot): OrderOpsHandoff | null {
  return ops.handoff?.status === 'PENDING' ? ops.handoff : null;
}

export function activeReturnOf(ops: OrderOpsSnapshot): OrderOpsReturnWorkflow | null {
  const status = ops.returnWorkflow?.status;
  if (status === 'WAITING_FOR_DRIVER_RETURN' || status === 'WAITING_FOR_STORE_CONFIRMATION') {
    return ops.returnWorkflow;
  }
  return null;
}

export function completedReturnOf(ops: OrderOpsSnapshot): OrderOpsReturnWorkflow | null {
  return ops.returnWorkflow?.status === 'COMPLETED' ? ops.returnWorkflow : null;
}

export function isReplacementSearch(ops: OrderOpsSnapshot): boolean {
  return ops.openOfferRound?.status === 'OPEN' && ops.openOfferRound.roundKind === 'DRIVER_REPLACEMENT';
}

export function isInitialSearch(ops: OrderOpsSnapshot): boolean {
  return ops.openOfferRound?.status === 'OPEN' && ops.openOfferRound.roundKind === 'INITIAL';
}

export function canManualAssign(ops: OrderOpsSnapshot): boolean {
  if (custodyAssignmentOf(ops)) return false;
  if (pendingHandoffOf(ops) || activeReturnOf(ops)) return false;
  return ops.status === 'APPROVED_BY_STORE' || ops.status === 'SEARCHING_DRIVER';
}

export function canRemoveDriver(ops: OrderOpsSnapshot): boolean {
  if (ops.custodyStatus !== 'WITH_STORE') return false;
  if (!custodyAssignmentOf(ops)) return false;
  return (
    ops.status === 'DRIVER_ASSIGNED' ||
    ops.status === 'READY_FOR_PICKUP' ||
    ops.status === 'ARRIVED_AT_STORE'
  );
}

export function canPostPickupReoffer(ops: OrderOpsSnapshot): boolean {
  if (pendingHandoffOf(ops) || activeReturnOf(ops) || isReplacementSearch(ops)) return false;
  return (
    ops.custodyStatus === 'WITH_DRIVER' &&
    !!custodyAssignmentOf(ops) &&
    (ops.status === 'PICKED_UP' || ops.status === 'ARRIVED_AT_CUSTOMER')
  );
}

export function canStartHandoff(ops: OrderOpsSnapshot): boolean {
  return canPostPickupReoffer(ops);
}

export function canStartReturn(ops: OrderOpsSnapshot): boolean {
  if (activeReturnOf(ops)) return false;
  return (
    ops.custodyStatus === 'WITH_DRIVER' &&
    !!custodyAssignmentOf(ops) &&
    (ops.status === 'PICKED_UP' || ops.status === 'ARRIVED_AT_CUSTOMER')
  );
}

export function canReopen(ops: OrderOpsSnapshot): boolean {
  if (ops.custodyStatus !== 'WITH_STORE') return false;
  if (activeReturnOf(ops)) return false;
  if (ops.status === 'CANCELLED') return true;
  return ops.status === 'READY_FOR_PICKUP' && completedReturnOf(ops) != null;
}

export type RecoveryFocus =
  | 'return'
  | 'handoff'
  | 'replacementSearch'
  | 'removeDriver'
  | 'postPickup'
  | 'assign'
  | 'reopen'
  | null;

export function recoveryFocusOf(ops: OrderOpsSnapshot): RecoveryFocus {
  if (activeReturnOf(ops)) return 'return';
  if (pendingHandoffOf(ops)) return 'handoff';
  if (isReplacementSearch(ops)) return 'replacementSearch';
  if (canRemoveDriver(ops)) return 'removeDriver';
  if (canPostPickupReoffer(ops) || canStartReturn(ops)) return 'postPickup';
  if (canManualAssign(ops)) return 'assign';
  if (canReopen(ops)) return 'reopen';
  return null;
}
