import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import { HTTP_CONFIG } from '../../../core/http/http.config';
import {
  CustodyStatus,
  OrderAddressSnapshot,
  OrderAssignment,
  OrderCancellation,
  OrderCollection,
  OrderDeliveryPricingSnapshot,
  OrderDetail,
  OrderEvent,
  OrderCustodyHistoryEntry,
  OrderItemSnapshot,
  OrderListPage,
  OrderListQuery,
  OrderModifierSnapshot,
  OrderProof,
  OrderStatusHistoryEntry,
  OrderSummary,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  OrderAddItemBody,
  OrderReplaceItemBody,
  OrderChangeQuantityBody,
  OrderLifecycleOverrideBody,
  OrderArrivalAtStoreBody,
  OrderDeliveryOverrideBody,
} from './orders.models';

interface DashboardListBody<T> {
  data: T[];
  pagination?: { page: number; limit: number; total: number };
  page?: number;
  limit?: number;
  total?: number;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private api = inject(ApiService);

  async list(query: OrderListQuery = {}): Promise<OrderListPage> {
    const response = await this.api.client.get<DashboardListBody<OrderSummary>>(
      '/api/v1/dashboard/orders',
      { params: this.toParams(query) }
    );
    const body = response.data;
    return {
      data: (body.data ?? []).map((row) => this.mapSummary(row)),
      page: body.pagination?.page ?? body.page ?? 1,
      limit: body.pagination?.limit ?? body.limit ?? 20,
      total: body.pagination?.total ?? body.total ?? 0,
    };
  }

  async get(orderId: string): Promise<OrderDetail> {
    const response = await this.api.client.get<Record<string, unknown>>(
      `/api/v1/dashboard/orders/${orderId}`
    );
    return this.mapDetail(response.data);
  }

  async exportExcel(query: OrderListQuery): Promise<Blob> {
    const response = await this.api.client.get<Blob>('/api/v1/dashboard/orders/export', {
      params: this.toParams({ ...query, page: undefined, limit: undefined }),
      responseType: 'blob',
      timeout: HTTP_CONFIG.LONG_TIMEOUT,
    });
    return response.data;
  }

