import axios from 'axios';
import { ApiErrorBody } from '../auth/auth.models';

export function getApiErrorStatus(err: unknown): number | undefined {
  if (axios.isAxiosError(err)) {
    return err.response?.status;
  }
  return undefined;
}

export function getApiErrorCode(err: unknown): string | undefined {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorBody | undefined;
    return data?.error?.code;
  }
  return undefined;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorBody | undefined;
    return data?.error?.message || fallback;
  }
  return fallback;
}

export function isApiErrorCode(err: unknown, code: string): boolean {
  return getApiErrorCode(err) === code;
}

export function getApiErrorDetails(err: unknown): Record<string, unknown> | undefined {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorBody | undefined;
    return data?.error?.details;
  }
  return undefined;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  return getApiErrorMessage(err, fallback);
}
