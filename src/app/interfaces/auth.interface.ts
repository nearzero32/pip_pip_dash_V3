export interface SessionResponse {
  access_token: string;
  access_token_expires_at: string;
  refresh_token: string;
  session_id: string;
  application_type: 'CUSTOMER_APP' | 'DRIVER_APP' | 'DASHBOARD' | 'MERCHANT_APP';
}

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
  request_id?: string;
}
