import { Injectable, inject } from '@angular/core';
import { ApiService } from '../http/api.service';
import {
  ALLOWED_IMAGE_TYPES,
  MEDIA_CLIENT_MAX_BYTES,
  MediaAsset,
  MediaClientError,
  MediaPurpose,
  MediaUploadIntent,
  isAllowedImageType,
} from './media.models';

@Injectable({ providedIn: 'root' })
export class MediaApiService {
  private api = inject(ApiService);

  async createUploadIntent(input: {
    purpose: MediaPurpose;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    cityId?: string;
  }): Promise<MediaUploadIntent> {
    const response = await this.api.client.post<MediaUploadIntent>(
      '/api/v1/dashboard/media/upload-intents',
      input
    );
    return response.data;
  }

  async confirm(assetId: string, cityId?: string): Promise<MediaAsset> {
    const response = await this.api.client.post<MediaAsset>(
      `/api/v1/dashboard/media/${assetId}/confirm`, undefined,
      { params: cityId ? { cityId } : {} }
    );
    return response.data;
  }

  async get(assetId: string): Promise<MediaAsset> {
    const response = await this.api.client.get<MediaAsset>(
      `/api/v1/dashboard/media/${assetId}`
    );
    return response.data;
  }

  async deleteUnattached(assetId: string, cityId?: string): Promise<void> {
    await this.api.client.delete(`/api/v1/dashboard/media/${assetId}`, { params: cityId ? { cityId } : {} });
  }

  /**
   * Upload via dashboard intent + raw presigned PUT (no Authorization) + confirm.
   */
  async uploadImage(
    file: File,
    purpose: Extract<MediaPurpose, 'STORE_LOGO' | 'STORE_IMAGE' | 'CATEGORY_IMAGE' | 'PRODUCT_IMAGE'>,
    cityId?: string,
  ): Promise<MediaAsset> {
    if (!isAllowedImageType(file.type)) {
      throw new MediaClientError(
        'MEDIA_TYPE',
        `Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      );
    }
    if (file.size > MEDIA_CLIENT_MAX_BYTES) {
      throw new MediaClientError('MEDIA_TOO_LARGE', 'File exceeds 20 MiB client ceiling');
    }
    const intent = await this.createUploadIntent({
      purpose,
      fileName: file.name || 'image',
      contentType: file.type,
      sizeBytes: file.size,
      ...(cityId ? { cityId } : {}),
    });
    try {
      const putResponse = await fetch(intent.upload.url, {
        method: intent.upload.method,
        headers: {
          'Content-Type': intent.upload.headers['Content-Type'],
        },
        body: file,
      });
      if (!putResponse.ok) {
        await this.bestEffortDelete(intent.asset.id, cityId);
        throw new MediaClientError('MEDIA_PUT_FAILED', `Storage PUT failed (${putResponse.status})`);
      }
    } catch (err) {
      if (err instanceof MediaClientError) throw err;
      await this.bestEffortDelete(intent.asset.id, cityId);
      throw new MediaClientError('MEDIA_CORS', 'Presigned storage PUT failed (network or CORS)');
    }
    try {
      const asset = await this.confirm(intent.asset.id, cityId);
      if (asset.status !== 'READY') {
        await this.bestEffortDelete(asset.id, cityId);
        throw new MediaClientError('MEDIA_NOT_READY', 'Confirmed asset is not READY');
      }
      return asset;
    } catch (err) {
      if (err instanceof MediaClientError) throw err;
      await this.bestEffortDelete(intent.asset.id, cityId);
      throw new MediaClientError('MEDIA_CONFIRM_FAILED', 'Media confirm failed');
    }
  }

  async bestEffortDelete(assetId: string, cityId?: string): Promise<void> {
    try {
      await this.deleteUnattached(assetId, cityId);
    } catch {
      /* cleanup must not hide the original error */
    }
  }
}
