export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  created_at: Date;
  is_active: boolean;
}

export interface Url {
  id: number;
  user_id?: number; // Opsiyonel - mevcut URL'ler için
  original_url: string;
  short_code: string;
  created_at: Date;
  expires_at?: Date;
  click_count: number;
  is_active: boolean;
}

export interface UrlClick {
  id: number;
  url_id: number;
  ip_address: string;
  user_agent?: string;
  referer?: string;
  clicked_at: Date;
  country?: string;
  city?: string;
}

export interface CreateUrlRequest {
  original_url: string;
  custom_code?: string;
  expires_at?: string;
}

export interface UrlStats {
  url: Url;
  clicks: UrlClick[];
  totalClicks: number;
  uniqueIps: number;
  topCountries: Array<{ country: string; count: number }>;
  clicksByDate: Array<{ date: string; count: number }>;
}
