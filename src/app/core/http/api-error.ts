import axios from 'axios';
import { ApiErrorBody } from '../auth/auth.models';

export interface ApiValidationFieldError {
  field: string;
  code: string;
  message: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

/** Resolve API error envelope from Axios or plain thrown shapes. */
function getApiErrorBody(err: unknown): ApiErrorBody | undefined {
  if (axios.isAxiosError(err)) {
    return asRecord(err.response?.data) as ApiErrorBody | undefined;
  }

  const root = asRecord(err);
  if (!root) return undefined;

  if (root['error']) {
    return root as ApiErrorBody;
  }

  const response = asRecord(root['response']);
  if (response?.['data']) {
    return asRecord(response['data']) as ApiErrorBody | undefined;
  }

  return undefined;
}

export function getApiErrorStatus(err: unknown): number | undefined {
  if (axios.isAxiosError(err)) {
    return err.response?.status;
  }
  const root = asRecord(err);
  const response = asRecord(root?.['response']);
  const status = response?.['status'];
  return typeof status === 'number' ? status : undefined;
}

export function getApiErrorCode(err: unknown): string | undefined {
  return getApiErrorBody(err)?.error?.code;
}

export function getApiErrorDetails(err: unknown): Record<string, unknown> | undefined {
  return getApiErrorBody(err)?.error?.details;
}

export function getApiValidationFieldErrors(err: unknown): ApiValidationFieldError[] {
  const details = getApiErrorDetails(err);
  const fields = details?.['fields'];
  if (!Array.isArray(fields)) return [];

  const result: ApiValidationFieldError[] = [];
  for (const item of fields) {
    const row = asRecord(item);
    if (!row) continue;
    const field = typeof row['field'] === 'string' ? row['field'] : '';
    const code = typeof row['code'] === 'string' ? row['code'] : '';
    const message = typeof row['message'] === 'string' ? row['message'].trim() : '';
    if (!message) continue;
    result.push({ field, code, message });
  }
  return result;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const fieldErrors = getApiValidationFieldErrors(err);
  if (fieldErrors.length) {
    // User-facing text comes from details.fields, not the generic summary.
    return fieldErrors
      .map((row) => (row.field ? `${row.field}: ${row.message}` : row.message))
      .join(' · ');
  }

  const body = getApiErrorBody(err);
  return body?.error?.message?.trim() || fallback;
}

export function isApiErrorCode(err: unknown, code: string): boolean {
  return getApiErrorCode(err) === code;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  return getApiErrorMessage(err, fallback);
}
