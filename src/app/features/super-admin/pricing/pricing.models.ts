export interface DeliveryPricingVersion {
  id: string;
  cityId: string;
  version: number;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  baseFee: number;
  includedDistanceMeters: number;
  pricePerKm: number;
  roundingStep: number;
  maximumDeliveryDistanceMeters: number | null;
  routingFallbackEnabled: boolean;
  fallbackOnNoRoute: boolean;
  fallbackOnProviderFailure: boolean;
  fallbackExtraDistanceMeters: number;
  createdByAccountId: string;
  createdAt: string;
  activatedAt: string | null;
  deactivatedAt: string | null;
  activationRevision: number | null;
}

export interface DeliveryPricingInput {
  baseFee: number;
  includedDistanceMeters: number;
  pricePerKm: number;
  roundingStep: number;
  maximumDeliveryDistanceMeters: number | null;
  routingFallbackEnabled: boolean;
  fallbackOnNoRoute: boolean;
  fallbackOnProviderFailure: boolean;
  fallbackExtraDistanceMeters: number;
}

export interface DriverPricingStage {
  afterSeconds: number;
  increasePercentage: number;
}

export interface DriverPricing {
  id: string;
  cityId: string;
  version: number;
  pricingBase: number;
  roundingUnit: number;
  pricingStages: DriverPricingStage[];
  updatedByAccountId: string;
  createdAt: string;
  updatedAt: string;
}
