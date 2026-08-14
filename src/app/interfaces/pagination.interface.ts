export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T[];
  pagination: PaginationConfig;
}
