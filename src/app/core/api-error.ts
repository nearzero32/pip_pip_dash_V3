import { ApiErrorBody } from '../interfaces/auth.interface';

export function apiErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as { response?: { data?: ApiErrorBody } };
  return axiosErr.response?.data?.error?.message || fallback;
}