  async approve(orderId: string, idempotencyKey: string): Promise<OrderDetail> {
    const response = await this.api.client.post<Record<string, unknown>>(
      `/api/v1/dashboard/orders/${orderId}/approve`,
      {},
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return this.mapDetail(response.data);
  }

  async cancel(
    orderId: string,
    body: { reason: string; note?: string },
    idempotencyKey: string
  ): Promise<OrderDetail> {
    const response = await this.api.client.post<Record<string, unknown>>(
      `/api/v1/dashboard/orders/${orderId}/cancel`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return this.mapDetail(response.data);
  }

  async addItem(orderId: string, body: OrderAddItemBody, idempotencyKey: string): Promise<OrderDetail> {
    const response = await this.api.client.post<Record<string, unknown>>(
      `/api/v1/dashboard/orders/${orderId}/items`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return this.mapDetail(response.data);
  }

  async changeQuantity(
    orderId: string,
    itemId: string,
    body: OrderChangeQuantityBody,
    idempotencyKey: string
  ): Promise<OrderDetail> {
    const response = await this.api.client.post<Record<string, unknown>>(
      `/api/v1/dashboard/orders/${orderId}/items/${itemId}/quantity`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return this.mapDetail(response.data);
  }

  async removeItem(
    orderId: string,
    itemId: string,
    body: { reason: string },
    idempotencyKey: string
  ): Promise<OrderDetail> {
    const response = await this.api.client.post<Record<string, unknown>>(
      `/api/v1/dashboard/orders/${orderId}/items/${itemId}/remove`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return this.mapDetail(response.data);
  }

  async replaceItem(
    orderId: string,
    itemId: string,
    body: OrderReplaceItemBody,
    idempotencyKey: string
  ): Promise<OrderDetail> {
    const response = await this.api.client.post<Record<string, unknown>>(
      `/api/v1/dashboard/orders/${orderId}/items/${itemId}/replace`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return this.mapDetail(response.data);
  }

  async markReady(
    orderId: string,
    body: OrderLifecycleOverrideBody,
    idempotencyKey: string
  ): Promise<OrderDetail> {
    const response = await this.api.client.post<Record<string, unknown>>(
      `/api/v1/dashboard/orders/${orderId}/mark-ready`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return this.mapDetail(response.data);
  }

  async confirmArrivalAtStore(
    orderId: string,
    body: OrderArrivalAtStoreBody,
    idempotencyKey: string
  ): Promise<OrderDetail> {
    const response = await this.api.client.post<Record<string, unknown>>(
      `/api/v1/dashboard/orders/${orderId}/confirm-arrival-at-store`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return this.mapDetail(response.data);
  }

  async confirmPickup(
    orderId: string,
    body: OrderLifecycleOverrideBody,
    idempotencyKey: string
  ): Promise<OrderDetail> {
    const response = await this.api.client.post<Record<string, unknown>>(
      `/api/v1/dashboard/orders/${orderId}/confirm-pickup`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return this.mapDetail(response.data);
  }

  async confirmArrivalAtCustomer(
    orderId: string,
    body: OrderLifecycleOverrideBody,
    idempotencyKey: string
  ): Promise<OrderDetail> {
    const response = await this.api.client.post<Record<string, unknown>>(
      `/api/v1/dashboard/orders/${orderId}/confirm-arrival`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return this.mapDetail(response.data);
  }

  async confirmDelivery(
    orderId: string,
    body: OrderDeliveryOverrideBody,
    idempotencyKey: string
  ): Promise<OrderDetail> {
    const response = await this.api.client.post<Record<string, unknown>>(
      `/api/v1/dashboard/orders/${orderId}/confirm-delivery`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return this.mapDetail(response.data);
  }

  toParams(query: OrderListQuery): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (query.page) params['page'] = query.page;
    if (query.limit) params['limit'] = query.limit;
    if (query.search) params['search'] = query.search;
    if (query.status) params['status'] = query.status;
    if (query.storeId) params['storeId'] = query.storeId;
    if (query.custodyStatus) params['custodyStatus'] = query.custodyStatus;
    if (query.paymentMethod) params['paymentMethod'] = query.paymentMethod;
    if (query.paymentStatus) params['paymentStatus'] = query.paymentStatus;
    if (query.createdFrom) params['createdFrom'] = query.createdFrom;
    if (query.createdTo) params['createdTo'] = query.createdTo;
    if (query.hasActiveHandoff) params['hasActiveHandoff'] = 'true';
    if (query.hasActiveReturn) params['hasActiveReturn'] = 'true';
    if (query.sortBy) params['sortBy'] = query.sortBy;
    if (query.sortOrder) params['sortOrder'] = query.sortOrder;
    return params;
  }

  private mapSummary(row: OrderSummary | Record<string, unknown>): OrderSummary {
    const r = row as Record<string, unknown>;
    return {
      id: String(r['id']),
      orderNumber: String(r['orderNumber'] ?? r['order_number'] ?? ''),
      cityId: String(r['cityId'] ?? r['city_id'] ?? ''),
      zoneId: String(r['zoneId'] ?? r['zone_id'] ?? ''),
      storeId: String(r['storeId'] ?? r['store_id'] ?? ''),
      customerAccountId: String(r['customerAccountId'] ?? r['customer_account_id'] ?? ''),
      status: String(r['status']) as OrderStatus,
      custodyStatus: String(r['custodyStatus'] ?? r['custody_status'] ?? 'WITH_STORE') as CustodyStatus,
      custodyDriverId: this.nullableId(r['custodyDriverId'] ?? r['custody_driver_id']),
      paymentMethod: String(r['paymentMethod'] ?? r['payment_method'] ?? 'CASH') as PaymentMethod,
      paymentStatus: String(r['paymentStatus'] ?? r['payment_status'] ?? 'UNPAID') as PaymentStatus,
      productsSubtotal: Number(r['productsSubtotal'] ?? r['products_subtotal'] ?? 0),
      deliveryFee: Number(r['deliveryFee'] ?? r['delivery_fee'] ?? 0),
      total: Number(r['total'] ?? 0),
      currency: 'IQD',
      ...(r['storeCommissionRateSnapshot'] != null || r['store_commission_rate_snapshot'] != null
        ? {
            storeCommissionRateSnapshot: Number(
              r['storeCommissionRateSnapshot'] ?? r['store_commission_rate_snapshot']
            ),
          }
        : {}),
      version: Number(r['version'] ?? 1),
      statusChangedAt: String(r['statusChangedAt'] ?? r['status_changed_at'] ?? ''),
      deliveredAt: this.nullableStr(r['deliveredAt'] ?? r['delivered_at']),
      cancelledAt: this.nullableStr(r['cancelledAt'] ?? r['cancelled_at']),
      createdAt: String(r['createdAt'] ?? r['created_at'] ?? ''),
      updatedAt: String(r['updatedAt'] ?? r['updated_at'] ?? ''),
    };
  }

  private mapDetail(raw: Record<string, unknown>): OrderDetail {
    const summary = this.mapSummary(raw);
    const address = (raw['addressSnapshot'] ?? raw['address_snapshot']) as Record<string, unknown> | null;
    const pricing = (raw['deliveryPricingSnapshot'] ??
      raw['delivery_pricing_snapshot']) as Record<string, unknown> | null;
    const cancellation = raw['cancellation'] as Record<string, unknown> | null;
    const collection = raw['collection'] as Record<string, unknown> | null;
    return {
      ...summary,
      items: this.asArray(raw['items']).map((item) => this.mapItem(item)),
      statusHistory: this.asArray(raw['statusHistory'] ?? raw['status_history']).map((row) =>
        this.mapStatusHistory(row)
      ),
      addressSnapshot: address ? this.mapAddress(address) : null,
      deliveryPricingSnapshot: pricing ? this.mapPricing(pricing) : null,
      cancellation: cancellation ? this.mapCancellation(cancellation) : null,
      events: this.asArray(raw['events']).map((row) => this.mapEvent(row)),
      custodyHistory: this.asArray(raw['custodyHistory'] ?? raw['custody_history']).map((row) =>
        this.mapCustody(row)
      ),
      proofs: this.asArray(raw['proofs']).map((row) => this.mapProof(row)),
      assignments: this.asArray(raw['assignments']).map((row) => this.mapAssignment(row)),
      storeReadyMarkedAt: this.nullableStr(raw['storeReadyMarkedAt'] ?? raw['store_ready_marked_at']),
      arrivedAtStoreAt: this.nullableStr(raw['arrivedAtStoreAt'] ?? raw['arrived_at_store_at']),
      collection: collection ? this.mapCollection(collection) : null,
      expectedCollectionAmount:
        raw['expectedCollectionAmount'] == null
          ? summary.total
          : Number(raw['expectedCollectionAmount']),
    };
  }

  private mapItem(row: Record<string, unknown>): OrderItemSnapshot {
    return {
      id: String(row['id']),
      productId: String(row['productId'] ?? row['product_id'] ?? ''),
      selectedSizeId: this.nullableId(row['selectedSizeId'] ?? row['selected_size_id']),
      productName: String(row['productName'] ?? row['product_name'] ?? ''),
      selectedSizeName: this.nullableStr(row['selectedSizeName'] ?? row['selected_size_name']),
      unitPrice: Number(row['unitPrice'] ?? row['unit_price'] ?? 0),
      modifiersPrice: Number(row['modifiersPrice'] ?? row['modifiers_price'] ?? 0),
      quantity: Number(row['quantity'] ?? 0),
      lineTotal: Number(row['lineTotal'] ?? row['line_total'] ?? 0),
      state: (String(row['state'] ?? 'ACTIVE') as OrderItemSnapshot['state']),
      replacesOrderItemId: this.nullableId(row['replacesOrderItemId'] ?? row['replaces_order_item_id']),
      modifierSelections: this.asArray(
        row['modifierSelections'] ?? row['modifier_selections']
      ).map((sel) => this.mapModifier(sel)),
      createdAt: String(row['createdAt'] ?? row['created_at'] ?? ''),
    };
  }

  private mapModifier(row: Record<string, unknown>): OrderModifierSnapshot {
    return {
      modifierOptionId: String(row['modifierOptionId'] ?? row['modifier_option_id'] ?? ''),
      name: String(row['name'] ?? ''),
      quantity: Number(row['quantity'] ?? 1),
      unitPrice: Number(row['unitPrice'] ?? row['unit_price'] ?? 0),
    };
  }

  private mapAddress(row: Record<string, unknown>): OrderAddressSnapshot {
    return {
      label: this.nullableStr(row['label']),
      addressDetails: this.nullableStr(row['addressDetails'] ?? row['address_details']),
      landmark: this.nullableStr(row['landmark']),
      recipientName: this.nullableStr(row['recipientName'] ?? row['recipient_name']),
      recipientPhone: this.nullableStr(row['recipientPhone'] ?? row['recipient_phone']),
      latitude: row['latitude'] == null ? null : Number(row['latitude']),
      longitude: row['longitude'] == null ? null : Number(row['longitude']),
      sourceAddressId: this.nullableId(row['sourceAddressId'] ?? row['source_address_id']),
    };
  }

  private mapPricing(row: Record<string, unknown>): OrderDeliveryPricingSnapshot {
    const origin = (row['origin'] as Record<string, unknown> | undefined) ?? null;
    const destination = (row['destination'] as Record<string, unknown> | undefined) ?? null;
    return {
      pricingVersionId: this.nullableId(row['pricingVersionId'] ?? row['pricing_version_id']),
      pricingVersionNumber:
        row['pricingVersionNumber'] == null && row['pricing_version_number'] == null
          ? null
          : Number(row['pricingVersionNumber'] ?? row['pricing_version_number']),
      routingProvider: this.nullableStr(row['routingProvider'] ?? row['routing_provider']),
      distanceSource: this.nullableStr(row['distanceSource'] ?? row['distance_source']),
      fallbackReason: this.nullableStr(row['fallbackReason'] ?? row['fallback_reason']),
      distanceMeters:
        row['distanceMeters'] == null && row['distance_meters'] == null
          ? null
          : Number(row['distanceMeters'] ?? row['distance_meters']),
      durationSeconds:
        row['durationSeconds'] == null && row['duration_seconds'] == null
          ? null
          : Number(row['durationSeconds'] ?? row['duration_seconds']),
      deliveryFee: Number(row['deliveryFee'] ?? row['delivery_fee'] ?? 0),
      zoneId: this.nullableId(row['zoneId'] ?? row['zone_id']),
      origin: this.mapPoint(origin, row['origin_latitude'], row['origin_longitude']),
      destination: this.mapPoint(
        destination,
        row['destination_latitude'],
        row['destination_longitude']
      ),
      calculatedAt: this.nullableStr(row['calculatedAt'] ?? row['calculated_at']),
    };
  }

  private mapPoint(
    nested: Record<string, unknown> | null,
    lat: unknown,
    lng: unknown
  ): { latitude: number; longitude: number } | null {
    const latitude = nested?.['latitude'] ?? lat;
    const longitude = nested?.['longitude'] ?? lng;
    if (latitude == null || longitude == null) return null;
    const la = Number(latitude);
    const lo = Number(longitude);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
    return { latitude: la, longitude: lo };
  }

  private mapStatusHistory(row: Record<string, unknown>): OrderStatusHistoryEntry {
    return {
      id: String(row['id'] ?? ''),
      fromStatus: this.nullableStr(row['fromStatus'] ?? row['from_status']),
      toStatus: this.nullableStr(row['toStatus'] ?? row['to_status']),
      enteredAt: this.nullableStr(row['enteredAt'] ?? row['entered_at']),
      exitedAt: this.nullableStr(row['exitedAt'] ?? row['exited_at']),
      durationSeconds:
        row['durationSeconds'] == null && row['duration_seconds'] == null
          ? null
          : Number(row['durationSeconds'] ?? row['duration_seconds']),
      changedByAccountId: this.nullableId(row['changedByAccountId'] ?? row['changed_by_account_id']),
      actorType: this.nullableStr(row['actorType'] ?? row['actor_type']),
      source: this.nullableStr(row['source']),
      reason: this.nullableStr(row['reason']),
      createdAt: this.nullableStr(row['createdAt'] ?? row['created_at']),
    };
  }

  private mapEvent(row: Record<string, unknown>): OrderEvent {
    return {
      id: String(row['id'] ?? ''),
      assignmentId: this.nullableId(row['assignmentId'] ?? row['assignment_id']),
      eventType: String(row['eventType'] ?? row['event_type'] ?? ''),
      fromOrderStatus: this.nullableStr(row['fromOrderStatus'] ?? row['from_order_status']),
      toOrderStatus: this.nullableStr(row['toOrderStatus'] ?? row['to_order_status']),
      fromCustodyStatus: this.nullableStr(row['fromCustodyStatus'] ?? row['from_custody_status']),
      toCustodyStatus: this.nullableStr(row['toCustodyStatus'] ?? row['to_custody_status']),
      actorType: this.nullableStr(row['actorType'] ?? row['actor_type']),
      actorAccountId: this.nullableId(row['actorAccountId'] ?? row['actor_account_id']),
      source: this.nullableStr(row['source']),
      actedOnBehalfOf: this.nullableStr(row['actedOnBehalfOf'] ?? row['acted_on_behalf_of']),
      reason: this.nullableStr(row['reason']),
      proofId: this.nullableId(row['proofId'] ?? row['proof_id']),
      createdAt: this.nullableStr(row['createdAt'] ?? row['created_at']),
    };
  }

  private mapCustody(row: Record<string, unknown>): OrderCustodyHistoryEntry {
    return {
      id: String(row['id'] ?? ''),
      assignmentId: this.nullableId(row['assignmentId'] ?? row['assignment_id']),
      fromStatus: this.nullableStr(row['fromStatus'] ?? row['from_status']),
      toStatus: this.nullableStr(row['toStatus'] ?? row['to_status']),
      fromDriverId: this.nullableId(row['fromDriverId'] ?? row['from_driver_id']),
      toDriverId: this.nullableId(row['toDriverId'] ?? row['to_driver_id']),
      actorAccountId: this.nullableId(row['actorAccountId'] ?? row['actor_account_id']),
      actorType: this.nullableStr(row['actorType'] ?? row['actor_type']),
      source: this.nullableStr(row['source']),
      reason: this.nullableStr(row['reason']),
      createdAt: this.nullableStr(row['createdAt'] ?? row['created_at']),
    };
  }

  private mapAssignment(row: Record<string, unknown>): OrderAssignment {
    return {
      id: String(row['id'] ?? ''),
      driverId: this.nullableId(row['driverId'] ?? row['driver_id']),
      offerRoundId: this.nullableId(row['offerRoundId'] ?? row['offer_round_id']),
      assignmentSource: this.nullableStr(row['assignmentSource'] ?? row['assignment_source']),
      status: this.nullableStr(row['status']),
      assignmentSequence:
        row['assignmentSequence'] == null && row['assignment_sequence'] == null
          ? null
          : Number(row['assignmentSequence'] ?? row['assignment_sequence']),
      assignedByAccountId: this.nullableId(
        row['assignedByAccountId'] ?? row['assigned_by_account_id']
      ),
      assignmentReason: this.nullableStr(row['assignmentReason'] ?? row['assignment_reason']),
      driverFee:
        row['driverFee'] == null && row['driver_fee'] == null
          ? null
          : Number(row['driverFee'] ?? row['driver_fee']),
      assignedAt: this.nullableStr(row['assignedAt'] ?? row['assigned_at']),
      arrivedAtStoreAt: this.nullableStr(row['arrivedAtStoreAt'] ?? row['arrived_at_store_at']),
      pickedUpAt: this.nullableStr(row['pickedUpAt'] ?? row['picked_up_at']),
      arrivedAtCustomerAt: this.nullableStr(
        row['arrivedAtCustomerAt'] ?? row['arrived_at_customer_at']
      ),
      completedAt: this.nullableStr(row['completedAt'] ?? row['completed_at']),
      cancelledAt: this.nullableStr(row['cancelledAt'] ?? row['cancelled_at']),
    };
  }

  private mapProof(row: Record<string, unknown>): OrderProof {
    return {
      id: String(row['id'] ?? ''),
      assignmentId: this.nullableId(row['assignmentId'] ?? row['assignment_id']),
      mediaAssetId: this.nullableId(row['mediaAssetId'] ?? row['media_asset_id']),
      purpose: this.nullableStr(row['purpose']),
      uploadedByDriverId: this.nullableId(row['uploadedByDriverId'] ?? row['uploaded_by_driver_id']),
      consumedAt: this.nullableStr(row['consumedAt'] ?? row['consumed_at']),
      consumedByEventId: this.nullableId(row['consumedByEventId'] ?? row['consumed_by_event_id']),
      createdAt: this.nullableStr(row['createdAt'] ?? row['created_at']),
    };
  }

  private mapCancellation(row: Record<string, unknown>): OrderCancellation {
    return {
      id: String(row['id'] ?? ''),
      previousStatus: this.nullableStr(row['previousStatus'] ?? row['previous_status']),
      actorAccountId: this.nullableId(row['actorAccountId'] ?? row['actor_account_id']),
      actorType: this.nullableStr(row['actorType'] ?? row['actor_type']),
      source: this.nullableStr(row['source']),
      reason: this.nullableStr(row['reason']),
      createdAt: this.nullableStr(row['createdAt'] ?? row['created_at']),
    };
  }

  private mapCollection(row: Record<string, unknown>): OrderCollection {
    return {
      expectedAmount: Number(row['expectedAmount'] ?? row['expected_amount'] ?? 0),
      collectedAmount: Number(row['collectedAmount'] ?? row['collected_amount'] ?? 0),
      differenceAmount: Number(row['differenceAmount'] ?? row['difference_amount'] ?? 0),
      currency: 'IQD',
      assignmentId: String(row['assignmentId'] ?? row['assignment_id'] ?? ''),
      collectingDriverId: String(row['collectingDriverId'] ?? row['collecting_driver_id'] ?? ''),
      confirmationSource: String(row['confirmationSource'] ?? row['confirmation_source'] ?? ''),
      collectedAt: String(row['collectedAt'] ?? row['collected_at'] ?? ''),
    };
  }

  private asArray(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  }

  private nullableStr(value: unknown): string | null {
    if (value == null || value === '') return null;
    return String(value);
  }

  private nullableId(value: unknown): string | null {
    if (value == null || value === '') return null;
    return String(value);
  }
}
