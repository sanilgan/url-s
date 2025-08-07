export interface User {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
  is_active: boolean;
}

export interface Url {
  id: number;
  user_id?: number;
  original_url: string;
  short_code: string;
  title?: string;
  domain?: string;
  created_at: Date;
  expires_at?: Date;
  clicks?: number;
  url_count?: number;
  last_clicked_at?: Date;
  is_active: boolean;
}

export interface CreateUrlRequest {
  original_url: string;
  custom_code?: string;
  expires_at?: string;
  title?: string;
  domain?: string;
}

export interface UrlStats {
  url: Url;
  total_clicks: number;
  last_clicked?: Date;
}
