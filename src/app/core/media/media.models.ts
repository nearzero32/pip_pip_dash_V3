export type MediaPurpose =
  | 'CATEGORY_IMAGE'
  | 'STORE_LOGO'
  | 'STORE_IMAGE'
  | 'PRODUCT_IMAGE'
  | 'DRIVER_PHOTO'
  | 'DRIVER_DOCUMENT';

export type MediaStatus = 'PENDING_UPLOAD' | 'READY' | 'DELETE_PENDING' | 'DELETED';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Hard client ceiling matching backend config max. Runtime limit may be lower. */
export const MEDIA_CLIENT_MAX_BYTES = 20 * 1024 * 1024;

export interface MediaAsset {
  readonly id: string;
  readonly status: MediaStatus;
  readonly purpose: string;
  readonly visibility: 'PUBLIC' | 'PRIVATE';
  readonly originalName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly url: string | null;
  readonly uploadExpiresAt: string | null;
  readonly readyAt: string | null;
  readonly attachedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MediaUploadIntent {
  readonly asset: MediaAsset;
  readonly upload: {
    readonly method: 'PUT';
    readonly url: string;
    readonly headers: { readonly 'Content-Type': string };
    readonly expiresAt: string;
  };
}

export type MediaClientErrorCode =
  | 'MEDIA_TYPE'
  | 'MEDIA_TOO_LARGE'
  | 'MEDIA_PUT_FAILED'
  | 'MEDIA_CORS'
  | 'MEDIA_CONFIRM_FAILED'
  | 'MEDIA_NOT_READY';

export class MediaClientError extends Error {
  constructor(
    readonly code: MediaClientErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'MediaClientError';
  }
}

export function isAllowedImageType(value: string): value is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(value);
}
